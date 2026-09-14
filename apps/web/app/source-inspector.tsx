"use client";
import {tabKeyboard} from "./tab-keyboard";
import {useEffect, useRef, useState} from "react";
import {LockClosedIcon} from "@radix-ui/react-icons";
import type {Catalog, LearningService, Operation, SourceFile, Step} from "../lib/learning";
import type {Run} from "../lib/journey";
import {evidence, outcome} from "../lib/journey";
import LayersPanel from "./layers-panel";
import TechMark from "./tech-mark";
import {CLUSTER_TECH, TECH, serviceTech, techForNode} from "../lib/tech";

const IDENTITIES = [
 {id:"admin", label:"admin"},
 {id:"reader", label:"reader"},
 {id:"missing", label:"no token"},
 {id:"invalid", label:"invalid token"},
 {id:"custom", label:"custom token"},
];

// One highlighter for every language in the mesh: Go, TypeScript, JavaScript,
// Python, YAML and Dockerfiles all pass through the same source viewer.
const KEYWORDS = /^(func|return|const|let|var|if|else|elif|for|range|import|from|export|default|async|await|type|struct|interface|class|def|self|lambda|with|try|except|finally|raise|throw|new|function|package|go|defer|true|false|True|False|None|null|nil|undefined)$/;
const SPLIT = /("[^"\n]*"|'[^'\n]*'|`[^`\n]*`|\/\/.*$|#.*$|\b(?:func|return|const|let|var|if|else|elif|for|range|import|from|export|default|async|await|type|struct|interface|class|def|self|lambda|with|try|except|finally|raise|throw|new|function|package|go|defer|true|false|True|False|None|null|nil|undefined)\b)/g;
function tokens(text:string){
 return text.split(SPLIT).map((part,i)=><span key={i} className={part.startsWith('//')||part.startsWith('#')?'syntax-comment':/^['"`]/.test(part)?'syntax-string':KEYWORDS.test(part)?'syntax-keyword':''}>{part||' '}</span>);
}

export default function SourceInspector({catalog,service,step,run,operation,identity,focusNode,onRetry,onSelectStep}:{
 catalog:Catalog;
 service:LearningService;
 step?:Step;
 run?:Run;
 operation?:Operation;
 identity?:string;
 focusNode?:string;
 onRetry?:(identity:string) => void;
 onSelectStep?:(step:string) => void;
}){
 const [tab,setTab]=useState<'tech'|'explain'|'source'|'rendered'|'layers'>('tech');const [fileId,setFileId]=useState('');const [file,setFile]=useState<SourceFile>();const [resource,setResource]=useState('');const [error,setError]=useState('');const code=useRef<HTMLDivElement>(null);
 const refs=step?.sources??[];const evidenceState=evidence(step?.id??'',run);
 useEffect(()=>{setFileId(step?.sources[0]?.file??service.files[0]??'')},[step?.id,service.id]);
 useEffect(()=>{if(!fileId)return;const controller=new AbortController();setFile(undefined);setError('');fetch(`/api/learn/source?id=${encodeURIComponent(fileId)}`,{signal:controller.signal}).then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.error);setFile(data);setResource(previous=>data.rendered.some((r:{id:string})=>r.id===previous)?previous:data.rendered[0]?.id??'')}).catch(e=>{if(!controller.signal.aborted)setError(e.message)});return()=>controller.abort()},[fileId,catalog.revision]);
 const ref=refs.find(r=>r.file===fileId);const rendered=file?.rendered.find(r=>r.id===resource);const content=tab==='rendered'?rendered?.content:file?.content;const lines=tab==='rendered'?ref?.renderedLines?.[resource]:ref?.lines;
 useEffect(()=>{const container=code.current;const highlight=container?.querySelector('[data-highlight="true"]');if(container&&highlight)container.scrollTop+=highlight.getBoundingClientRect().top-container.getBoundingClientRect().top-container.clientHeight/2},[fileId,content,tab,lines]);
 const workload=service.id==='web'?catalog.webRevision:run?.events.findLast(e=>e.service===service.id&&e.sourceRevision)?.sourceRevision;
 const routing=service.steps.length?[
  {step:'gateway',kind:'VirtualService',name:`${service.id}-routes`,detail:`delegated from the general route on prefix ${operation?.path??'/'}`},
  {step:'gateway',kind:'DestinationRule',name:service.id,detail:'ISTIO_MUTUAL, so the caller’s sidecar originates mTLS'},
  {step:'envoy',kind:'AuthorizationPolicy',name:`${service.id}-from-gateway`,detail:'ALLOW, restricted to the gateway’s workload identity'},
  {step:'authz',kind:'AuthorizationPolicy',name:`${service.id}-external-authorization`,detail:`CUSTOM, calling provider study-authz-${catalog.environment}`},
 ]:[];
 return <aside className="inspector">
  <div className="inspector-heading">
   <span className="section-label">THE WHY BEHIND THE REQUEST</span>
   <h2>{step?.title??'Explore the source'}</h2>
   <div className="inspector-state">
    {step&&<span className={`evidence ${evidenceState.kind}`}>{evidenceState.label}</span>}
    {run&&<span className={`evidence ${run.result?.status===403?'denied':run.result?'observed':'waiting'}`}>{outcome(run)}</span>}
   </div>
   {onRetry&&!!operation&&<div className="retry-row">
    <span>Send the same call again as</span>
    <div className="retry-chips">
     {IDENTITIES.map(option=><button key={option.id} className={`retry-chip${identity===option.id?' current':''}`} onClick={()=>onRetry(option.id)}>{option.label}</button>)}
    </div>
   </div>}
  </div>
  <div className="tabbar" role="tablist" onKeyDown={tabKeyboard} aria-label="Learning inspector">{(['tech','explain','source','rendered','layers'] as const).map(t=><button key={t} role="tab" aria-selected={tab===t} onClick={()=>setTab(t)}>{t==='tech'?'Tech':t==='explain'?'Explain':t==='source'?'Source':t==='rendered'?'Rendered YAML':'Layers'}</button>)}</div>
  {tab==='tech'?<TechPanel catalog={catalog} service={service} focusNode={focusNode}/>
  :tab==='layers'?<LayersPanel service={service} environment={catalog.environment} workloadRevision={workload}/>
  :tab==='explain'?<div className="explanation"><p className="explain-lead">{step?.description??service.description}</p><details><summary>Go a little deeper</summary><p>{step?.detail??'This infrastructure application supports the request path. Browse its files to inspect deployment, runtime configuration, and implementation.'}</p></details>
   {routing.length>0&&<><h3>Routing and authorization</h3><ol className="routing-rows">{routing.map(row=><li key={`${row.kind}:${row.name}`}><button onClick={()=>onSelectStep?.(row.step)}><span className="routing-kind">{row.kind}</span><b>{row.name}</b><small>{row.detail}</small></button></li>)}</ol><p className="muted"><LockClosedIcon/> Both policies must pass, and the namespace denies everything else by default.</p></>}
   <h3>Responsible files</h3><div className="related-files">{refs.length?refs.map(r=><button key={r.file} onClick={()=>{setFileId(r.file);setTab('source')}}><span className="file-icon">{'{ }'}</span><span><b>{r.file.split('/').at(-1)}</b><small>{r.file}</small></span><span>↗</span></button>):<p>Select a file below to explore this service.</p>}</div>
   <h3>What you are looking at</h3><div className="provenance"><p><b>Workspace source</b><code>{catalog.revision}</code></p><p><b>Last configuration apply</b><span>{new Date(catalog.appliedAt).toLocaleString()} · {catalog.activeRevision.slice(0,8)}</span></p><p><b>Workload build</b><code>{workload??'Not observed yet'}</code></p></div>
   {workload&&workload!==service.sourceRevision&&<p className="notice">The running workload was built from a different source revision. These files show current workspace edits.</p>}
   <p className="muted">Source synchronization does not rebuild code. Rendered YAML is a sanitized preview from repository settings, not a live cluster read.</p>
  </div>:<div className="source-view"><label>File<select value={fileId} onChange={e=>setFileId(e.target.value)}>{[...new Set([...refs.map(r=>r.file),...service.files,fileId].filter(Boolean))].map(id=><option key={id} value={id}>{id}</option>)}</select></label>
   {tab==='rendered'&&file&&file.rendered.length>0&&<label>Resource<select value={resource} onChange={e=>setResource(e.target.value)}>{file.rendered.map(r=><option key={r.id}>{r.id}</option>)}</select></label>}
   {tab==='rendered'&&rendered?.contributors&&<details><summary>Contributing values, in merge order</summary>{rendered.contributors.map(id=><button className="contributor" key={id} onClick={()=>{setFileId(id);setTab('source')}}>{id}</button>)}<p className="muted">Local secrets are excluded. A command-line image tag can override these files during deployment.</p></details>}
   <p className="file-caption">{fileId}{lines?` · lines ${lines[0]}–${lines[1]}`:' · full file'}</p>
   {error?<p className="notice">{error}</p>:!file?<p>Loading source…</p>:tab==='rendered'&&!rendered?<div className="empty-small">This source file does not produce a public Kubernetes resource. Resolved Secrets are excluded.</div>:<div className="code-view" ref={code} tabIndex={0} aria-label="Source code with responsible lines highlighted">{content?.split('\n').map((line,i)=><div key={i} className="code-line" data-highlight={!!lines&&i+1>=lines[0]&&i+1<=lines[1]}><span className="line-number">{i+1}</span><code>{tokens(line)}</code></div>)}</div>}
   <p className="muted">{tab==='rendered'?'Rendered from non-secret defaults and selected environment overrides.':'Highlighted regions are resolved from source anchors on each refresh.'}</p>
  </div>}
  {catalog.diagnostics.length>0&&<p className="notice">{catalog.diagnostics.join("; ")}</p>}{tab==='explain'&&<details className="all-files"><summary>Browse all {service.files.length} service files</summary>{service.files.map(id=><button key={id} onClick={()=>{setFileId(id);setTab('source')}}>{id.replace(`apps/${service.id}/`,'')}</button>)}</details>}
 </aside>
}

