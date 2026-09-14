// What each thing on the map actually is. Prose is written here; every version,
// image and identity shown alongside it comes from the deployed catalog.

export type MarkId =
 | "kubernetes" | "istio" | "envoy" | "nextjs" | "go" | "node" | "python"
 | "rabbitmq" | "prometheus" | "grafana" | "graphql" | "grpc" | "browser" | "socket"
 | "service";

export type Tech = {
 mark:MarkId;
 name:string;
 stack:string;
 tagline:string;
 /** What the technology is, independent of this repository. */
 what:string;
 /** What it does in this particular mesh. */
 here:string;
 /** Short, checkable statements. */
 facts:string[];
};

const ISTIO_SIDECAR:Tech = {
 mark:"envoy",
 name:"Envoy sidecar",
 stack:"Istio data plane · Envoy proxy",
 tagline:"A second container living inside the same pod",
 what:"Envoy is a network proxy. Istio starts one inside every pod, right next to your application container, and quietly reroutes the pod's networking so that nothing reaches your code without passing through it first. Your application still thinks it is listening on a plain port; in reality the proxy answers, checks, and only then hands the request over. That is what \"sidecar\" means: not a separate service you call, but an extra container attached to the one you wrote.",
 here:"This is where the request is actually allowed or refused. The sidecar terminates mutual TLS, checks the ALLOW policy on the caller's workload identity, then calls the shared authz service through Istio's CUSTOM external authorization. Only if both pass does the application container ever see the request.",
 facts:[
  "Every pod here runs two containers: your application, and this proxy.",
  "Both policies must pass: ALLOW on identity, CUSTOM on the credential.",
  "A refusal never reaches the handler, so no application code runs.",
  "It also serves the merged metrics Prometheus scrapes, on port 15020.",
 ],
};

