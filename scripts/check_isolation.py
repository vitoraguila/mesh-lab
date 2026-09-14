#!/usr/bin/env python3
"""Verify namespace workload isolation and environment-specific runtime injection."""
import json
import subprocess


def execute(environment, source):
    result = subprocess.run(['minikube','-p','mesh-study','kubectl','--',
                             '--context=mesh-study','-n',environment,'exec','-i',
                             'deployment/web','-c','web','--','node','--input-type=module'],
                            input=source, text=True, capture_output=True, check=True)
    return json.loads(result.stdout)

for current, other in [('stg','prd'), ('prd','stg')]:
    token = json.load(open(f'.local/{other}/authz-secrets.json'))['authz']['credentials']['adminToken']
    source = '''const results = {};
results.runtime = await (await fetch('http://127.0.0.1:3000/api/runtime-config')).json();
results.crossNamespace = (await fetch(URL, {headers:{Authorization:TOKEN},signal:AbortSignal.timeout(6000)})).status;
results.crossCredential = (await (await fetch('http://127.0.0.1:3000/api/demo', {headers:{Authorization:TOKEN}})).json()).results.map(r=>r.status);
console.log(JSON.stringify(results));
'''.replace('URL',json.dumps(f'http://catalog.{other}.svc.cluster.local:8080/catalog')).replace('TOKEN',json.dumps('Bearer '+token))
    result = execute(current, source)
    assert result['runtime'] == {'environment':current,'title':'Mesh Lab · '+current.upper()}, result
    assert result['crossNamespace'] == 403, result
    # Every registered API, whatever the current count, must refuse the other environment.
    assert result['crossCredential'] and set(result['crossCredential']) == {403}, result
    print(f'PASS {current}: runtime config injected, other environment credentials and workload denied',flush=True)
print('Environment isolation checks passed.')
