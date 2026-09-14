import { readFile } from "node:fs/promises";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
 const headers={"Cache-Control":"no-store", "Pragma":"no-cache"};
 if (process.env.DEMO_TOKENS_ENABLED!=="true") return Response.json({error:"Demo token access is disabled"},{status:404,headers});
 const origin=request.headers.get("origin");
 if (!origin || new URL(origin).host!==request.headers.get("host") || request.headers.get("sec-fetch-site")==="cross-site") return Response.json({error:"Same-origin request required"},{status:403,headers});
 try {
  const {role}=await request.json() as {role:unknown};
  if (role!=="admin" && role!=="reader") return Response.json({error:"Choose admin or reader"},{status:400,headers});
  const tokens:unknown=JSON.parse(await readFile("/etc/mesh-demo/tokens.json","utf8"));
  if (!tokens || typeof tokens!=="object" || !(role in tokens)) throw new Error();
  const token=(tokens as Record<string,unknown>)[role];
  if (typeof token!=="string" || !token) throw new Error();
  return Response.json({role,token},{headers});
 } catch {return Response.json({error:"Demo credentials unavailable"},{status:503,headers})}
}
