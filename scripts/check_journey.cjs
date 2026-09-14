// Compile the pure journey reducer in a temporary folder using the installed TypeScript.
const {execFileSync}=require('node:child_process');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const assert=require('node:assert/strict');
const folder=fs.mkdtempSync(path.join(os.tmpdir(),'mesh-journey-'));
try{
 execFileSync(path.resolve('apps/web/node_modules/.bin/tsc'),['--ignoreConfig','--target','ES2023','--module','commonjs','--strict','--skipLibCheck','--outDir',folder,'apps/web/lib/journey.ts','apps/web/lib/types.ts']);
 const {mergeEvents,evidence,outcome}=require(path.join(folder,'journey.js'));
 const event=(id,time,stage='completed',service='catalog')=>({eventId:id,requestId:'request-a',service,stage,time,environment:'stg',path:'/catalog'});
 const first=event('a','2026-01-01T00:00:01Z');const second=event('b','2026-01-01T00:00:02Z');
 assert.deepEqual(mergeEvents([second],[first,second]),[first,second]);
 assert.deepEqual(mergeEvents([first],[first,second],1),[second]);
 const run={id:'request-a',service:'catalog',operation:'list',identity:'reader',input:{},startedAt:first.time,events:[]};
 assert.equal(evidence('handler',run).label,'Not observed');
 assert.equal(evidence('gateway',run).kind,'context');
 assert.equal(evidence('authz',{...run,events:[event('c',first.time,'denied','authz')]}).kind,'denied');
 assert.equal(evidence('handler',{...run,events:[event('c',first.time,'denied','authz')]}).label,'Not observed');
 const result={service:'catalog',requestId:run.id,status:200,latencyMs:1,body:{}};
 for(const [change,label] of [[{status:403},'Access denied'],[{status:504},'Request timed out'],[{status:503},'Upstream unavailable'],[{grpcCode:3},'gRPC error'],[{body:{errors:[{message:'unknown field'}]}},'GraphQL query errors']])assert.equal(outcome({...run,result:{...result,...change}}),label);
 console.log('PASS journey: out-of-order events, deduplication, bounded retention, honest evidence, distinct outcomes');
}finally{fs.rmSync(folder,{recursive:true,force:true})}
