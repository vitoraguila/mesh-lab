import { readFile, realpath } from "node:fs/promises";
import { gunzipSync } from "node:zlib";
import protobuf from "protobufjs";

export type Protocol = "rest" | "graphql" | "grpc" | "infrastructure";
export type Operation = {id:string; title:string; protocol:Exclude<Protocol,"infrastructure">; method:"GET"|"POST"; path:string; input:Record<string,unknown>; examples?:{title:string;identity?:string;input:Record<string,unknown>}[]; protoContent?:string;rpcService?:string;rpcMethod?:string; fields?:{name:string;type:string}[]};
export type SourceRef = {file:string; anchor?:string; lines:[number,number]|null; pointer?:string; renderedLines?:Record<string,[number,number]|null>};
export type Step = {id:string;title:string;description:string;detail:string;sources:SourceRef[]};
export type Workload = {
 kind?:string; name?:string; replicas?:number; image?:string; container?:string;
 serviceAccount?:string; podLabels?:Record<string,string>; ports?:number[];
 servicePorts?:{name?:string; port?:number; appProtocol?:string}[];
};
export type Language = "go" | "javascript" | "typescript" | "python" | "";
export type LearningService = {id:string;title:string;description:string;protocol:Protocol;language?:Language;operations:Operation[];steps:Step[];files:string[];sourceRevision:string;workload?:Workload};
export type SourceFile = {id:string;path:string;content:string;digest:string;language:string;rendered:{id:string;name:string;kind:string;content:string;contributors?:string[]}[]};
export type Platform = {cluster:string; istio:string; kubernetes:string};
export type Workspace = {version:number;revision:string;environment:string;platform?:Platform;generatedAt:string;services:LearningService[];files:Record<string,SourceFile>;diagnostics:string[]};
export type ActiveCatalog = {revision:string;appliedAt:string;services:{id:string;operations:Operation[]}[]};
export type Catalog = Omit<Workspace,"files"> & {files:Omit<SourceFile,"content"|"rendered">[];activeRevision:string;appliedAt:string;webRevision:string;activeOperations:Record<string,string[]>};
let previous:{workspace:Workspace;active:ActiveCatalog}|undefined;
// The catalog is a projected ConfigMap volume in the cluster. Outside production a
// fixture directory may stand in so the interface can be developed without a mesh.
function catalogRoot(){
 const override=process.env.LEARNING_CATALOG_DIR;
 return process.env.NODE_ENV==="production"||!override?"/etc/mesh-learning":override;
}
export async function learningData() {
 try {
  // Resolve the projected-volume generation once so both files come from one update.
  const folder = await realpath(`${catalogRoot()}/..data`);
  const [workspace,active] = await Promise.all(["workspace","active"].map(async name=>JSON.parse(gunzipSync(await readFile(`${folder}/${name}.gz`),{maxOutputLength:8_000_000}).toString("utf8"))));
  if(workspace.version!==1||!Array.isArray(workspace.services)||!Array.isArray(active.services))throw new Error("Invalid learning catalog");
  previous={workspace,active};
 }catch(error){if(!previous)throw new Error("Learning catalog is unavailable. Run make deploy for this environment.")}
 return previous!;
}
export async function catalog():Promise<Catalog>{
 const {workspace,active}=await learningData();
 const services=workspace.services.map(service=>({...service,operations:service.operations.map(operation=>{
  if(operation.protocol!=="grpc"||!operation.protoContent)return operation;
  const root=protobuf.parse(operation.protoContent).root;root.resolveAll();const method=root.lookupService(operation.rpcService!).methods[operation.rpcMethod!];
  return {...operation,fields:method.resolvedRequestType?.fieldsArray.map(f=>({name:f.name,type:f.type}))??[]};
 })}));
 let webRevision="unknown";try{webRevision=(await readFile("/app/source-revision.txt","utf8")).trim()}catch{}
 return {...workspace,services,files:Object.values(workspace.files).map(({content,rendered,...file})=>file),activeRevision:active.revision,appliedAt:active.appliedAt,webRevision,activeOperations:Object.fromEntries(active.services.map(s=>[s.id,s.operations.filter(o=>workspace.services.find(w=>w.id===s.id)?.operations.some(w=>w.id===o.id&&JSON.stringify(w)===JSON.stringify(o))).map(o=>o.id)]))};
}
export async function activeOperation(service:string,operation?:string){
 const {active}=await learningData();const app=active.services.find(s=>s.id===service);const result=operation?app?.operations.find(o=>o.id===operation):app?.operations[0];
 if(!result)throw new Error("Operation is not in the deployed catalog");return result;
}
