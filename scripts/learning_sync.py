#!/usr/bin/env python3
"""Publish approved teaching artifacts separately from application deployment."""
import argparse
import base64
import gzip
import json
import subprocess
import tempfile
from datetime import datetime,timezone
from pathlib import Path
from learning_catalog import build, encode


def prepare(environment, tag=""):
    rendered=subprocess.check_output(['python3','scripts/helm_environment.py','render','--env',environment]+(['--tag',tag] if tag else []),text=True)
    workspace=build(environment,rendered=rendered)
    active_preview={'revision':workspace['revision'],'appliedAt':datetime.now(timezone.utc).isoformat(),'services':[{k:s[k] for k in ['id','operations']} for s in workspace['services']]}
    if len(encode(workspace))+len(encode(active_preview))>900_000:
        raise ValueError('Combined teaching bundle exceeds ConfigMap budget')
    return workspace


def sync(environment, activate=False, workspace=None):
    workspace = workspace if workspace is not None else prepare(environment)
    if activate:
        active={'revision':workspace['revision'],'appliedAt':datetime.now(timezone.utc).isoformat(),'services':[{k:s[k] for k in ['id','operations']} for s in workspace['services']]}
    else:
        result=subprocess.run(['kubectl','--context=mesh-study','-n',environment,'get','configmap','learning-catalog','-o','json'],capture_output=True,text=True,check=True)
        active=json.loads(gzip.decompress(base64.b64decode(json.loads(result.stdout)['binaryData']['active.gz'])))
    values={'workspace':encode(workspace),'active':encode(active)}
    if len(values['workspace'])+len(values['active'])>900_000: raise ValueError('Combined teaching bundle exceeds ConfigMap budget')
    with tempfile.TemporaryDirectory() as temp:
        path=Path(temp)/'values.json';path.write_text(json.dumps(values))
        subprocess.run(['helm','--kube-context=mesh-study','upgrade','--install','study-learning','apps/web/deploy/learning-helm','-n',environment,'-f',str(path),'--wait','--timeout','60s'],check=True)
    print(f'Learning source synchronized: {environment} / {workspace["revision"]}. '+('Operations activated after deployment.' if activate else 'Active operations unchanged; edited source is not rebuilt.'))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--env',choices=['stg','prd'],default='stg');args=parser.parse_args();sync(args.env)
