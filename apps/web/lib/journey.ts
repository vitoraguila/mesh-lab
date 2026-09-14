import type { DemoResult, MeshEvent } from "./types";
export type Run = {id:string;service:string;operation:string;input:Record<string,unknown>;identity:string;startedAt:string;result?:DemoResult;error?:string;events:MeshEvent[]};
export const stages=["browser","next","gateway","envoy","authz","handler","response","events"];
export function mergeEvents(previous:MeshEvent[],incoming:MeshEvent[],limit=400){
 const seen=new Map<string,MeshEvent>();for(const event of [...previous,...incoming])seen.set(event.eventId??`${event.requestId}:${event.service}:${event.stage}:${event.time}`,event);
 return [...seen.values()].sort((a,b)=>Date.parse(a.time)-Date.parse(b.time)).slice(-limit);
}
export function outcome(run?:Run){
 if(!run)return "Ready to explore";
 if(run.error)return "Request error";
 if(!run.result)return "Request in progress";
 if(run.result.status===403)return "Access denied";
 if(run.result.status===504)return "Request timed out";
 if(run.result.status===503)return "Upstream unavailable";
 if(run.result.grpcCode!==undefined&&run.result.grpcCode!==0)return "gRPC error";
 if(run.result.body&&typeof run.result.body==="object"&&"errors" in run.result.body)return "GraphQL query errors";
 return run.result.status>=400?"Request error":"Request completed";
}
export function evidence(step:string,run?:Run):{label:string;kind:"observed"|"context"|"denied"|"waiting"}{
 if(["gateway","envoy"].includes(step))return {label:"Configured route",kind:"context"};
 if(!run)return {label:"Run to observe",kind:"waiting"};
 if(step==="browser"||step==="next")return {label:step==="browser"?"Dispatched in browser":"Server call requested",kind:step==="browser"?"observed":"context"};
 if(step==="response")return {label:run.result?outcome(run):run.error?"Request failed":"Awaiting response",kind:run.result?.status===403?"denied":run.result||run.error?"observed":"waiting"};
 const event=run.events.findLast(e=>step==="authz"?e.service==="authz":step==="handler"?e.service===run.service:step==="events");
 if(event)return {label:step==="events"?"Metadata received":event.stage,kind:event.stage==="denied"?"denied":"observed"};
 return {label:"Not observed",kind:"waiting"};
}
