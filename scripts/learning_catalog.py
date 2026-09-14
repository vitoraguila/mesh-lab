#!/usr/bin/env python3
"""Discover app-owned teaching content; never read local credentials into a bundle."""
import argparse
import base64
import gzip
import hashlib
import json
import re
import subprocess
from pathlib import Path
from datetime import datetime, timezone
import yaml

ROOT = Path(__file__).resolve().parents[1]
MAX_FILE = 160_000
MAX_BUNDLE = 700_000
EXTENSIONS = {'.css', '.json', '.go', '.js', '.py', '.ts', '.tsx', '.cjs', '.mjs', '.proto', '.yaml', '.tpl', '.md'}
EXCLUDED = {'node_modules', '.next', '.local', '.git', 'charts', 'gen', '__pycache__'}


def digest(value):
    return hashlib.sha256(value).hexdigest()[:16]


def dependencies(root=ROOT):
    chart = yaml.safe_load((root/'deploy/helm/platform/Chart.yaml').read_text())
    names = []
    for dependency in chart.get('dependencies', []):
        name = dependency['name']
        if not re.fullmatch(r'[a-z][a-z0-9-]*', name) or name in names:
            raise ValueError('Invalid or duplicate chart dependency')
        expected = (root/f'apps/{name}/deploy/helm').resolve()
        repository = dependency.get('repository', '')
        actual = (root/'deploy/helm/platform'/repository.removeprefix('file://')).resolve()
        if not repository.startswith('file://') or actual != expected:
            raise ValueError(f'{name}: learning discovery requires its app-owned local chart')
        names.append(name)
    return names


def approved(path, root=ROOT):
    try:
        relative = path.resolve().relative_to(root.resolve())
    except ValueError:
        return False
    return not (set(relative.parts) & EXCLUDED) and not path.is_symlink() and not path.name.startswith('.env') and 'secrets.' not in path.name and path.name not in {'package-lock.json','tsconfig.tsbuildinfo'} and (path.suffix in EXTENSIONS or path.name in {'Dockerfile', 'requirements.txt'})


def source_revision(app, root=ROOT):
    roots = [root/f'apps/{app}'] + ([root/'apps/shared'] if app != 'web' else [])
    files = sorted(p for folder in roots for p in folder.rglob('*') if p.is_file() and (approved(p, root) or (p.name in ['go.mod','go.sum','package.json','package-lock.json'] and not set(p.parts)&EXCLUDED)) and 'deploy' not in p.parts and p.name != 'learn.yaml' and p.suffix != '.md')
    return digest(b''.join(str(p.relative_to(root)).encode()+p.read_bytes() for p in files))




def platform_versions(root=ROOT):
    """Read the pinned platform versions from the Makefile, never hard-coded."""
    makefile = root/'Makefile'
    text = makefile.read_text() if makefile.is_file() else ''

    def pin(name):
        found = re.search(rf'^{name} :?= *(\S+)', text, re.M)
        return found[1] if found else 'unknown'

    return {'cluster': pin('PROFILE'), 'istio': pin('ISTIO_VERSION'), 'kubernetes': pin('KUBERNETES_VERSION')}


def workload_facts(data):
    """Read the runtime shape of one app from its rendered manifests.

    Only non-secret, already-published fields. Anything the browser cannot
    honestly observe, such as the node a pod lands on, is deliberately absent.
    """
    kind = data.get('kind')
    spec = data.get('spec') or {}
    if kind == 'Deployment':
        template = (spec.get('template') or {})
        pod = template.get('spec') or {}
        containers = pod.get('containers') or []
        first = containers[0] if containers else {}
        return {
            'kind': kind,
            'name': data['metadata']['name'],
            'replicas': spec.get('replicas'),
            'image': first.get('image'),
            'container': first.get('name'),
            'serviceAccount': pod.get('serviceAccountName'),
            'podLabels': (template.get('metadata') or {}).get('labels') or {},
            'ports': [port.get('containerPort') for port in (first.get('ports') or [])],
        }
    if kind == 'Service':
        return {'servicePorts': [{'name': port.get('name'), 'port': port.get('port'), 'appProtocol': port.get('appProtocol')} for port in (spec.get('ports') or [])]}
    return {}


def anchor_range(content, reference):
    lines = content.splitlines()
    start = reference.get('anchor')
    if not start:
        return None
    matches = [i for i, line in enumerate(lines) if start in line]
    if len(matches) != 1:
        raise ValueError(f'Anchor must match exactly once: {start}')
    first = matches[0]
    end = reference.get('end')
    if end:
        matches = [i for i in range(first, len(lines)) if end in lines[i]]
        if len(matches) != 1:
            raise ValueError(f'End anchor must match exactly once after start: {end}')
        last = matches[0]
    else:
        last = min(first + reference.get('context', 5), len(lines)-1)
    return [first+1, last+1]


