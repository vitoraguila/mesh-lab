import { catalog } from "../../../../lib/learning";
export const dynamic="force-dynamic";
export async function GET(){try{return Response.json(await catalog(),{headers:{"Cache-Control":"no-store"}})}catch{return Response.json({error:"Learning catalog is not ready. Run make deploy for this environment."},{status:503})}}
