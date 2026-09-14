#!/usr/bin/env python3
"""Integration checks against the dedicated local cluster. Never uses current-context."""
import argparse
import json
import socket
import subprocess
import time
import urllib.request

parser = argparse.ArgumentParser()
parser.add_argument('--env', choices=['stg', 'prd'], default='stg')
environment = parser.parse_args().env
K = ['minikube', '-p', 'mesh-study', 'kubectl', '--', '--context=mesh-study', '-n', environment]
def k(*args, **kwargs):
    return subprocess.run(K + list(args), check=True, text=True, capture_output=True, **kwargs).stdout

def eventually(check, seconds=45):
    end = time.monotonic() + seconds
    while True:
        try:
            return check()
        except (AssertionError, OSError, ValueError):
            if time.monotonic() >= end:
                raise
            time.sleep(2)

with open(f'.local/{environment}/authz-secrets.json') as f:
    tokens = json.load(f)['authz']['credentials']
with socket.socket() as s:
    s.bind(('127.0.0.1', 0))
    port = s.getsockname()[1]
forward = subprocess.Popen(K + ['port-forward', '--address=127.0.0.1', 'svc/web', f'{port}:3000'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def demo(token=None):
    req = urllib.request.Request(f'http://127.0.0.1:{port}/api/demo', headers={'Authorization': f'Bearer {token}'} if token else {})
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.load(r)['results']

def expect(token, statuses):
    result = demo(token)
    actual = {r['service']: r['status'] for r in result}
    assert actual == statuses, f'Expected {statuses}, got {result}'
    for r in result:
        if r['status'] == 200:
            if r['service'] == 'graphql':
                assert r['body']['data']['products'] and r['body']['data']['environment'] == environment, r
            elif r['service'] == 'grpc':
                assert r['grpcCode'] == 0 and r['body']['price'] == 10 and r['body']['environment'] == environment, r
            else:
                assert r['body']['service'] == r['service'] and r['body']['data'], r
                assert r['body']['environment'] == environment, r
    return result

def from_pod(target, url, token=None):
    # Pass credentials through stdin, never process arguments.
    options = 'method:"POST",body:JSON.stringify({query:"{ products { name } }"}),' if url.endswith('/graphql') else ''
    source = 'const r=await fetch(' + json.dumps(url) + ',{' + options + 'headers:' + json.dumps({'Authorization': f'Bearer {token}', 'x-auth-subject': 'demo-admin'} if token else {'x-auth-subject': 'demo-admin'}) + ',signal:AbortSignal.timeout(6000)});console.log(r.status);'
    return int(k('exec', '-i', target, '-c', 'web' if target == 'deployment/web' else 'probe', '--', 'node', '--input-type=module', input=source).strip())

# Go, Node.js and Python all sit behind the same gateway and policies.
APIS = ['catalog', 'orders', 'inventory', 'payments', 'reviews', 'graphql', 'grpc']
scaled = False
probe_created = False
try:
    eventually(lambda: expect(tokens['adminToken'], dict.fromkeys(APIS, 200)), 90)
    print('PASS admin reaches all seven APIs (Go, Node.js, Python) through Next.js and the internal gateway', flush=True)
    expect(tokens['readerToken'], {'catalog': 200, 'orders': 403, 'inventory': 200, 'payments': 403, 'reviews': 200, 'graphql': 200, 'grpc': 403})
    print('PASS reader scopes: catalog/inventory/reviews/GraphQL allowed, orders/payments/gRPC denied', flush=True)
    for token in [None, 'invalid-token']:
        expect(token, dict.fromkeys(APIS, 403))
    print('PASS missing and invalid credentials denied by Istio CUSTOM policy', flush=True)
    for service in APIS:
        if service == 'grpc':
            source = '''const grpc=require('@grpc/grpc-js');const loader=require('@grpc/proto-loader');const d=loader.loadSync('/app/proto/shipping.proto');const m=d['shipping.v1.ShippingService'];const C=grpc.makeGenericClientConstructor(m,'ShippingService');const c=new C('grpc:8080',grpc.credentials.createInsecure());const metadata=new grpc.Metadata();metadata.set('authorization',TOKEN);metadata.set('x-auth-subject','demo-admin');c.makeUnaryRequest('/shipping.v1.ShippingService/Quote',m.Quote.requestSerialize,m.Quote.responseDeserialize,{destination:'PT',weightKg:2},metadata,{deadline:Date.now()+6000},e=>{console.log(e?.code===7?403:0);c.close()});'''.replace('TOKEN',json.dumps('Bearer '+tokens['adminToken']))
            status = int(k('exec','-i','deployment/web','-c','web','--','node',input=source).strip())
        else:
            status = from_pod('deployment/web', f'http://{service}:8080/{service}', tokens['adminToken'])
        assert status == 403, (service, status)
    print('PASS direct API bypass denied even with a valid token and forged identity header', flush=True)
    pod = {'apiVersion':'v1','kind':'Pod','metadata':{'name':'mesh-smoke-probe','labels':{'app':'mesh-smoke-probe'}},'spec':{'restartPolicy':'Never','containers':[{'name':'probe','image':'mesh-study/web:dev','imagePullPolicy':'IfNotPresent','command':['node','-e','setInterval(()=>{},1000)']}]}}
    # Use the actual deployed image so TAG overrides work.
    pod['spec']['containers'][0]['image'] = k('get','deployment','web','-o','jsonpath={.spec.template.spec.containers[0].image}')
    # smoke-all runs environments back-to-back; remove a previous probe before
    # reusing the stable name so a prior asynchronous cleanup cannot collide.
    k('delete','pod/mesh-smoke-probe','--ignore-not-found=true','--wait=true')
    k('create','-f','-',input=json.dumps(pod)); probe_created = True
    k('wait','--for=condition=Ready','pod/mesh-smoke-probe','--timeout=120s')
    status = from_pod('mesh-smoke-probe',f'http://internal-gateway.{environment}.svc.cluster.local/catalog',tokens['adminToken'])
    assert status == 403, status
    print('PASS unauthorized mesh service account cannot use the gateway', flush=True)
    subprocess.run(['node', 'scripts/check_playground.cjs', environment, str(port)], check=True)
    replicas = k('get','deployment','authz','-o','jsonpath={.spec.replicas}')
    scaled = True
    k('scale','deployment/authz','--replicas=0')
    k('wait','--for=delete','pod','-l','app=authz','--timeout=90s')
    eventually(lambda: expect(tokens['adminToken'],dict.fromkeys(APIS,503)))
    print('PASS authorization service outage fails closed (all APIs return 503)', flush=True)
finally:
    if scaled:
        k('scale','deployment/authz',f'--replicas={replicas}')
        k('rollout','status','deployment/authz','--timeout=120s')
    if probe_created:
        k('delete','pod/mesh-smoke-probe','--wait=true')
    forward.terminate()
    forward.wait(timeout=10)
print('All integration checks passed; authorization service restored.', flush=True)
