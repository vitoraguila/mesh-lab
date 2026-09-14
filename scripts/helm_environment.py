#!/usr/bin/env python3
"""Single, explicit values layering order used by render, lint and deploy."""
import argparse
import subprocess
from pathlib import Path
from learning_catalog import dependencies

parser = argparse.ArgumentParser()
parser.add_argument('action', choices=['render', 'lint', 'deploy'])
parser.add_argument('--env', choices=['stg', 'prd'], default='stg')
parser.add_argument('--tag', default='')
args = parser.parse_args()
apps = dependencies()
values = ['-f', f'deploy/environments/{args.env}/values.yaml']
for app in apps:
    for name in ['values', 'config', 'policy']:
        path = Path(f'apps/{app}/deploy/environments/{args.env}/{name}.yaml')
        if path.exists():
            values += ['-f', str(path)]
if args.action == 'deploy':
    for app in apps:
        for suffix in ['json', 'yaml']:
            path = Path(f'.local/{args.env}/{app}-secrets.{suffix}')
            if path.exists():
                values += ['-f', str(path)]
else:
    # Never put real secrets into render/lint output.
    values += ['--set-string', 'authz.credentials.adminToken=REDACTED-admin',
               '--set-string', 'authz.credentials.readerToken=REDACTED-reader',
               '--set-string', 'rabbitmq.credentials.username=REDACTED-broker',
               '--set-string', 'rabbitmq.credentials.password=REDACTED-broker',
               '--set-string', 'grafana.credentials.username=REDACTED-viewer',
               '--set-string', 'grafana.credentials.password=REDACTED-viewer']
if args.tag:
    # Only apps built from this repository follow a command-line tag.
    for app in apps:
        if Path(f'apps/{app}/Dockerfile').exists():
            values += ['--set-string', f'{app}.image.tag={args.tag}']
if args.action == 'render':
    command = ['helm', 'template', 'study', 'deploy/helm/platform', '-n', args.env]
elif args.action == 'lint':
    command = ['helm', 'lint', 'deploy/helm/platform', '-n', args.env]
else:
    command = ['helm', '--kube-context=mesh-study', 'upgrade', '--install', 'study',
               'deploy/helm/platform', '-n', args.env, '--wait', '--timeout', '5m']
subprocess.run(command + values, check=True)
