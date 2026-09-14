#!/usr/bin/env python3
import argparse
import subprocess
from learning_sync import prepare, sync
parser=argparse.ArgumentParser();parser.add_argument('--env',choices=['stg','prd'],required=True);parser.add_argument('--tag',default='');args=parser.parse_args()
workspace=prepare(args.env,args.tag)
subprocess.run(['python3','scripts/helm_environment.py','deploy','--env',args.env]+(['--tag',args.tag] if args.tag else []),check=True)
sync(args.env,activate=True,workspace=workspace)
