// Geometry and choreography for the mesh world. Pure data: no DOM, no React.
// The scene mirrors the documented request path. Motion is a configured
// explanation; observed evidence is reported separately by lib/journey.ts.

export type NodeKind = "client" | "edge" | "gateway" | "envoy" | "pod" | "authz" | "exchange" | "queue" | "telemetry" | "sink" | "tsdb" | "dashboard";
export type WorldNode = {
 id:string; kind:NodeKind; x:number; y:number;
 label:string; caption:string; step?:string; service?:string; protocol?:string; language?:string; accent?:string;
};
export type EdgeKind = "hop" | "mtls" | "branch" | "telemetry" | "queue" | "scrape";
export type WorldEdge = {id:string; from:string; to:string; kind:EdgeKind; d:string; mtls:boolean; accent?:string};
export type Frame = {x:number; y:number; width:number; height:number};
export type World = {width:number; height:number; nodes:WorldNode[]; edges:WorldEdge[]; lanes:Record<string,string>; cluster:Frame; namespace:Frame; pods:(Frame & {service:string; accent:string})[]; laneY:number; metricsY:number};
export type WorldService = {id:string; protocol:string; title:string; language?:string};

/**
 * Distinct accents so a service can be told apart at a glance. Twelve hues,
 * spread around the wheel: the rack reuses a colour only past twelve services,
 * which no longer fits one screen anyway.
 */
export const ACCENTS = [
 "#3ad6ff", "#37eaa0", "#ffc46a", "#ff7ad9", "#a98bff", "#ff9d4d",
 "#6fe3c4", "#8ab4ff", "#ff6f7d", "#c6e46a", "#5ad1ff", "#ffb3e6",
] as const;
export function accentFor(index:number){return ACCENTS[index % ACCENTS.length]}

const POD_STEP = 182;
/** How far the dashed pod boundary reaches around the two containers inside it. */
const POD_BOX = {up:62, down:78, left:78, right:116};

/** The wide scene grows downwards with the number of deployed services. */
function wide(count:number){
 const top = 200;
 const podBottom = top + POD_STEP * Math.max(count - 1, 0);
 const laneY = podBottom + 128;
 return {
  width:1460, height:laneY + 190,
  browser:{x:58, y:252}, web:{x:268, y:252}, gateway:{x:400, y:252},
  envoyX:660, podX:830, podTop:top,
  authz:{x:410, y:laneY}, exchange:{x:972, y:laneY}, queue:{x:1122, y:laneY},
  events:{x:1268, y:laneY},
  prometheus:{x:286, y:top}, grafana:{x:506, y:top},
 };
}

const NARROW = {
 width:440, height:752,
 browser:{x:142, y:84}, web:{x:142, y:182}, gateway:{x:142, y:286},
 envoyX:142, podX:142, envoyDrop:112, podDrop:116, podTop:0,
 authz:{x:340, y:392}, exchange:{x:340, y:486}, queue:{x:340, y:566},
 events:{x:340, y:646},
 prometheus:{x:340, y:182}, grafana:{x:340, y:84},
};

function hcurve(ax:number, ay:number, bx:number, by:number, bend = 0.55){
 const dx = (bx - ax) * bend;
 return `M${ax},${ay} C${ax + dx},${ay} ${bx - dx},${by} ${bx},${by}`;
}
function vcurve(ax:number, ay:number, bx:number, by:number, bend = 0.55){
 const dy = (by - ay) * bend;
 return `M${ax},${ay} C${ax},${ay + dy} ${bx},${by - dy} ${bx},${by}`;
}

/**
 * Lay the deployed services out around one gateway. The wide scene racks every
 * service vertically; the narrow scene follows a single lane so small screens
 * keep readable labels.
 */
