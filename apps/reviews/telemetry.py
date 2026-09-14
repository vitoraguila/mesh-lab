"""Same event shape, routing key and metric names as the Go and Node services.

Publishing is best effort on a bounded queue: a broker outage never delays or
fails a business request.
"""
import json
import os
import queue
import re
import threading
import time
import uuid
from datetime import datetime, timezone

import pika

SERVICE = os.getenv('SERVICE_NAME', 'reviews')
ENVIRONMENT = os.getenv('APP_ENV', 'local')
SOURCE_REVISION = os.getenv('SOURCE_REVISION', 'unknown')
EXCHANGE = os.getenv('AMQP_EXCHANGE', '')
BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5]
UNSAFE = re.compile(r'[^a-zA-Z0-9._-]+')

_lock = threading.Lock()
_requests = {}
_published = {}
_outbox = queue.Queue(maxsize=256)


def observe(path, code, seconds):
    with _lock:
        if len(_requests) > 64:
            return
        entry = _requests.setdefault((path, code), {'count': 0, 'sum': 0.0, 'buckets': [0] * len(BUCKETS)})
        entry['count'] += 1
        entry['sum'] += seconds
        for index, edge in enumerate(BUCKETS):
            if seconds <= edge:
                entry['buckets'][index] += 1


def _quote(value):
    return '"' + str(value).replace('\\', '\\\\').replace('"', '\\"').replace('\n', '\\n') + '"'


def exposition():
    base = f'service={_quote(SERVICE)},environment={_quote(ENVIRONMENT)}'
    lines = [
        '# HELP mesh_build_info Source revision the running workload was built from.',
        '# TYPE mesh_build_info gauge',
        f'mesh_build_info{{{base},revision={_quote(SOURCE_REVISION)}}} 1',
        '# HELP mesh_requests_total Requests handled by this application, after the mesh allowed them.',
        '# TYPE mesh_requests_total counter',
    ]
    with _lock:
        ordered = sorted(_requests.items())
        for (path, code), entry in ordered:
            lines.append(f'mesh_requests_total{{{base},path={_quote(path)},code={_quote(code)}}} {entry["count"]}')
        lines += ['# HELP mesh_request_duration_seconds Handler latency, excluding the mesh hops in front of it.',
                  '# TYPE mesh_request_duration_seconds histogram']
        for (path, code), entry in ordered:
            labels = f'{base},path={_quote(path)},code={_quote(code)}'
            for index, edge in enumerate(BUCKETS):
                lines.append(f'mesh_request_duration_seconds_bucket{{{labels},le="{edge}"}} {entry["buckets"][index]}')
            lines.append(f'mesh_request_duration_seconds_bucket{{{labels},le="+Inf"}} {entry["count"]}')
            lines.append(f'mesh_request_duration_seconds_sum{{{labels}}} {entry["sum"]}')
            lines.append(f'mesh_request_duration_seconds_count{{{labels}}} {entry["count"]}')
        lines += ['# HELP mesh_events_published_total Telemetry events this application queued for the broker.',
                  '# TYPE mesh_events_published_total counter']
        for stage, count in sorted(_published.items()):
            lines.append(f'mesh_events_published_total{{{base},stage={_quote(stage)}}} {count}')
    return '\n'.join(lines) + '\n'


def _routing_key(*parts):
    return '.'.join(UNSAFE.sub('-', str(part)) or 'unknown' for part in parts)


def _publisher():
    url = os.getenv('AMQP_URL')
    if not url or not EXCHANGE:
        return
    while True:
        try:
            connection = pika.BlockingConnection(pika.URLParameters(url + '?heartbeat=10&connection_attempts=1'))
            channel = connection.channel()
            channel.exchange_declare(exchange=EXCHANGE, exchange_type='topic', durable=True)
            while True:
                try:
                    event = _outbox.get(timeout=2)
                except queue.Empty:
                    # A blocking connection only sends heartbeats while it is being
                    # driven. Without this the broker drops an idle connection and
                    # the next event after a quiet period is lost.
                    connection.process_data_events(0)
                    continue
                key = _routing_key(event['environment'], event['service'], event['stage'])
                event |= {'transport': 'amqp', 'exchange': EXCHANGE, 'routingKey': key,
                          'publishedAt': datetime.now(timezone.utc).isoformat()}
                channel.basic_publish(exchange=EXCHANGE, routing_key=key, body=json.dumps(event).encode(),
                                      properties=pika.BasicProperties(content_type='application/json',
                                                                      delivery_mode=2, message_id=event['eventId']))
        except Exception:  # noqa: BLE001 - telemetry must never break the request path
            time.sleep(2)


threading.Thread(target=_publisher, daemon=True).start()


def emit(request_id, stage, path, status):
    if not request_id or len(request_id) > 128:
        return
    with _lock:
        if len(_published) <= 16:
            _published[stage] = _published.get(stage, 0) + 1
    event = {'eventId': uuid.uuid4().hex, 'sourceRevision': SOURCE_REVISION, 'statusKind': 'http',
             'requestId': request_id, 'service': SERVICE, 'stage': stage, 'path': path, 'status': status,
             'time': datetime.now(timezone.utc).isoformat(), 'environment': ENVIRONMENT}
    try:
        _outbox.put_nowait(event)
    except queue.Full:
        pass