export const TECH:Record<string, Tech> = {
 browser:{
  mark:"browser",
  name:"Your browser",
  stack:"Client",
  tagline:"Outside the cluster",
  what:"The only part of this study that is not running in Kubernetes.",
  here:"It picks an identity and an operation, creates a correlation ID, and calls the Next.js server. Bearer tokens stay in page memory and are never written to storage.",
  facts:["Reaches the cluster only through a loopback port-forward.", "Holds no cluster credentials of its own."],
 },
 web:{
  mark:"nextjs",
  name:"Next.js",
  stack:"TypeScript · React · Node.js",
  tagline:"The server that speaks for the browser",
  what:"A React framework that renders on the server and exposes its own HTTP API routes.",
  here:"Its server-side routes attach the caller's bearer token and forward the operation to the environment's internal gateway. It also bridges the browser's WebSocket to the event service. The browser never talks to the mesh directly.",
  facts:["Runs in the mesh with its own sidecar and workload identity.", "Reads demo tokens from a mounted Secret, never from the bundle."],
 },
 gateway:{
  mark:"istio",
  name:"Istio ingress gateway",
  stack:"Istio · Envoy proxy",
  tagline:"One door into the mesh",
  what:"Istio is a service mesh: it puts a proxy beside every workload and manages routing, identity, encryption and policy centrally, without changing application code. The gateway is a standalone Envoy that traffic enters through.",
  here:"It matches the request path against the general route, delegates to the route each app owns, and forwards to that service. It routes only — it never decides who is allowed in. Its listener requires an explicit SNI and mutual TLS.",
  facts:[
   "Service port 80 maps to its 8443 ISTIO_MUTUAL listener.",
   "One level of delegation: a general route index, then per-app routes.",
   "Authorization happens at the destination, not here.",
  ],
 },
 envoy:ISTIO_SIDECAR,
 authz:{
  mark:"go",
  name:"authz · the permission checker",
  stack:"Go · Istio CUSTOM external authorization",
  tagline:"Short for authorization: the one place that says yes or no",
  what:"\"Authz\" is just shorthand for authorization — deciding whether a caller may do a particular thing. Authentication asks who you are; authorization asks what you are allowed to do. This is a small service that answers only the second question. Istio can be told to phone an outside service before it lets any request through, and this is that service.",
  here:"Before any request reaches a business API, that API's sidecar pauses and asks this service: here is the credential, here is the method and path — yes or no? It answers from a list of identities and the paths each one may use, which is configuration, not code. The business services never see or parse a token: by the time a request arrives, permission was already settled here.",
  facts:[
   "It is called by the sidecars, never by your browser, and has no public route.",
   "Admin may read everything; reader is denied orders, payments and the gRPC quote.",
   "It is fail-closed: if it is unavailable the mesh answers 503 rather than letting traffic through.",
   "Changing who may call what is a policy edit, not a code change or a redeploy of the APIs.",
  ],
 },
 exchange:{
  mark:"rabbitmq",
  name:"RabbitMQ topic exchange",
  stack:"RabbitMQ · AMQP 0-9-1",
  tagline:"Where producers hand messages over",
  what:"A message broker. Producers publish to an exchange with a routing key and move on; the broker decides which queues receive a copy. Producer and consumer never wait for each other.",
  here:"Every API and the authz service publish telemetry here with the routing key environment.service.stage. Publishing is best effort: if the broker is down the events are dropped and the business request still succeeds.",
  facts:[
   "Topic exchange named mesh.events.",
   "AMQP is plain TCP, so the policy authorizes by workload identity and port only.",
   "No gateway route exists, so nothing outside the mesh can reach it.",
  ],
 },
 queue:{
  mark:"rabbitmq",
  name:"Durable queue",
  stack:"RabbitMQ",
  tagline:"Where messages wait to be read",
  what:"A queue bound to an exchange holds messages until a consumer takes and acknowledges them. Depth is the number waiting.",
  here:"The events service binds one queue per environment with the # wildcard and acknowledges only after fanning a message out to connected browsers, so nothing is lost mid-delivery.",
  facts:["Bound with # so it receives every routing key.", "Storage is an emptyDir: a restart starts from an empty queue on purpose."],
 },
 events:{
  mark:"socket",
  name:"Event service",
  stack:"Go · WebSocket",
  tagline:"The observation channel",
  what:"A small pub/sub service that consumes the queue and streams to subscribers over WebSocket.",
  here:"It is deliberately separate from the request path. It carries metadata only — never credentials, payloads or responses — and uses its own credentials, so changing the request identity cannot disconnect your observation. Frames travel back the way the browser opened the socket: through the gateway, through the Next.js bridge, into the page.",
  facts:[
   "Metadata only: no tokens, bodies or responses.",
   "Bounded replay ring of 200 events; slow clients lose events rather than blocking producers.",
   "The browser's WebSocket is authorized like any other route, with a CUSTOM check.",
  ],
 },
 prometheus:{
  mark:"prometheus",
  name:"Prometheus",
  stack:"Prometheus · time series database",
  tagline:"Metrics are pulled, never pushed",
  what:"A monitoring system that scrapes HTTP endpoints on an interval and stores the numbers as time series you can query with PromQL.",
  here:"It discovers one target per pod inside its own namespace and scrapes the Envoy sidecar on port 15020 — not the application port. Istio's metrics merge means that one endpoint already carries Envoy's own istio_* series together with whatever the application exposes on /metrics, so the collector makes one pull per pod, needs no credentials, and never crosses the authorization boundary.",
  facts:[
   "Namespace-scoped Role: it never reads another environment.",
   "The only workload in this study that mounts a service account token.",
   "The studio reads it server-side through a fixed query allowlist.",
  ],
 },
 grafana:{
  mark:"grafana",
  name:"Grafana",
  stack:"Grafana · dashboards",
  tagline:"The picture of those numbers",
  what:"A dashboard tool that queries data sources such as Prometheus and renders panels.",
  here:"Its Prometheus data source and its dashboard are provisioned from configuration, so the environment comes up with them already in place. There is no gateway route; reach it with a loopback port-forward.",
  facts:["Panels: handler throughput, mesh decisions by code, p95 latency, telemetry publish rate.", "Login is generated per environment into ignored local files."],
 },
};