export function buildWorld(services:WorldService[], narrow = false):World {
 const L = narrow ? NARROW : wide(Math.max(services.length, 1));
 const count = Math.max(services.length, 1);
 const step = narrow ? 0 : POD_STEP;
 const spine = narrow ? NARROW.gateway.y + NARROW.envoyDrop : L.gateway.y;
 const top = narrow ? spine : L.podTop;
 const curve = narrow ? vcurve : hcurve;
 const rackMiddle = narrow ? spine : L.podTop + (step * (count - 1)) / 2;
 const nodes:WorldNode[] = [
  {id:"browser", kind:"client", x:L.browser.x, y:rackMiddle, label:"BROWSER", caption:"You. The request starts here.", step:"browser"},
  {id:"web", kind:"edge", x:L.web.x, y:rackMiddle, label:"WEB POD", caption:"Next.js server attaches the bearer token.", step:"next", service:"web"},
  {id:"gateway", kind:"gateway", x:L.gateway.x, y:rackMiddle, label:"GATEWAY", caption:"Istio internal gateway. Routes, never authorizes.", step:"gateway"},
  {id:"authz", kind:"authz", x:L.authz.x, y:L.authz.y, label:"AUTHZ", caption:"Short for authorization: the service that decides yes or no, before your code runs.", step:"authz", service:"authz"},
  {id:"exchange", kind:"exchange", x:L.exchange.x, y:L.exchange.y, label:"EXCHANGE", caption:"RabbitMQ topic exchange. Producers publish here with routing key environment.service.stage.", step:"events", service:"rabbitmq"},
  {id:"queue", kind:"queue", x:L.queue.x, y:L.queue.y, label:"QUEUE", caption:"Durable queue bound with #. Messages wait here until the consumer takes them.", step:"events", service:"rabbitmq"},
  {id:"events", kind:"telemetry", x:L.events.x, y:L.events.y, label:"CONSUMER", caption:"The events service consumes the queue, acknowledges, and fans out.", step:"events", service:"events"},
  {id:"prometheus", kind:"tsdb", x:L.prometheus.x, y:L.prometheus.y, label:"PROMETHEUS", caption:"Pulls each sidecar's merged metrics every scrape interval. Nothing is pushed to it.", step:"events", service:"prometheus"},
  {id:"grafana", kind:"dashboard", x:L.grafana.x, y:L.grafana.y, label:"GRAFANA", caption:"Queries Prometheus and renders the provisioned dashboards.", step:"events", service:"grafana"},
 ];
 const edges:WorldEdge[] = [
  {id:"browser>web", from:"browser", to:"web", kind:"hop", d:curve(L.browser.x, narrow ? L.browser.y : rackMiddle, L.web.x, narrow ? L.web.y : rackMiddle), mtls:false},
  {id:"web>gateway", from:"web", to:"gateway", kind:"mtls", d:curve(L.web.x, narrow ? L.web.y : rackMiddle, L.gateway.x, narrow ? L.gateway.y : rackMiddle), mtls:true},
  {id:"authz>exchange", from:"authz", to:"exchange", kind:"telemetry", mtls:true,
   d:narrow
    ? vcurve(L.authz.x, L.authz.y, L.exchange.x, L.exchange.y)
    : `M${L.authz.x},${L.authz.y} C${L.authz.x + 230},${L.authz.y + 64} ${L.exchange.x - 230},${L.exchange.y + 64} ${L.exchange.x},${L.exchange.y}`},
  {id:"exchange>queue", from:"exchange", to:"queue", kind:"queue", d:curve(L.exchange.x, L.exchange.y, L.queue.x, L.queue.y), mtls:false},
  {id:"queue>events", from:"queue", to:"events", kind:"queue", d:curve(L.queue.x, L.queue.y, L.events.x, L.events.y), mtls:false},
  // Frames travel back the way the browser opened the socket: through the
  // gateway, through the Next.js bridge, into the page.
  // The web node sits at the middle of the rack, not at its own nominal y, so
  // the socket must land there or the consumed frame would stop short of it.
  {id:"events>web", from:"events", to:"web", kind:"telemetry", mtls:true,
   d:narrow
    ? `M${L.events.x},${L.events.y} C${L.events.x - 150},${L.events.y + 40} ${L.web.x - 40},${L.web.y + 150} ${L.web.x},${L.web.y}`
    : `M${L.events.x},${L.events.y} C${L.events.x},${L.events.y + 78} ${L.web.x},${rackMiddle + 150} ${L.web.x},${rackMiddle}`},
  {id:"web>browser:socket", from:"web", to:"browser", kind:"telemetry", mtls:false,
   d:narrow
    ? vcurve(L.web.x, L.web.y, L.browser.x, L.browser.y)
    : `M${L.web.x},${rackMiddle} C${L.web.x - 40},${rackMiddle + 46} ${L.browser.x + 40},${rackMiddle + 46} ${L.browser.x},${rackMiddle}`},
  {id:"prometheus>grafana", from:"prometheus", to:"grafana", kind:"scrape", d:curve(L.prometheus.x, L.prometheus.y, L.grafana.x, L.grafana.y), mtls:true},
 ];
 const lanes:Record<string,string> = {};
 const pods:(Frame & {service:string; accent:string})[] = [];
 services.forEach((service, index) => {
  const y = narrow ? spine : Math.round(top + step * index);
  const podY = narrow ? spine + NARROW.podDrop : y;
  nodes.push({id:`envoy:${service.id}`, kind:"envoy", x:L.envoyX, y, accent:accentFor(index), label:"ENVOY", caption:`A second container inside the ${service.id} pod. Nothing reaches the application without passing through it.`, step:"envoy", service:service.id});
  nodes.push({id:`pod:${service.id}`, kind:"pod", x:L.podX, y:podY, accent:accentFor(index), label:service.id.toUpperCase(), caption:`${service.id} handler code`, step:"handler", service:service.id, protocol:service.protocol, language:service.language});
  edges.push({id:`gateway>envoy:${service.id}`, from:"gateway", to:`envoy:${service.id}`, kind:"mtls", mtls:true, accent:accentFor(index),
   d:curve(L.gateway.x, narrow ? L.gateway.y : rackMiddle, L.envoyX, y, narrow ? 0.55 : 0.62)});
  edges.push({id:`envoy:${service.id}>pod:${service.id}`, from:`envoy:${service.id}`, to:`pod:${service.id}`, kind:"hop", mtls:false, accent:accentFor(index),
   d:`M${L.envoyX},${y} L${L.podX},${podY}`});
  edges.push({id:`envoy:${service.id}>authz`, from:`envoy:${service.id}`, to:"authz", kind:"branch", mtls:true,
   d:narrow
    ? `M${L.envoyX},${y} C${L.envoyX + 90},${y} ${L.authz.x},${L.authz.y - 60} ${L.authz.x},${L.authz.y}`
    : `M${L.envoyX},${y} C${L.envoyX - 96},${y + 86} ${L.authz.x + 118},${L.authz.y - 104} ${L.authz.x},${L.authz.y}`});
  edges.push({id:`pod:${service.id}>exchange`, from:`pod:${service.id}`, to:"exchange", kind:"telemetry", mtls:true,
   d:narrow
    ? `M${L.podX},${podY} C${L.podX + 120},${podY} ${L.exchange.x},${L.exchange.y - 60} ${L.exchange.x},${L.exchange.y}`
    : `M${L.podX},${podY} C${L.podX + 190},${podY} ${L.exchange.x},${podY + 92} ${L.exchange.x},${L.exchange.y}`});
  edges.push({id:`envoy:${service.id}>prometheus`, from:`envoy:${service.id}`, to:"prometheus", kind:"scrape", mtls:false,
   d:narrow
    ? `M${L.envoyX},${y} C${L.envoyX + 130},${y} ${L.prometheus.x},${L.prometheus.y + 70} ${L.prometheus.x},${L.prometheus.y}`
    : `M${L.envoyX},${y} C${L.envoyX - 150},${y - 70} ${L.prometheus.x + 200},${L.prometheus.y + 30} ${L.prometheus.x},${L.prometheus.y}`});
  if(!narrow){
   // One dashed boundary around the sidecar and the application container.
   pods.push({
    service:service.id, accent:accentFor(index),
    x:L.envoyX - POD_BOX.left, y:y - POD_BOX.up,
    width:(L.podX + POD_BOX.right) - (L.envoyX - POD_BOX.left),
    height:POD_BOX.up + POD_BOX.down,
   });
  }
  lanes[service.id] = `envoy:${service.id}`;
 });
 // The browser and its socket sit outside the cluster; everything else is in it.
 const inside = nodes.filter(node => node.id !== "browser");
 // Pod boundaries reach well past the node centres, so the frames are measured
 // from both: otherwise a dashed pod box climbs into the frame label band.
 const xs = [...inside.map(node => node.x), ...pods.map(pod => pod.x), ...pods.map(pod => pod.x + pod.width)];
 const ys = [...inside.map(node => node.y), ...pods.map(pod => pod.y), ...pods.map(pod => pod.y + pod.height)];
 // Room for the node's own shape and caption on every side…
 const pad = narrow ? 62 : 96;
 // …and a taller band at the top, which belongs to the frame label alone.
 const labelBand = narrow ? 42 : 58;
 const inset = narrow ? 30 : 54;
 const namespace:Frame = {
  x:Math.min(...xs) - pad,
  y:Math.min(...ys) - labelBand,
  width:Math.max(...xs) - Math.min(...xs) + pad * 2,
  height:Math.max(...ys) - Math.min(...ys) + labelBand + pad,
 };
 const cluster:Frame = {
  x:namespace.x - inset, y:namespace.y - inset,
  width:namespace.width + inset * 2, height:namespace.height + inset * 2,
 };
 return {
  width:Math.max(L.width, cluster.x + cluster.width + 24),
  height:Math.max(L.height, cluster.y + cluster.height + 24),
  nodes, edges, lanes, cluster, namespace, pods,
  laneY:L.authz.y, metricsY:L.prometheus.y,
 };
}

