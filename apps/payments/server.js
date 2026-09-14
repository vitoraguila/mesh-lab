// Node.js business API. Same contract as the Go services: no authorization
// logic here, the mesh decides before the request ever arrives.
import {createServer} from "node:http";
import {emit, exposition, observe} from "./telemetry.js";

const service = process.env.SERVICE_NAME ?? "payments";
const environment = process.env.APP_ENV ?? "local";
const port = Number(process.env.HTTP_PORT ?? 8080);

const payments = [
 {id:"pay-9001", order:"o-501", amount:218, currency:"EUR", status:"captured"},
 {id:"pay-9002", order:"o-502", amount:89, currency:"EUR", status:"pending"},
];
const MAX_BODY = 8192;
const CURRENCIES = ["EUR", "USD", "GBP"];

/** Read a bounded JSON body. Oversized or malformed input is a 400, never a crash. */
function readJson(request){
 return new Promise((resolve, reject) => {
  let size = 0;
  const chunks = [];
  request.on("data", chunk => {
   size += chunk.length;
   if(size > MAX_BODY){reject(new Error("Request too large")); request.destroy(); return}
   chunks.push(chunk);
  });
  request.on("end", () => {
   try{resolve(JSON.parse(Buffer.concat(chunks).toString() || "{}"))}
   catch{reject(new Error("Body must be valid JSON"))}
  });
  request.on("error", () => reject(new Error("Could not read the request body")));
 });
}

/** Validate here, not in the mesh: the mesh decided who may call, not what is valid. */
function validate(body){
 if(!body || typeof body !== "object" || Array.isArray(body)) return "Send a JSON object";
 if(typeof body.order !== "string" || !/^[a-zA-Z0-9-]{1,32}$/.test(body.order)) return "order must be 1-32 characters of letters, digits or hyphens";
 if(typeof body.amount !== "number" || !Number.isFinite(body.amount) || body.amount <= 0 || body.amount > 1e6) return "amount must be a positive number below 1000000";
 if(!CURRENCIES.includes(body.currency)) return `currency must be one of ${CURRENCIES.join(", ")}`;
 return null;
}

const server = createServer(async (request, response) => {
 const path = new URL(request.url, "http://localhost").pathname;
 if(request.method === "GET" && path === "/healthz"){
  response.writeHead(200).end();
  return;
 }
 if(request.method === "GET" && path === "/metrics"){
  response.writeHead(200, {"Content-Type":"text/plain; version=0.0.4; charset=utf-8", "Cache-Control":"no-store"}).end(exposition());
  return;
 }
 const requestId = request.headers["x-mesh-request-id"] ?? "";
 const started = process.hrtime.bigint();
 emit(requestId, "received", path, 0);
 let status = 404;
 let body = {error:"Not found"};
 const envelope = data => ({service, version:process.env.SERVICE_VERSION ?? "v1", environment, data, pod:process.env.HOSTNAME ?? ""});
 if(request.method === "GET" && path === `/${service}`){
  status = 200;
  body = envelope(payments);
 }else if(request.method === "POST" && path === `/${service}`){
  try{
   const submitted = await readJson(request);
   const problem = validate(submitted);
   if(problem){
    status = 400;
    body = {error:problem};
   }else{
    // Bounded in-memory store: this is a study environment, not a ledger.
    const created = {
     id:`pay-${Math.floor(Math.random() * 9000 + 1000)}`,
     order:submitted.order,
     amount:submitted.amount,
     currency:submitted.currency,
     status:"captured",
     receivedAt:new Date().toISOString(),
    };
    payments.unshift(created);
    payments.length = Math.min(payments.length, 20);
    status = 201;
    body = envelope([created]);
   }
  }catch(error){
   status = 400;
   body = {error:error instanceof Error ? error.message : "Invalid request"};
  }
 }
 response.writeHead(status, {"Content-Type":"application/json", "Cache-Control":"no-store"}).end(JSON.stringify(body));
 observe(path, String(status), Number(process.hrtime.bigint() - started) / 1e9);
 emit(requestId, "completed", path, status);
});

server.headersTimeout = 6000;
server.requestTimeout = 10000;
server.keepAliveTimeout = 60000;
server.listen(port, () => console.log(`listening on :${port} environment=${environment} runtime=node${process.versions.node}`));

for(const signal of ["SIGTERM", "SIGINT"]) process.on(signal, () => {
 server.close(() => process.exit(0));
 setTimeout(() => process.exit(0), 5000).unref();
});