def clean(value):
    if isinstance(value, dict):
        if value.get('kind') == 'Secret':
            value = {k: '[REDACTED]' if k in {'data', 'stringData'} else v for k, v in value.items()}
        return {k: '[REDACTED]' if re.search(r'secret|token|password|credential|private.?key', str(k), re.I) else clean(v) for k,v in value.items()}
    if isinstance(value, list): return [clean(v) for v in value]
    return value


def safe_content(path):
    content = path.read_text()
    if len(content.encode()) > MAX_FILE:
        raise ValueError(f'Source exceeds {MAX_FILE} bytes: {path.name}')
    # Values/config documents cannot publish chart-managed secret values.
    if path.suffix in {'.yaml', '.json'} and 'templates' not in path.parts:
        data = yaml.safe_load(content)
        sanitized = clean(data)
        if sanitized != data:
            content = yaml.safe_dump(sanitized, sort_keys=False)
    return content


def validate_operation(operation):
    if not re.fullmatch(r'[a-z][a-z0-9-]*', operation.get('id', '')):
        raise ValueError('Operation requires a stable lowercase id')
    if operation.get('protocol') not in ['rest', 'graphql', 'grpc']:
        raise ValueError('Unsupported operation protocol')
    if not re.fullmatch(r'/[A-Za-z0-9_./-]+', operation.get('path', '')) or '..' in operation['path'] or operation['path'].startswith('//'):
        raise ValueError('Operation path must be a fixed relative gateway path')
    if operation.get('method') not in ['GET', 'POST']:
        raise ValueError('Only GET and POST are supported')
    if operation['protocol'] in ['graphql', 'grpc'] and operation['method'] != 'POST':
        raise ValueError('GraphQL and gRPC require POST')
    if not isinstance(operation.get('input'), dict):
        raise ValueError('Operation input must be an object')
    if not isinstance(operation.get('title'), str):
        raise ValueError('Operation requires a title')
    for example in operation.get('examples', []):
        if not isinstance(example.get('input'), dict) or not isinstance(example.get('title'), str):
            raise ValueError('Examples require title and object input')
        if example.get('identity', 'reader') not in ['admin','reader','missing','invalid']:
            raise ValueError('Example identity must be a built-in demo identity')
    if operation['protocol'] == 'grpc':
        service, method = operation.get('rpcService', ''), operation.get('rpcMethod', '')
        if not re.fullmatch(r'[A-Za-z_][\w.]*', service) or not re.fullmatch(r'[A-Za-z_]\w*', method) or operation['path'] != f'/{service}/{method}':
            raise ValueError('gRPC path must match the registered service and method')


def yaml_pointer_lines(text, pointer):
    node = yaml.compose(text)
    for part in pointer.strip('/').split('/'):
        if not part: continue
        if isinstance(node, yaml.MappingNode):
            matches = [value for key,value in node.value if key.value == part]
            if not matches: return None
            node = matches[0]
        elif isinstance(node, yaml.SequenceNode) and part.isdigit() and int(part)<len(node.value):
            node = node.value[int(part)]
        else: return None
    return [node.start_mark.line+1, max(node.start_mark.line+1,node.end_mark.line)]


