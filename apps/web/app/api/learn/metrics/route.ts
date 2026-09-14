// Read-only metric summary for the studio. The browser never reaches Prometheus
// and never supplies PromQL: only these fixed queries are ever executed.
export const dynamic = "force-dynamic";

const QUERIES = {
 handled: "sum by (service) (mesh_requests_total)",
 published: "sum by (service) (mesh_events_published_total)",
 decisions: "sum by (response_code) (increase(istio_requests_total[15m]))",
 latency: "histogram_quantile(0.95, sum by (le, service) (rate(mesh_request_duration_seconds_bucket[5m])))",
} as const;

type Sample = {metric:Record<string,string>; value:[number,string]};

async function run(base:string, query:string, signal:AbortSignal){
 const response = await fetch(`${base}/api/v1/query?query=${encodeURIComponent(query)}`, {cache:"no-store", signal});
 if(!response.ok) throw new Error(`Prometheus returned ${response.status}`);
 const payload = await response.json() as {status:string; data?:{result?:Sample[]}};
 if(payload.status !== "success") throw new Error("Prometheus query failed");
 return payload.data?.result ?? [];
}

function fold(samples:Sample[], label:string){
 const out:Record<string, number> = {};
 for(const sample of samples){
  const key = sample.metric[label];
  const value = Number(sample.value[1]);
  if(key && Number.isFinite(value)) out[key] = value;
 }
 return out;
}

export async function GET(){
 const base = process.env.PROMETHEUS_URL;
 const headers = {"Cache-Control":"no-store"};
 if(!base) return Response.json({enabled:false, reason:"No metric source is configured for this environment."}, {headers});
 const signal = AbortSignal.timeout(Number(process.env.UPSTREAM_TIMEOUT_MS ?? "6000"));
 try{
  const [handled, published, decisions, latency] = await Promise.all(
   (Object.keys(QUERIES) as (keyof typeof QUERIES)[]).map(name => run(base, QUERIES[name], signal)),
  );
  return Response.json({
   enabled:true,
   at:new Date().toISOString(),
   handled:fold(handled, "service"),
   published:fold(published, "service"),
   decisions:fold(decisions, "response_code"),
   latency:fold(latency, "service"),
  }, {headers});
 }catch(error){
  return Response.json({enabled:true, reachable:false, reason:error instanceof Error ? error.message : "Metric source unavailable"}, {status:503, headers});
 }
}
