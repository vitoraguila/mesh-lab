import { learningData } from "../../../../lib/learning";
export const dynamic="force-dynamic";
export async function GET(request:Request){
 try{const id=new URL(request.url).searchParams.get("id");const {workspace}=await learningData();
 if(!id||!Object.hasOwn(workspace.files,id))return Response.json({error:"Source not in approved catalog"},{status:404});
 return Response.json({...workspace.files[id],revision:workspace.revision},{headers:{"Cache-Control":"no-store"}});
 }catch{return Response.json({error:"Source catalog unavailable"},{status:503})}
}
