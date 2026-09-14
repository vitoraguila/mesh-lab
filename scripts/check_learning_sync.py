#!/usr/bin/env python3
"""Verify source-only synchronization against local staging; always restore edits."""
import argparse
import json
import subprocess
import time
import urllib.request
from pathlib import Path
import yaml

parser = argparse.ArgumentParser()
parser.add_argument('--port', type=int, required=True)
args = parser.parse_args()
base = f'http://127.0.0.1:{args.port}'

def get(path):
    with urllib.request.urlopen(base+path, timeout=10) as response:
        return json.load(response)

def pods(environment):
    data = json.loads(subprocess.check_output(['kubectl', '--context=mesh-study', '-n', environment, 'get', 'pods', '-o', 'json']))
    return sorted((p['metadata']['uid'], p['metadata']['name']) for p in data['items'])

def cm_revision(environment):
    return subprocess.check_output(['kubectl', '--context=mesh-study', '-n', environment, 'get', 'configmap', 'learning-catalog', '--ignore-not-found', '-o', 'jsonpath={.metadata.resourceVersion}'], text=True)

def synchronize():
    subprocess.run(['make', 'learn-sync', 'ENV=stg'], check=True)

def wait_revision(previous):
    deadline = time.monotonic()+150
    while time.monotonic()<deadline:
        catalog = get('/api/learn/catalog')
        if catalog['revision'] != previous: return catalog
        time.sleep(2)
    raise AssertionError('Source projection did not propagate')

source = Path('apps/catalog/main.go')
descriptor = Path('apps/catalog/learn.yaml')
original_source, original_descriptor = source.read_text(), descriptor.read_text()
changed_source = '// Learning synchronization acceptance check.\n'+original_source
metadata = yaml.safe_load(original_descriptor)
operation = {**metadata['operations'][0], 'id': 'sync-fixture'}
metadata['operations'].append(operation)
changed_descriptor = yaml.safe_dump(metadata, sort_keys=False, allow_unicode=True)
before = get('/api/learn/catalog')
before_pods = {env: pods(env) for env in ['stg', 'prd']}
other_revision = cm_revision('prd')
try:
    source.write_text(changed_source)
    descriptor.write_text(changed_descriptor)
    synchronize()
    after = wait_revision(before['revision'])
    assert after['activeRevision'] == before['activeRevision']
    assert after['appliedAt'] == before['appliedAt']
    assert 'sync-fixture' not in after['activeOperations']['catalog']
    service = next(s for s in after['services'] if s['id']=='catalog')
    assert any(o['id']=='sync-fixture' for o in service['operations'])
    original_service = next(s for s in before['services'] if s['id']=='catalog')
    assert service['sourceRevision'] != original_service['sourceRevision']
    def handler_line(service):
        return next(s for s in service['steps'] if s['id']=='handler')['sources'][0]['lines'][0]
    assert handler_line(service) == handler_line(original_service)+1
    assert get('/api/learn/source?id=apps%2Fcatalog%2Fmain.go')['content'].startswith('// Learning synchronization acceptance check.')
    for env in ['stg','prd']: assert pods(env)==before_pods[env], f'{env} pods changed'
    assert cm_revision('prd')==other_revision
    print('PASS source sync: moving highlights, distinct build source, inactive new operation, unchanged apply provenance, no pod rolls or prd updates', flush=True)
finally:
    # Preserve concurrent user edits instead of replacing them with the fixture backup.
    if source.read_text()==changed_source: source.write_text(original_source)
    if descriptor.read_text()==changed_descriptor: descriptor.write_text(original_descriptor)
    synchronize()
