"""Python business API. No authorization logic: the mesh decided before this ran."""
import json
import os
import signal
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

import telemetry

SERVICE = telemetry.SERVICE
ENVIRONMENT = telemetry.ENVIRONMENT
PORT = int(os.getenv('HTTP_PORT', '8080'))

REVIEWS = [
    {'id': 'r-401', 'product': 'p-101', 'rating': 5, 'title': 'Types like a dream'},
    {'id': 'r-402', 'product': 'p-102', 'rating': 4, 'title': 'One cable, every port'},
]


class Handler(BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'
    server_version = 'mesh-study'
    sys_version = ''

    def log_message(self, *args):
        pass

    def _send(self, status, body=b'', content_type='application/json'):
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        if body:
            self.wfile.write(body)

    def do_GET(self):
        path = self.path.split('?', 1)[0]
        if path == '/healthz':
            self._send(200)
            return
        if path == '/metrics':
            self._send(200, telemetry.exposition().encode(), 'text/plain; version=0.0.4; charset=utf-8')
            return
        request_id = self.headers.get('x-mesh-request-id', '')
        started = time.perf_counter()
        telemetry.emit(request_id, 'received', path, 0)
        if path == f'/{SERVICE}':
            status = 200
            payload = {'service': SERVICE, 'version': os.getenv('SERVICE_VERSION', 'v1'),
                       'environment': ENVIRONMENT, 'data': REVIEWS, 'pod': os.getenv('HOSTNAME', '')}
        else:
            status = 404
            payload = {'error': 'Not found'}
        self._send(status, json.dumps(payload).encode())
        telemetry.observe(path, str(status), time.perf_counter() - started)
        telemetry.emit(request_id, 'completed', path, status)


def main():
    server = ThreadingHTTPServer(('', PORT), Handler)
    server.daemon_threads = True
    for received in (signal.SIGTERM, signal.SIGINT):
        signal.signal(received, lambda *_: server.shutdown())
    print(f'listening on :{PORT} environment={ENVIRONMENT} runtime=python', flush=True)
    server.serve_forever()
    server.server_close()


if __name__ == '__main__':
    main()