def build(environment, root=ROOT, rendered=None, strict=True):
    files = {}
    services = []
    diagnostics = []
    def add(path):
        if not path.is_file() or not approved(path, root): return None
        key = str(path.relative_to(root))
        if key not in files:
            content = safe_content(path)
            files[key] = {'id':key,'path':key,'content':content,'digest':digest(content.encode()),'language':path.suffix.lstrip('.') or 'dockerfile','rendered':[]}
        return key
    for app in dependencies(root):
        folder = root/f'apps/{app}'
        descriptor = folder/'learn.yaml'
        metadata = (yaml.safe_load(safe_content(descriptor)) or {}) if descriptor.exists() and approved(descriptor, root) else {}
        operations = metadata.get('operations', [])
        if len({o['id'] for o in operations}) != len(operations): raise ValueError(f'{app}: duplicate operation IDs')
        for operation in operations:
            validate_operation(operation)
            if operation['protocol'] == 'grpc':
                proto = folder/operation['proto']
                if not approved(proto,root) or proto.suffix != '.proto' or not proto.resolve().is_relative_to(folder.resolve()): raise ValueError('Invalid proto reference')
                operation['protoContent'] = safe_content(proto)
                check = subprocess.run(['node', '-e', """
const fs=require('node:fs');const protobuf=require(process.argv[1]);
try{const op=JSON.parse(fs.readFileSync(0,'utf8'));const root=protobuf.parse(op.protoContent).root;root.resolveAll();
const method=root.lookupService(op.rpcService).methods[op.rpcMethod];
if(!method||method.requestStream||method.responseStream)throw Error('Registered method must exist and be unary');
}catch(error){console.error(error.message);process.exit(1)}
""", str(ROOT/'apps/web/node_modules/protobufjs')], input=json.dumps(operation), text=True, capture_output=True)
                if check.returncode: raise ValueError(f'{app}: invalid Protobuf method: {check.stderr.strip()}')
        keys = []
        for p in sorted(folder.rglob('*')):
            if 'environments' in p.parts and environment not in p.parts: continue
            key = add(p)
            if key: keys.append(key)
        steps = []
        for step in metadata.get('steps', []):
            refs = []
            for ref in step.get('sources', []):
                try:
                    ref = {**ref, 'file':ref['file'].replace('{env}',environment)}
                    key = add(root/ref['file'])
                    if not key: raise ValueError('Missing or excluded file')
                    refs.append({**ref,'file':key,'lines':anchor_range(files[key]['content'],ref)})
                except (ValueError, KeyError) as error:
                    diagnostics.append(f'{app}/{step["id"]}: {ref.get("file")}: {error}')
            steps.append({**step,'sources':refs})
        services.append({'id':app,'title':metadata.get('title',app.title()),'description':metadata.get('description','Infrastructure service; explore its source and configuration.'),'language':metadata.get('language',''),'protocol':operations[0]['protocol'] if operations else 'infrastructure','operations':operations,'steps':steps,'files':keys,'sourceRevision':source_revision(app,root)})
    workloads = {}
    if rendered:
        for doc in rendered.split('\n---'):
            match = re.search(r'# Source: platform/(.+)', doc)
            data = yaml.safe_load(doc)
            if not match or not isinstance(data,dict) or data.get('kind') in ['Secret']: continue
            origin = match[1]
            parts = origin.split('/')
            if parts[0]=='charts': origin = f'apps/{parts[1]}/deploy/helm/'+ '/'.join(parts[2:])
            else: origin='deploy/helm/platform/'+origin
            key=add(root/origin)
            if not key: continue
            content=yaml.safe_dump(clean(data), sort_keys=False)
            app = parts[1] if parts[0]=='charts' else None
            contributors = ([f'apps/{app}/deploy/helm/values.yaml'] if app else []) + ['deploy/helm/platform/values.yaml', f'deploy/environments/{environment}/values.yaml']
            if app:
                contributors += [f'apps/{app}/deploy/environments/{environment}/{name}.yaml' for name in ['values','config','policy']]
            contributors = [add(root/p) for p in contributors if (root/p).is_file()]
            resource={'contributors':contributors,'id':f'{data["kind"]}/{data["metadata"]["name"]}','content':content,'kind':data['kind'],'name':data['metadata']['name']}
            files[key]['rendered'].append(resource)
            if app: workloads.setdefault(app, {}).update(workload_facts(data))
        for service in services:
            service['workload'] = workloads.get(service['id'], {})
            for step in service['steps']:
                for ref in step['sources']:
                    ref['renderedLines']={r['id']:yaml_pointer_lines(r['content'],ref.get('pointer','/spec')) for r in files[ref['file']]['rendered']}
                    for resource, lines in ref['renderedLines'].items():
                        if lines is None: diagnostics.append(f'{service["id"]}/{step["id"]}: {resource}: missing field {ref.get("pointer", "/spec")}')
    if diagnostics and strict: raise ValueError('\n'.join(diagnostics))
    catalog={'version':1,'environment':environment,'platform':platform_versions(root),'services':services,'files':files,'diagnostics':diagnostics}
    catalog['revision']=digest(json.dumps(catalog,sort_keys=True).encode())
    catalog['generatedAt']=datetime.now(timezone.utc).isoformat()
    return catalog


def encode(catalog):
    raw=json.dumps(catalog,separators=(',',':')).encode()
    if len(raw)>8_000_000: raise ValueError('Uncompressed catalog exceeds 8 MB')
    packed=base64.b64encode(gzip.compress(raw,mtime=0)).decode()
    if len(packed)>MAX_BUNDLE: raise ValueError('Compressed catalog exceeds ConfigMap budget')
    return packed


def main():
    parser=argparse.ArgumentParser();parser.add_argument('--env',choices=['stg','prd'],default='stg');parser.add_argument('--revision');parser.add_argument('--check',action='store_true');args=parser.parse_args()
    if args.revision: print(source_revision(args.revision));return
    rendered=subprocess.check_output(['python3','scripts/helm_environment.py','render','--env',args.env],text=True)
    catalog=build(args.env,rendered=rendered)
    encode(catalog)
    print(f'Validated {len(catalog["services"])} services, {len(catalog["files"])} files; revision {catalog["revision"]}')

if __name__=='__main__': main()