export type LegTone = "identity" | "probe" | "allow" | "deny" | "telemetry" | "consume" | "scrape" | "ghost";
export type Leg = {edge:string; reverse:boolean; ms:number; tone:LegTone; hold?:"decision"; land?:string};

/** The configured route a request takes, expressed as animation legs. */
export function outboundLegs(service:string):Leg[]{
 return [
  {edge:"browser>web", reverse:false, ms:420, tone:"identity", land:"web"},
  {edge:"web>gateway", reverse:false, ms:520, tone:"identity", land:"gateway"},
  {edge:`gateway>envoy:${service}`, reverse:false, ms:560, tone:"identity", land:`envoy:${service}`},
  {edge:`envoy:${service}>authz`, reverse:false, ms:420, tone:"probe", hold:"decision", land:"authz"},
 ];
}

export function decisionLegs(service:string, allowed:boolean):Leg[]{
 const tone:LegTone = allowed ? "allow" : "deny";
 const back:Leg[] = [
  {edge:`gateway>envoy:${service}`, reverse:true, ms:520, tone, land:"gateway"},
  {edge:"web>gateway", reverse:true, ms:480, tone, land:"web"},
  {edge:"browser>web", reverse:true, ms:400, tone, land:"browser"},
 ];
 if(!allowed) return [{edge:`envoy:${service}>authz`, reverse:true, ms:380, tone, land:`envoy:${service}`}, ...back];
 return [
  {edge:`envoy:${service}>authz`, reverse:true, ms:380, tone, land:`envoy:${service}`},
  {edge:`envoy:${service}>pod:${service}`, reverse:false, ms:300, tone, land:`pod:${service}`},
  {edge:`envoy:${service}>pod:${service}`, reverse:true, ms:300, tone, land:`envoy:${service}`},
  ...back,
 ];
}

