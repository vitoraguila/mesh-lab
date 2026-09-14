import { callUpstream } from "../../../lib/upstream";
export const dynamic="force-dynamic";
export async function POST(request:Request) {
 try {
  const raw=await request.text();if(raw.length>65536)return Response.json({error:"Request too large"},{status:413});
  const {service,operation,input,requestId}=JSON.parse(raw) as {service:unknown;operation?:unknown;input?:unknown;requestId?:unknown};
  if(typeof service!=="string"||(operation!==undefined&&typeof operation!=="string")||(requestId!==undefined&&(typeof requestId!=="string"||! /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId))))return Response.json({error:"Invalid operation or request ID"},{status:400});
  const result=await callUpstream(service,request.headers.get("authorization"),input,operation,requestId);
  return Response.json(result,{headers:{"Cache-Control":"no-store"}});
 }catch(error){return Response.json({error:error instanceof Error?error.message:"Invalid request"},{status:400})}
}
