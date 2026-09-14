#!/usr/bin/env python3
"""Serialize this project's deploy and learning-sync commands per environment."""
import fcntl
import subprocess
import sys
from pathlib import Path
if sys.argv[1] not in ['stg','prd']: raise SystemExit('Invalid local environment')
folder=Path('.local/locks');folder.mkdir(parents=True,exist_ok=True)
with (folder/(sys.argv[1]+'.lock')).open('w') as handle:
    fcntl.flock(handle,fcntl.LOCK_EX)
    raise SystemExit(subprocess.run(sys.argv[2:]).returncode)
