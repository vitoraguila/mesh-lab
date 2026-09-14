// Same event shape, routing key and metric names as the Go services. A polyglot
// mesh only works if every language reports the same way.
import amqp from "amqplib";
import {randomUUID} from "node:crypto";

const service = process.env.SERVICE_NAME ?? "payments";
const environment = process.env.APP_ENV ?? "local";
export const sourceRevision = process.env.SOURCE_REVISION ?? "unknown";

const BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5];
const requests = new Map();
const published = new Map();

export function observe(path, code, seconds){
 if(requests.size > 64) return;
 const id = `${path}|${code}`;
 const entry = requests.get(id) ?? {path, code, count:0, sum:0, buckets:BUCKETS.map(() => 0)};
 entry.count += 1;
 entry.sum += seconds;
 BUCKETS.forEach((edge, i) => {if(seconds <= edge) entry.buckets[i] += 1});
 requests.set(id, entry);
}

const quote = value => `"${String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`;

export function exposition(){
 const base = `service=${quote(service)},environment=${quote(environment)}`;
 const lines = [
  "# HELP mesh_build_info Source revision the running workload was built from.",
  "# TYPE mesh_build_info gauge",
  `mesh_build_info{${base},revision=${quote(sourceRevision)}} 1`,
  "# HELP mesh_requests_total Requests handled by this application, after the mesh allowed them.",
  "# TYPE mesh_requests_total counter",
 ];
 const ordered = [...requests.values()].sort((a, b) => `${a.path}${a.code}`.localeCompare(`${b.path}${b.code}`));
 for(const entry of ordered) lines.push(`mesh_requests_total{${base},path=${quote(entry.path)},code=${quote(entry.code)}} ${entry.count}`);
 lines.push("# HELP mesh_request_duration_seconds Handler latency, excluding the mesh hops in front of it.", "# TYPE mesh_request_duration_seconds histogram");
 for(const entry of ordered){
  const labels = `${base},path=${quote(entry.path)},code=${quote(entry.code)}`;
  BUCKETS.forEach((edge, i) => lines.push(`mesh_request_duration_seconds_bucket{${labels},le="${edge}"} ${entry.buckets[i]}`));
  lines.push(`mesh_request_duration_seconds_bucket{${labels},le="+Inf"} ${entry.count}`);
  lines.push(`mesh_request_duration_seconds_sum{${labels}} ${entry.sum}`);
  lines.push(`mesh_request_duration_seconds_count{${labels}} ${entry.count}`);
 }
 lines.push("# HELP mesh_events_published_total Telemetry events this application queued for the broker.", "# TYPE mesh_events_published_total counter");
 for(const [stage, count] of [...published.entries()].sort()) lines.push(`mesh_events_published_total{${base},stage=${quote(stage)}} ${count}`);
 return lines.join("\n") + "\n";
}

const pending = [];
let channel;
const exchange = process.env.AMQP_EXCHANGE ?? "";

async function connect(){
 const url = process.env.AMQP_URL;
 if(!url || !exchange) return;
 for(;;){
  try{
   const connection = await amqp.connect(url, {heartbeat:10});
   connection.on("error", () => {});
   connection.on("close", () => {channel = undefined});
   const open = await connection.createChannel();
   await open.assertExchange(exchange, "topic", {durable:true});
   channel = open;
   while(pending.length) publish(pending.shift());
   await new Promise(resolve => connection.on("close", resolve));
  }catch{/* best effort: the request path never waits for the broker */}
  channel = undefined;
  await new Promise(resolve => setTimeout(resolve, 2000));
 }
}
void connect();

const safe = part => (String(part ?? "").replace(/[^a-zA-Z0-9._-]+/g, "-") || "unknown");

function publish(event){
 if(!channel){
  if(pending.length < 256) pending.push(event);
  return;
 }
 const key = `${safe(event.environment)}.${safe(event.service)}.${safe(event.stage)}`;
 try{
  channel.publish(exchange, key, Buffer.from(JSON.stringify({...event, transport:"amqp", exchange, routingKey:key, publishedAt:new Date().toISOString()})), {contentType:"application/json", persistent:true, messageId:event.eventId});
 }catch{channel = undefined}
}

export function emit(requestId, stage, path, status){
 if(!requestId || requestId.length > 128) return;
 published.set(stage, (published.get(stage) ?? 0) + 1);
 publish({eventId:randomUUID(), sourceRevision, statusKind:"http", requestId, service, stage, path, status, time:new Date().toISOString(), environment});
}
