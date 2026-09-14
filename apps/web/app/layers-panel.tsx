"use client";
import type {LearningService} from "../lib/learning";

/**
 * Where this service actually lives, from cluster down to container. Every row
 * is read from the rendered manifests. The node is deliberately absent: the
 * browser has no Kubernetes API access and must not invent one.
 */
export default function LayersPanel({service, environment, workloadRevision}:{
 service:LearningService; environment:string; workloadRevision?:string;
}){
 const workload = service.workload ?? {};
 const labels = workload.podLabels ?? {};
 const rows = [
  {level:0, kind:"Cluster", name:"mesh-study", detail:"Local Minikube profile. stg and prd are namespaces inside it, not separate clusters."},
  {level:1, kind:"Node", name:"not observed", detail:"Kubernetes schedules the pod. This page has no cluster API access, so it will not name a node.", muted:true},
  {level:2, kind:"Namespace", name:environment, detail:"STRICT mTLS and a default-deny AuthorizationPolicy apply to every workload here."},
  {level:3, kind:workload.kind ?? "Deployment", name:workload.name ?? service.id, detail:workload.replicas ? `${workload.replicas} replica${workload.replicas > 1 ? "s" : ""}, rolled only when the pod template changes` : "Managed by the environment's study release"},
  {level:4, kind:"Pod", name:Object.entries(labels).filter(([key]) => ["app", "version", "role"].includes(key)).map(([key, value]) => `${key}=${value}`).join(" ") || service.id, detail:"Sidecar injection is enabled for the namespace, so every pod runs two containers."},
  {level:5, kind:"Container", name:workload.container ?? service.id, detail:workload.image ?? "image selected in the environment values", image:true},
  {level:5, kind:"Sidecar", name:"istio-proxy", detail:"Injected by istiod. It terminates mTLS, applies the ALLOW and CUSTOM policies, and rewrites health probes."},
 ];
 return (
  <div className="layers-panel">
   <p className="explain-lead">Everything this service sits inside, from the local cluster down to the two containers in its pod.</p>
   <ol className="layer-stack">
    {rows.map(row => (
     <li key={`${row.kind}:${row.name}`} className={`layer level-${row.level}${row.muted ? " muted" : ""}`}>
      <span className="layer-kind">{row.kind}</span>
      <b className={row.image ? "layer-name mono" : "layer-name"}>{row.name}</b>
      <small>{row.detail}</small>
     </li>
    ))}
   </ol>
   <h3>Identity and ports</h3>
   <div className="provenance">
    <p><b>Workload identity</b><code>cluster.local/ns/{environment}/sa/{workload.serviceAccount ?? service.id}</code></p>
    {!!workload.ports?.length && <p><b>Container port</b><code>{workload.ports.join(", ")}</code></p>}
    {!!workload.servicePorts?.length && <p><b>Service port</b><code>{workload.servicePorts.map(port => `${port.port} ${port.name ?? ""}`.trim()).join(", ")}</code></p>}
    <p><b>Workload build</b><code>{workloadRevision ?? "Not observed yet"}</code></p>
   </div>
   <p className="muted">Rows come from the rendered manifests for this environment, not from a live cluster read. The build revision is reported by the running workload through its own telemetry.</p>
  </div>
 );
}