/** The technology behind whatever is selected on the map, in plain language. */
function TechPanel({catalog,service,focusNode}:{catalog:Catalog;service:LearningService;focusNode?:string}){
 const node=focusNode?techForNode(focusNode):undefined;
 const tech=node??(focusNode==='cluster'?CLUSTER_TECH:TECH[service.id]??serviceTech(service,service.workload?.image));
 const platform=catalog.platform;
 return <div className="tech-panel">
  <div className="tech-head">
   <TechMark mark={tech.mark} size={40}/>
   <div><b>{tech.name}</b><small>{tech.stack}</small></div>
  </div>
  <p className="tech-tagline">{tech.tagline}</p>
  <h3>What it is</h3><p className="explain-lead">{tech.what}</p>
  <h3>What it does here</h3><p className="explain-lead">{tech.here}</p>
  <h3>Worth knowing</h3>
  <ul className="tech-facts">{tech.facts.map(fact=><li key={fact}>{fact}</li>)}</ul>
  {platform&&<><h3>This platform</h3><div className="provenance">
   <p><b>Kubernetes</b><code>{platform.kubernetes}</code></p>
   <p><b>Istio</b><code>{platform.istio}</code></p>
   <p><b>Cluster profile</b><code>{platform.cluster}</code></p>
   <p><b>Namespace</b><code>{catalog.environment}</code></p>
  </div></>}
  <p className="muted">Marks are simplified drawings, not official logos. Versions come from the repository's pinned settings.</p>
 </div>;
}