/** Publish, route, wait in the queue, get consumed, reach the browser socket. */
/** Prometheus pulls: the mote travels from the workload to the collector. */
export function scrapeLegs(from:string):Leg[]{
 return [
  // The collector opens the connection: the GET travels to the sidecar first.
  {edge:`envoy:${from}>prometheus`, reverse:true, ms:520, tone:"scrape", land:`envoy:${from}`},
  // Then the sample set travels back and is stored.
  {edge:`envoy:${from}>prometheus`, reverse:false, ms:620, tone:"scrape", land:"prometheus"},
  {edge:"prometheus>grafana", reverse:false, ms:420, tone:"scrape", land:"grafana"},
 ];
}

export function telemetryLegs(from:string):Leg[]{
 return [
  {edge:from === "authz" ? "authz>exchange" : `pod:${from}>exchange`, reverse:false, ms:820, tone:"telemetry", land:"exchange"},
  {edge:"exchange>queue", reverse:false, ms:300, tone:"telemetry", land:"queue"},
  {edge:"queue>events", reverse:false, ms:420, tone:"consume", land:"events"},
  {edge:"events>web", reverse:false, ms:420, tone:"consume", land:"web"},
  {edge:"web>browser:socket", reverse:false, ms:360, tone:"consume", land:"browser"},
 ];
}