const LANGUAGE:Record<string, {mark:MarkId; stack:string; runtime:string}> = {
 go:{mark:"go", stack:"Go", runtime:"a compiled Go binary in a scratch image"},
 javascript:{mark:"node", stack:"Node.js", runtime:"the Node.js runtime with no web framework"},
 python:{mark:"python", stack:"Python", runtime:"Python's standard library HTTP server"},
 typescript:{mark:"nextjs", stack:"TypeScript", runtime:"Next.js"},
};

/**
 * A language this page has no card for yet. Saying nothing is correct; claiming
 * it is Go, as an unguarded lookup would, is not. Add it to LANGUAGE above to
 * give it a mark and a described runtime.
 */
function unknownLanguage(declared:string){
 const label = declared ? declared[0].toUpperCase() + declared.slice(1) : "Unidentified";
 return {
  mark:"service" as MarkId,
  stack:label,
  runtime:declared ? `whatever its own image provides — ${declared} is declared in the catalog but not described here yet` : "whatever its own image provides",
 };
}

const PROTOCOL:Record<string, {mark:MarkId; name:string; what:string}> = {
 graphql:{mark:"graphql", name:"GraphQL", what:"One endpoint where the caller describes the shape of the data it wants, instead of many fixed URLs."},
 grpc:{mark:"grpc", name:"gRPC", what:"Remote procedure calls over HTTP/2 with Protobuf messages, defined by a .proto contract shared by both sides."},
 rest:{mark:"go", name:"REST", what:"Plain HTTP verbs against resource paths, returning JSON."},
};

/** The card for a business service: its language, its protocol, its policy. */
export function serviceTech(service:{id:string; title:string; language?:string; protocol:string}, image?:string):Tech{
 const declared = service.language ?? "";
 const known = LANGUAGE[declared];
 const language = known ?? unknownLanguage(declared);
 const protocol = PROTOCOL[service.protocol] ?? PROTOCOL.rest;
 return {
  mark:service.protocol === "rest" ? language.mark : protocol.mark,
  name:service.title,
  stack:`${language.stack} · ${protocol.name}`,
  tagline:known
   ? `A ${language.stack} service behind the same policy as every other`
   : `A service behind the same policy as every other, in a language this page cannot describe yet`,
  what:`${protocol.what} This one runs on ${language.runtime}.`,
  here:"It answers business questions and nothing else. Authorization already happened in its sidecar, so the handler contains no token parsing and no permission checks. It publishes telemetry to the broker and exposes its own counters for Prometheus.",
  facts:[
   image ? `Image ${image}` : "Image selected per environment",
   "Same event shape and metric names as every other language in the mesh.",
   "Reachable only through the gateway: a direct call is refused.",
  ],
 };
}

export const CLUSTER_TECH:Tech = {
 mark:"kubernetes",
 name:"Kubernetes",
 stack:"Minikube · local profile",
 tagline:"What everything else runs on",
 what:"Kubernetes runs containers across machines, keeps the declared number alive, gives them stable network names, and injects their configuration. A Deployment describes the desired pods; a Service gives them one address; a Namespace groups and isolates them.",
 here:"Both environments in this study are namespaces inside one local Minikube profile. stg and prd are separated by namespace, credentials and policy — not by cluster.",
 facts:[
  "Helm renders every manifest; each app owns its own chart.",
  "Sidecar injection is enabled per namespace, so every pod runs two containers.",
  "prd here is a production simulation, not a remote cluster.",
 ],
};

/** Resolve a world node to the right card. */
export function techForNode(nodeId:string):Tech|undefined{
 if(nodeId.startsWith("envoy:")) return TECH.envoy;
 if(nodeId.startsWith("pod:")) return undefined;
 return TECH[nodeId];
}
