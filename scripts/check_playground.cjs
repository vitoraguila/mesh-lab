// Run against a temporary loopback forward: node scripts/check_playground.cjs stg 3100
const assert = require('node:assert/strict');
const fs = require('node:fs');
const WebSocket = require('../apps/web/node_modules/ws');
const [environment, port] = process.argv.slice(2);
if (!['stg','prd'].includes(environment) || !/^\d+$/.test(port || '')) throw Error('Usage: check_playground.cjs stg|prd <loopback-port>');
const base = `http://127.0.0.1:${port}`;
async function token(role, origin = base) {
 const response = await fetch(`${base}/api/demo-token`, {method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify({role})});
 return {status:response.status,body:await response.json(),cache:response.headers.get('cache-control')};
}
async function stream(credential) {
 return new Promise((resolve,reject)=>{
  const events=[];const ws=new WebSocket(`ws://127.0.0.1:${port}/api/events`,{origin:base});
  const timer=setTimeout(()=>{ws.terminate();reject(Error('WebSocket handshake timed out'))},10000);
  ws.on('open',()=>ws.send(JSON.stringify({token:credential})));
  ws.on('message',raw=>{const data=JSON.parse(raw);if(data.type==='history'){clearTimeout(timer);resolve({ws,events})}else if(data.type==='event')events.push(data.event)});
  ws.on('error',()=>{clearTimeout(timer);reject(Error('WebSocket connection failed'))});
  ws.on('close',()=>{clearTimeout(timer);reject(Error('WebSocket denied'))});
 });
}
(async()=>{
 const admin=await token('admin');assert.equal(admin.status,200);assert.equal(admin.cache,'no-store');
 const expected=JSON.parse(fs.readFileSync(`.local/${environment}/authz-secrets.json`)).authz.credentials.adminToken;
 assert.ok(admin.body.token===expected,'Wrong environment token');
 assert.equal((await token('admin','http://untrusted.example')).status,403);
 assert.equal((await token('invalid')).status,400);
 for(const credential of ['invalid-token',JSON.parse(fs.readFileSync(`.local/${environment==='stg'?'prd':'stg'}/authz-secrets.json`)).authz.credentials.adminToken]){
  let denied=false;try{const result=await stream(credential);result.ws.close()}catch{denied=true}assert.ok(denied,'Unauthorized event subscriber accepted');
 }
 const {ws,events}=await stream(admin.body.token);
 try{
  const response=await fetch(`${base}/api/demo`,{headers:{Authorization:`Bearer ${admin.body.token}`}});const result=await response.json();
  for(let n=0;n<40;n++){if(result.results.every(r=>events.some(e=>e.requestId===r.requestId&&e.service===r.service&&e.stage==='completed')&&events.some(e=>e.requestId===r.requestId&&e.service==='authz'&&e.stage==='allowed')))break;await new Promise(r=>setTimeout(r,250))}
  for(const resultItem of result.results){assert.ok(events.some(e=>e.requestId===resultItem.requestId&&e.service===resultItem.service&&e.stage==='completed'),`No correlated ${resultItem.service} event`);assert.ok(events.some(e=>e.requestId===resultItem.requestId&&e.service==='authz'&&e.stage==='allowed'),`No correlated authorization for ${resultItem.service}`)}
  assert.ok(!JSON.stringify(events).includes(admin.body.token),'Credential leaked into events');
  const reader=await token('reader');
  const catalogResponse=await fetch(`${base}/api/learn/catalog`);assert.equal(catalogResponse.status,200);
  const catalog=await catalogResponse.json();assert.equal(catalog.environment,environment);
  assert.equal(catalog.diagnostics.length,0);
  const individual=[];
  for(const service of catalog.services){
   for(const operation of service.operations){
    if(!catalog.activeOperations[service.id]?.includes(operation.id))continue;
    for(const [identity,credential] of [['admin',admin.body.token],['reader',reader.body.token],['missing',''],['invalid','invalid-token']]){
     const requestId=crypto.randomUUID();
     const response=await fetch(`${base}/api/playground`,{method:'POST',headers:{'Content-Type':'application/json',...(credential?{Authorization:`Bearer ${credential}`}:{})},body:JSON.stringify({service:service.id,operation:operation.id,input:operation.input,requestId})});
     assert.equal(response.status,200);const body=await response.json();assert.equal(body.requestId,requestId);
     const allowed=identity==='admin'||identity==='reader'&&!['orders','payments','grpc'].includes(service.id);
     // A create answers 201; every other allowed operation answers 200.
     const expected=allowed?(operation.method==='POST'&&operation.protocol==='rest'?201:200):403;
     assert.equal(body.status,expected,`${service.id}/${operation.id}/${identity}`);
     individual.push({requestId,service:service.id,expected,allowed});
    }
   }
  }
  for(let n=0;n<40;n++){if(individual.every(r=>events.some(e=>e.requestId===r.requestId&&e.service==='authz'&&e.stage===(r.allowed?'allowed':'denied'))))break;await new Promise(r=>setTimeout(r,250))}
  for(const r of individual){
   const observed=events.filter(e=>e.requestId===r.requestId);
   assert.ok(observed.some(e=>e.service==='authz'&&e.stage===(r.allowed?'allowed':'denied')),`Missing individual decision: ${r.service}`);
   if(!r.allowed)assert.ok(!observed.some(e=>e.service===r.service),'Denied individual request reached handler');
   else assert.ok(observed.some(e=>e.service===r.service&&e.stage==='completed'),`Missing individual handler: ${r.service}`);
   for(const event of observed){assert.ok(event.eventId,'Missing event identity');assert.ok(event.sourceRevision&&event.sourceRevision!=='unknown','Missing build revision');assert.ok(['http','grpc'].includes(event.statusKind),'Missing status protocol')}
  }
  for(const body of [{service:'catalog',requestId:'../../invalid'},{service:'unregistered'},{service:'catalog',input:[]},{service:'catalog',operation:'unregistered'}]){
   assert.equal((await fetch(`${base}/api/playground`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})).status,400);
  }
  assert.equal((await fetch(`${base}/api/learn/source?id=${encodeURIComponent('../../.local/'+environment+'/authz-secrets.json')}`)).status,404);
  const source=await (await fetch(`${base}/api/learn/source?id=${encodeURIComponent('apps/web/lib/upstream.ts')}`)).json();assert.ok(source.content.includes('callUpstream'));assert.ok(!JSON.stringify(source).includes(admin.body.token));
  const replay=await stream(admin.body.token);replay.ws.close();
  console.log(`PASS ${environment}: every registered operation × four identities, correlation IDs, build revisions, source allowlist, observer separation, reconnect`);

  const denied=await (await fetch(`${base}/api/demo`,{headers:{Authorization:'Bearer invalid-token'}})).json();
  for(let n=0;n<40;n++){if(denied.results.every(r=>events.some(e=>e.requestId===r.requestId&&e.stage==='denied')))break;await new Promise(r=>setTimeout(r,250))}
  for(const r of denied.results){assert.ok(events.some(e=>e.requestId===r.requestId&&e.stage==='denied'),'Missing denial event');assert.ok(!events.some(e=>e.requestId===r.requestId&&e.service===r.service),'Denied request hit business service')}
  console.log(`PASS ${environment}: same-origin demo tokens, WebSocket authorization/isolation, all five correlated service/authz events, denied requests stop at authz, no credential telemetry`);
 }finally{ws.close()}
})().catch(error=>{console.error(error.message);process.exit(1)});
