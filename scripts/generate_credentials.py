#!/usr/bin/env python3
"""Generate credentials per environment; never print or overwrite existing values."""
import json
import os
import secrets
import sys
from pathlib import Path

environment = sys.argv[1] if len(sys.argv) > 1 else 'stg'
if environment not in ('stg', 'prd'):
    raise SystemExit('Environment must be stg or prd')
generated = {
    'authz-secrets.json': lambda: {'authz': {'credentials': {
        'adminToken': secrets.token_urlsafe(32),
        'readerToken': secrets.token_urlsafe(32),
    }}},
    # The broker login is embedded in an AMQP URL, so keep it URL safe.
    'rabbitmq-secrets.json': lambda: {'rabbitmq': {'credentials': {
        'username': 'mesh-' + secrets.token_hex(4),
        'password': secrets.token_urlsafe(32),
    }}},
    'grafana-secrets.json': lambda: {'grafana': {'credentials': {
        'username': 'mesh',
        'password': secrets.token_urlsafe(24),
    }}},
}
folder = Path('.local') / environment
folder.mkdir(parents=True, exist_ok=True)
for name, build in generated.items():
    path = folder / name
    if path.exists():
        continue
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, 'w') as f:
        json.dump(build(), f, indent=2)
