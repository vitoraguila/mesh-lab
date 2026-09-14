#!/usr/bin/env python3
"""Opt-in foreground Helm watcher for the local mesh-study profile only."""
import argparse
import hashlib
import subprocess
import time
from pathlib import Path


def snapshot(environment, learn=False):
    roots = [Path('deploy/helm/platform')]
    roots += list(Path('apps').glob('*/deploy/helm'))
    roots += list(Path('apps').glob(f'*/deploy/environments/{environment}'))
    roots += [Path(f'.local/{environment}')]
    if learn:
        from learning_catalog import approved
        roots = [Path('apps'), Path('deploy')]
        return {str(p):hashlib.sha256(p.read_bytes()).digest() for root in roots for p in root.rglob('*') if p.is_file() and approved(p,Path.cwd()) and ('environments' not in p.parts or environment in p.parts)}
    files = [Path('scripts/helm_environment.py'), Path(f'deploy/environments/{environment}/values.yaml')]
    for root in roots:
        files += [p for p in root.rglob('*') if p.is_file() and p.suffix in ('.yaml', '.json', '.tpl') and 'charts' not in p.parts]
    return {str(p): hashlib.sha256(p.read_bytes()).digest() for p in files if p.exists()}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--env', choices=['stg', 'prd'], default='stg')
    parser.add_argument('--learn', action='store_true')
    args = parser.parse_args()
    print(f'Watching app/platform Helm inputs for local mesh-study/{args.env}. Ctrl+C stops. Shared mesh/gateway changes require make mesh/gateway.', flush=True)
    previous = snapshot(args.env,args.learn)
    try:
        while True:
            time.sleep(1)
            current = snapshot(args.env,args.learn)
            if current == previous:
                continue
            time.sleep(1)
            stable = snapshot(args.env,args.learn)
            if stable != current:
                continue
            previous = stable
            print('Source changed; synchronizing teaching files…' if args.learn else 'Deployment inputs changed; applying selected local environment…', flush=True)
            result = subprocess.run(['make', 'learn-sync' if args.learn else 'deploy', f'ENV={args.env}'])
            print('Applied.' if result.returncode == 0 else 'Apply failed; fix the configuration and save to retry.', flush=True)
    except KeyboardInterrupt:
        print('\nWatcher stopped.', flush=True)

if __name__ == '__main__':
    main()
