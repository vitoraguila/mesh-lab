import * as grpc from "@grpc/grpc-js";
import { fromJSON } from "@grpc/proto-loader";
import protobuf from "protobufjs";
import type { DemoResult } from "./types";
import { activeOperation } from "./learning";

export async function callUpstream(service:string, authorization:string|null, input?:unknown, operationId?:string, id?:string):Promise<DemoResult> {
 if(input!==undefined&&(input===null||typeof input!=="object"||Array.isArray(input)))throw new Error("Operation input must be a JSON object");
 const start=Date.now();const requestId=id??crypto.randomUUID();
 const operation=await activeOperation(service,operationId);
 const timeout=Number(process.env.UPSTREAM_TIMEOUT_MS??"6000");
 if(!Number.isInteger(timeout)||timeout<=0)throw new Error("Invalid upstream timeout");
 const result={service,operation:operation.id,requestId};
 try {
  if(operation.protocol==="grpc"){
   const root=protobuf.parse(operation.protoContent!).root;root.resolveAll();
   const definition=fromJSON(root.toJSON(),{defaults:true});
   const methods=definition[operation.rpcService!] as grpc.ServiceDefinition;
   const method=methods[operation.rpcMethod!];
   const Client=grpc.makeGenericClientConstructor(methods,operation.rpcService!);
   const url=new URL(process.env.INTERNAL_API_URL!);
   const client=new Client(`${url.hostname}:${url.port||80}`,grpc.credentials.createInsecure());
   const metadata=new grpc.Metadata();metadata.set("x-mesh-request-id",requestId);
   if(authorization)metadata.set("authorization",authorization);
   try{
    const body=await new Promise<unknown>((resolve,reject)=>client.makeUnaryRequest(operation.path,method.requestSerialize,method.responseDeserialize,input??operation.input,metadata,{deadline:Date.now()+timeout},(error,value:unknown)=>error?reject(error):resolve(value)));
    return {...result,status:200,grpcCode:0,latencyMs:Date.now()-start,body};
   }catch(error){const e=error as grpc.ServiceError;return {...result,status:e.code===7||e.code===16?403:e.code===3?400:e.code===4?504:503,grpcCode:e.code,latencyMs:Date.now()-start,body:{error:e.details||"gRPC upstream unavailable"}}}finally{client.close()}
  }
  const response=await fetch(`${process.env.INTERNAL_API_URL}${operation.path}`,{
   method:operation.method,headers:{"x-mesh-request-id":requestId,...(authorization?{authorization}:{}),...(operation.method==="POST"?{"Content-Type":"application/json"}:{})},
   ...(operation.method==="POST"?{body:JSON.stringify(input??operation.input)}:{}),cache:"no-store",signal:AbortSignal.timeout(timeout),
  });
  const raw=await response.text();let body:unknown;try{body=JSON.parse(raw)}catch{body={error:raw}}
  return {...result,status:response.status,latencyMs:Date.now()-start,body};
 }catch(error){const timedOut=error instanceof Error&&["TimeoutError","AbortError"].includes(error.name);return {...result,status:timedOut?504:503,latencyMs:Date.now()-start,body:{error:timedOut?"Mesh request timed out":"Mesh upstream unavailable"}}}
}
