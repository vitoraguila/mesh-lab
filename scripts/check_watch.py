#!/usr/bin/env python3
"""Exercise the local watcher in a disposable fixture with a fake make command."""
import os
import subprocess
import tempfile
import time
from pathlib import Path

source = Path('scripts/watch.py').resolve()
with tempfile.TemporaryDirectory() as directory:
    root = Path(directory)
    for env in ['stg','prd']:
        p = root / f'apps/web/deploy/environments/{env}'
        p.mkdir(parents=True)
        (p/'config.yaml').write_text('web: {}\n')
    executable=root/'make'
    executable.write_text('#!/bin/sh\nprintf "%s\\n" "$*" >> calls\n')
    executable.chmod(0o700)
    process=subprocess.Popen(['python3',str(source),'--env','stg'],cwd=root,env={**os.environ,'PATH':f'{root}:'+os.environ['PATH']},stdout=subprocess.PIPE,text=True)
    try:
        assert 'mesh-study/stg' in process.stdout.readline()
        time.sleep(1)
        (root/'apps/web/deploy/environments/prd/config.yaml').write_text('web: {config: {SITE_TITLE: other}}')
        time.sleep(3)
        assert not (root/'calls').exists(), 'Applied other environment edit'
        (root/'apps/web/deploy/environments/stg/config.yaml').write_text('web: {config: {SITE_TITLE: changed}}')
        deadline=time.monotonic()+8
        while not (root/'calls').exists() and time.monotonic()<deadline:
            time.sleep(.2)
        assert (root/'calls').read_text().strip()=='deploy ENV=stg'
        print('PASS local watcher reacts to selected environment edits only')
    finally:
        process.terminate()
        process.wait(timeout=5)
