import { callUpstream } from "../../../lib/upstream";
import { learningData } from "../../../lib/learning";
export const dynamic="force-dynamic";
export async function GET(request:Request){
 const {active}=await learningData();
 const results=await Promise.all(active.services.filter(s=>s.operations.length).map(s=>callUpstream(s.id,request.headers.get("authorization"))));
 return Response.json({results},{headers:{"Cache-Control":"no-store"}});
}
