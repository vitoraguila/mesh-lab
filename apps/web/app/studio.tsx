"use client";
import {useEffect, useMemo, useRef, useState} from "react";
import {ActivityLogIcon, ArrowRightIcon, CheckCircledIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, CodeIcon, CopyIcon, EyeNoneIcon, EyeOpenIcon, LayersIcon, LockClosedIcon, MagnifyingGlassIcon, PlayIcon, ReaderIcon, RocketIcon, StackIcon} from "@radix-ui/react-icons";
import type {Catalog, LearningService, Operation} from "../lib/learning";
import type {MeshEvent} from "../lib/types";
import {mergeEvents, type Run} from "../lib/journey";
import {useCatalog, useEvents, useMetrics} from "./use-learning";
import {tabKeyboard} from "./tab-keyboard";
import MeshWorld from "./mesh-world";
import OperationForm from "./operation-form";
import JourneyView from "./journey-view";
import SourceInspector from "./source-inspector";

const LANGUAGE_TAG:Record<string,string> = {go:"Go", javascript:"Node.js", typescript:"TypeScript", python:"Python"};

export default function Studio(){
 const {catalog, error:catalogError} = useCatalog();
 const [serviceId, setServiceId] = useState("");
 const [operationId, setOperationId] = useState("");
 const [input, setInput] = useState<Record<string, unknown>>({});
 const [identity, setIdentity] = useState("reader");
 const [observer, setObserver] = useState("");
 const [observerRole, setObserverRole] = useState("reader");
 const [custom, setCustom] = useState("");
 const [observerCustom, setObserverCustom] = useState("");
 const [observerNonce, setObserverNonce] = useState(0);
 const [envOpen, setEnvOpen] = useState(false);
 const stageRef = useRef<HTMLElement>(null);
 const dockRef = useRef<HTMLDivElement>(null);
 const [dockOpen, setDockOpen] = useState(false);
 const [reveal, setReveal] = useState(false);
 const [message, setMessage] = useState("");
 const [observerNote, setObserverNote] = useState("");
 const [runs, setRuns] = useState<Run[]>([]);
 const [runId, setRunId] = useState("");
 const [stepId, setStepId] = useState("browser");
 const [search, setSearch] = useState("");
 const [mobile, setMobile] = useState("request");
 const [responseTab, setResponseTab] = useState("response");
 const [focusNode, setFocusNode] = useState("");
 const [panel, setPanel] = useState<"console" | "inspect" | "">("");
 const [dockCollapsed, setDockCollapsed] = useState(false);
 const [logOpen, setLogOpen] = useState(false);
 // Services the user has hidden. Hiding is a view filter only: nothing is
 // undeployed, and the map, the send panel and "run all" simply stop offering it.
 const [hidden, setHidden] = useState<string[]>([]);

 const {events, connection, broker} = useEvents(observer, observerNonce);
 const metrics = useMetrics();
 const shown = (catalog?.services ?? []).filter(item => !hidden.includes(item.id));
 const service = shown.find(item => item.id === serviceId)
  ?? shown.find(item => item.operations.length > 0)
  ?? shown[0]
  ?? catalog?.services[0];
 const operation = service?.operations.find(item => item.id === operationId) ?? service?.operations[0];
 const selectedRun = runs.find(run => run.id === runId && run.service === service?.id);
 const busy = runs.some(run => !run.result && !run.error);
 const active = !!service && !!operation && !!catalog?.activeOperations[service.id]?.includes(operation.id);

 const worldServices = useMemo(
  () => (catalog?.services ?? [])
   .filter(item => item.operations.length > 0 && !hidden.includes(item.id))
   .map(item => ({id:item.id, protocol:item.protocol, title:item.title, language:item.language})),
  [catalog?.services, hidden],
 );

 useEffect(() => {if(operation){setInput(operation.input); setOperationId(operation.id)}}, [service?.id, operation?.id]);

 // Reserve exactly as much room as the floating toolbar needs, so no node on
 // the map can end up hidden behind it.
 useEffect(() => {
  const stage = stageRef.current;
  const dock = dockRef.current;
  if(!stage) return;
  if(!dock){stage.style.removeProperty("--chrome-h"); return}
  const measure = () => stage.style.setProperty("--chrome-h", `${Math.ceil(dock.getBoundingClientRect().height) + 26}px`);
  measure();
  const observer = new ResizeObserver(measure);
  observer.observe(dock);
  return () => observer.disconnect();
 }, [dockOpen, catalog?.revision]);
 useEffect(() => {
  if(!events.length) return;
  setRuns(previous => previous.map(run => {
   const incoming = events.filter(event => event.requestId === run.id);
   return incoming.length ? {...run, events:mergeEvents(run.events, incoming)} : run;
  }));
 }, [events]);


 async function getToken(role:string){
  const response = await fetch("/api/demo-token", {method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({role})});
  const data = await response.json();
  if(!response.ok) throw Error(data.error);
  return data.token as string;
 }

 async function connectObserver(){
  try{
   const token = observerRole === "custom" ? observerCustom : await getToken(observerRole);
   if(!token) throw Error("Enter a token first");
   setObserver(token);
   // Bump the generation so pressing connect twice really reconnects.
   setObserverNonce(value => value + 1);
   setObserverNote(`Connected as ${observerRole === "custom" ? "a custom token" : `demo ${observerRole}`}.`);
  }catch(error){setObserverNote(error instanceof Error ? error.message : "Could not connect")}
 }

 async function runOperation(target = service, op = operation, focus = true, asIdentity = ""){
  const role = asIdentity || identity;
  if(asIdentity && asIdentity !== identity) setIdentity(asIdentity);
  if(!target || !op || !catalog?.activeOperations[target.id]?.includes(op.id)) return;
  // Only the operation currently open in the console uses the edited input.
  const edited = focus && target.id === service?.id && op.id === operation?.id;
  let requestInput:Record<string, unknown> = edited ? {...input} : {...op.input};
  try{
   if(op.protocol === "graphql" && typeof requestInput.variables === "string") requestInput.variables = JSON.parse(requestInput.variables);
   if(op.protocol === "rest" && op.method === "POST" && typeof requestInput.json === "string") requestInput = JSON.parse(requestInput.json);
  }catch{setMessage("Request input must contain valid JSON."); return}
  const id = crypto.randomUUID();
  const run:Run = {id, service:target.id, operation:op.id, input:requestInput, identity:role, startedAt:new Date().toISOString(), events:[]};
  setRuns(previous => [run, ...previous].slice(0, 50));
  if(focus){setRunId(id); setStepId("browser")}
  setMessage("");
  try{
   const token = role === "missing" ? "" : role === "invalid" ? "invalid-demo-token" : role === "custom" ? custom : await getToken(role);
   if(!observer){
    try{setObserver(await getToken("reader")); setObserverRole("reader")}catch{/* Observation is optional; dispatch still proceeds. */}
   }
   const response = await fetch("/api/playground", {
    method:"POST",
    headers:{"Content-Type":"application/json", ...(token ? {Authorization:`Bearer ${token}`} : {})},
    body:JSON.stringify({service:target.id, operation:op.id, input:requestInput, requestId:id}),
   });
   const data = await response.json();
   if(!response.ok) throw Error(data.error);
   setRuns(previous => previous.map(item => (item.id === id ? {...item, result:data} : item)));
  }catch(error){
   const failure = error instanceof Error ? error.message : "Request failed";
   setRuns(previous => previous.map(item => (item.id === id ? {...item, error:failure} : item)));
   if(focus) setMessage(failure);
  }
 }

 function chooseService(id:string){
  setServiceId(id);
  setFocusNode("");
  setOperationId("");
  setRunId("");
  setStepId("browser");
 }

 function inspectRun(run:Run){
  setServiceId(run.service);
  setOperationId(run.operation);
  setRunId(run.id);
  setStepId("response");
 }


 if(!catalog || !service) return (
  <main className="loading-studio">
   <span className="boot-mark"><LayersIcon/></span>
   <h1>Mesh Lab</h1>
   <p>{catalogError || "Preparing the mesh lab…"}</p>
   <div className="boot-bar"><i/></div>
  </main>
 );

 const liveLabel = connection === "Live" ? "Events live" : connection === "Choose a demo identity" ? "Telemetry idle" : connection;

 return (
  <div className="studio-shell">
   <a className="skip-link" href="#workspace">Skip to workspace</a>
   <div className="sky" aria-hidden="true"/>

   <header className="hud">
    <a className="brand" href="/" aria-label="Mesh Lab home">
     <span className="brand-mark"><LayersIcon/></span>
     <b>mesh lab<span>{catalog.environment} · {catalog.services.length} services</span></b>
    </a>
    <span className="hud-spacer"/>
    <span className={`live-chip ${connection === "Live" ? "live" : ""}`} role="status"><i/>{liveLabel}</span>
    <div className="env-switch">
     <button className="env-chip" onClick={() => setEnvOpen(!envOpen)} aria-expanded={envOpen}>
      <i/>{catalog.environment.toUpperCase()}<small>local</small><ChevronDownIcon/>
     </button>
     {envOpen && (
      <div className="env-menu" role="dialog" aria-label="Environments">
       <p>Each environment is its own namespace, with its own credentials, policy and gateway. They are deliberately unreachable from one another, so this page cannot call the other one — open its own deployment instead.</p>
       {["stg", "prd"].map(name => (
        <a
         key={name}
         className={name === catalog.environment ? "current" : ""}
         href={name === catalog.environment ? undefined : `http://localhost:${name === "prd" ? 3001 : 3000}`}
         target="_blank"
         rel="noreferrer"
        >
         <b>{name.toUpperCase()}</b>
         <small>{name === catalog.environment ? "You are here" : `make port-forward ENV=${name}`}</small>
        </a>
       ))}
       <p className="muted">The link opens the port that <code>make port-forward</code> uses by default. Start it first, or use the port it printed.</p>
      </div>
     )}
    </div>
   </header>

   <div className={`cockpit${dockCollapsed ? " dock-hidden" : ""}`}>
    {dockCollapsed && (
     <button className="dock-restore" onClick={() => setDockCollapsed(false)}>
      <ChevronRightIcon/><span>Services</span>
     </button>
    )}
    <aside className={`service-dock${dockCollapsed ? " collapsed" : ""}`}>
     <div className="dock-title">
      <h2>Services</h2>
      <span>{hidden.length ? `${shown.length}/${catalog.services.length}` : catalog.services.length}</span>
      {hidden.length > 0 && <button className="text-button" onClick={() => setHidden([])}>Show all</button>}
      <button className="dock-collapse" onClick={() => setDockCollapsed(true)} aria-label="Hide the service list"><ChevronLeftIcon/></button>
     </div>
     <label className="search"><MagnifyingGlassIcon/><input aria-label="Search services" placeholder="Find a service…" value={search} onChange={event => setSearch(event.target.value)}/></label>
     <div className="dock-scroll">
      {(["rest", "graphql", "grpc", "infrastructure"] as const).map(protocol => {
       const list = catalog.services.filter(item => item.protocol === protocol && `${item.id} ${item.title}`.toLowerCase().includes(search.toLowerCase()));
       if(!list.length) return null;
       return (
        <div className="dock-group" key={protocol}>
         <h3>{protocol === "infrastructure" ? "Infrastructure" : protocol === "rest" ? "REST APIs" : protocol === "grpc" ? "gRPC" : "GraphQL"}</h3>
         {list.map(item => {
          const pulse = events.filter(event => event.service === item.id).length;
          const off = hidden.includes(item.id);
          return (
           <div key={item.id} className={`dock-row${off ? " off" : ""}`}>
            <button className={`dock-item ${service.id === item.id && !off ? "active" : ""}`} onClick={() => {if(off) setHidden(previous => previous.filter(id => id !== item.id)); chooseService(item.id)}}>
             <span className="dock-symbol">{protocol === "infrastructure" ? <StackIcon/> : <CodeIcon/>}</span>
             <span className="dock-copy">
              <b>{item.title}</b>
              <small>
               {item.language && <i className={`lang lang-${item.language}`}>{LANGUAGE_TAG[item.language] ?? item.language}</i>}
               {off ? "Hidden from the map" : item.operations.length ? `${item.operations.length} operation${item.operations.length > 1 ? "s" : ""}` : "Source & configuration"}
              </small>
             </span>
             <span className={`dock-pulse ${pulse && !off ? "hot" : ""}`} aria-hidden="true"/>
             <ChevronRightIcon/>
            </button>
            <button
             className="dock-eye"
             aria-pressed={off}
             aria-label={`${off ? "Show" : "Hide"} ${item.id}`}
             title={off ? `Show ${item.id} on the map` : `Hide ${item.id} from the map and the send panel`}
             onClick={() => setHidden(previous => (off ? previous.filter(id => id !== item.id) : [...previous, item.id]))}
            >
             {off ? <EyeNoneIcon/> : <EyeOpenIcon/>}
            </button>
           </div>
          );
         })}
        </div>
       );
      })}
     </div>
     <details className="observer-panel">
      <summary><ActivityLogIcon/>Observation channel</summary>
      <p>The observer keeps its own credentials, so changing the request identity never drops your telemetry.</p>
      <label>Observe as
       <select value={observerRole} onChange={event => setObserverRole(event.target.value)}>
        <option value="reader">Demo reader</option>
        <option value="admin">Demo admin</option>
        <option value="custom">Custom token</option>
       </select>
      </label>
      {observerRole === "custom" && <label>Observer token<input type="password" autoComplete="off" value={observerCustom} onChange={event => setObserverCustom(event.target.value)}/></label>}
      <button className="subtle" onClick={connectObserver}>Connect observer</button>
      <p className={`observer-state ${connection === "Live" ? "live" : ""}`} role="status">
       <i/>{connection === "Live" ? "Live" : connection}{observerNote ? ` · ${observerNote}` : ""}
      </p>
     </details>
    </aside>

    {(
     <main
      ref={stageRef}
      id="workspace"
      className={`stage mobile-${mobile}${panel ? " panel-open" : ""}${dockOpen ? " send-open" : ""}`}
     >
      <div className="stage-world">
       <MeshWorld
        services={worldServices}
        selected={service.id}
        runs={runs}
        focusRun={selectedRun}
        events={events}
        broker={broker}
        metrics={metrics}
        activeStep={stepId}
        environment={catalog.environment}
        onSelectService={chooseService}
        onSelectStep={setStepId}
        onFocusNode={node => {setFocusNode(node); setPanel("inspect")}}
       />
      </div>

      <nav className="panel-bar" aria-label="Workspace panels">
       <button className={`panel-console${panel === "console" ? " active" : ""}`} onClick={() => setPanel(panel === "console" ? "" : "console")} aria-pressed={panel === "console"}>
        <ReaderIcon/>{panel === "console" ? "Hide console" : "Console"}
       </button>
       <button className={`panel-inspect${panel === "inspect" ? " active" : ""}`} onClick={() => setPanel(panel === "inspect" ? "" : "inspect")} aria-pressed={panel === "inspect"}>
        <CodeIcon/>{panel === "inspect" ? "Hide inspector" : "Inspector"}
       </button>
      </nav>

      <div className="send-dock" ref={dockRef}>
       <button className={`dock-toggle${dockOpen ? " active" : ""}`} onClick={() => setDockOpen(!dockOpen)} aria-expanded={dockOpen}>
        <RocketIcon/>{dockOpen ? "Hide send" : "Send"}
       </button>
      </div>

      {dockOpen && <LaunchPad
       catalog={catalog}
       identity={identity}
       busy={busy}
       selected={service.id}
       services={shown}
       onIdentity={setIdentity}
       onClose={() => setDockOpen(false)}
       onTrigger={(target, op) => {
        setServiceId(target.id);
        setOperationId(op.id);
        void runOperation(target, op, true);
       }}
      />}

      <div className="mobile-tabs" role="tablist" onKeyDown={tabKeyboard} aria-label="Mobile workspace">
       {["request", "journey", "explain"].map(tab => (
        <button key={tab} role="tab" aria-selected={mobile === tab} onClick={() => setMobile(tab)}>{tab}</button>
       ))}
      </div>

      <aside className={`side-panel${panel ? " open" : ""}`} aria-label="Workspace panels">
       <div className="side-tabs" role="tablist" onKeyDown={tabKeyboard} aria-label="Workspace panel">
        <button role="tab" aria-selected={panel === "console"} onClick={() => setPanel("console")}>Console</button>
        <button role="tab" aria-selected={panel === "inspect"} onClick={() => setPanel("inspect")}>Inspect</button>
        <button className="side-close" onClick={() => setPanel("")} aria-label="Close panel">✕</button>
       </div>
       <section className={`sheet${panel === "console" ? "" : " hidden"}`} aria-label="Request console">
       <div className="sheet-grip">
        <div className="sheet-heading">
         <span className="eyebrow">Target · {service.protocol === "infrastructure" ? "Infrastructure" : service.protocol.toUpperCase()}</span>
         <h1>{service.title}</h1>
        </div>
       </div>

       <div className="sheet-body">
        <div className="sheet-col console">
         <section className="request-section">
          <IdentityExplainer identity={identity}/>
          {operation ? (
           <>
            {service.operations.length > 1 && (
             <label>Operation
              <select value={operationId} onChange={event => setOperationId(event.target.value)}>
               {service.operations.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}
              </select>
             </label>
            )}
            <OperationForm
             operation={operation}
             input={input}
             onInput={setInput}
             identity={identity}
             onIdentity={setIdentity}
             busy={!!selectedRun && !selectedRun.result && !selectedRun.error}
             disabled={!active}
             onRun={() => void runOperation()}
            />
            {!active && <p className="notice">This operation is described in workspace source but not activated. Deploy the environment to enable it.</p>}
           </>
          ) : (
           <div className="infrastructure-intro">
            <StackIcon/>
            <h2>Support structure</h2>
            <p>This service carries the request path rather than answering it. Open its files in the inspector, or pick a business API to send something real.</p>
           </div>
          )}
          <details className="token-settings">
           <summary><LockClosedIcon/>Token tools and custom credentials</summary>
           <p>These are open local demo identities, not a login. Tokens stay in page memory.</p>
           <label>Custom bearer token<input type={reveal ? "text" : "password"} autoComplete="off" value={custom} onChange={event => setCustom(event.target.value)}/></label>
           <div className="button-row">
            <button className="subtle" onClick={async () => {try{setCustom(await getToken("admin")); setIdentity("custom"); setMessage("Admin token loaded.")}catch(error){setMessage(String(error))}}}>Get admin token</button>
            <button className="subtle" onClick={async () => {try{setCustom(await getToken("reader")); setIdentity("custom"); setMessage("Reader token loaded.")}catch(error){setMessage(String(error))}}}>Get reader token</button>
            <button className="subtle" disabled={!custom} onClick={() => navigator.clipboard.writeText(custom).then(() => setMessage("Token copied.")).catch(() => setMessage("Clipboard unavailable."))}><CopyIcon/>Copy</button>
            <button className="subtle" disabled={!custom} onClick={() => setReveal(!reveal)}>{reveal ? "Hide token" : "Reveal token"}</button>
           </div>
          </details>
          <div className="status-message" role="status">{message}</div>
         </section>
        </div>

        <div className="sheet-col activity">
         {service.steps.length > 0 && (
          <div className="journey-section">
           <JourneyView service={service} run={selectedRun} selected={stepId} onSelect={setStepId}/>
          </div>
         )}

         <div className="response-section">
          <div className="section-heading">
           <h2>Flight log</h2>
           <div className="button-row">
            <button className="text-button" disabled={!runs.length} onClick={() => setLogOpen(true)}>View all ({runs.length})</button>
            <button className="text-button" disabled={busy} onClick={() => {
             shown.forEach(item => item.operations
              .filter(op => catalog.activeOperations[item.id]?.includes(op.id))
              .forEach(op => void runOperation(item, op, false)));
            }}><PlayIcon/>Run all services</button>
           </div>
          </div>
          <div className="run-history">
           {runs.length ? runs.map(run => (
            <button key={run.id} className={selectedRun?.id === run.id ? "selected" : ""} onClick={() => inspectRun(run)}>
             <span className={run.result?.status === 403 ? "bad" : ""}>{run.result?.status ?? (run.error ? "ERR" : "…")}</span>
             <b>{run.service}</b>
             <small>{run.identity} · {run.id.slice(0, 8)}</small>
            </button>
           )) : <p className="empty-small">Nothing launched yet. Trigger a service above.</p>}
          </div>
          {selectedRun && (
           <>
            <div className="tabbar" role="tablist" onKeyDown={tabKeyboard} aria-label="Request detail">
             {["response", "request", "events"].map(tab => (
              <button key={tab} role="tab" aria-selected={responseTab === tab} onClick={() => setResponseTab(tab)}>
               {tab === "events" ? `Events (${selectedRun.events.length})` : tab}
              </button>
             ))}
            </div>
            {responseTab === "events" ? (
             <div className="notebook-events">
              {selectedRun.events.length ? selectedRun.events.map((event, index) => (
               <button key={event.eventId ?? index} onClick={() => setStepId(event.service === "authz" ? "authz" : "handler")}>
                <b>{event.service}</b>
                <span className={event.stage === "denied" ? "bad" : ""}>{event.stage}</span>
                {event.transport === "amqp" && <em className="via">via {event.queue ?? "queue"}</em>}
                <time>{new Date(event.time).toLocaleTimeString()}</time>
               </button>
              )) : <p className="empty-small">No correlated telemetry observed. The response below can still be valid when events are unavailable.</p>}
             </div>
            ) : (
             <pre className="response-code">{JSON.stringify(responseTab === "request" ? {
              requestId:selectedRun.id,
              identity:selectedRun.identity,
              headers:{authorization:selectedRun.identity === "missing" ? "Not sent" : "Bearer [REDACTED]", "x-mesh-request-id":selectedRun.id},
              input:selectedRun.input,
             } : selectedRun.result ?? {error:selectedRun.error ?? "Waiting for response…"}, null, 2)}</pre>
            )}
           </>
          )}
         </div>
        </div>
       </div>
      </section>

      <div className={`inspect-drawer${panel === "inspect" ? "" : " hidden"}`}>
       <div className="desktop-inspector">
        <SourceInspector
         catalog={catalog}
         service={service}
         step={service.steps.find(item => item.id === stepId)}
         run={selectedRun}
         operation={operation}
         identity={identity}
         focusNode={focusNode}
         onRetry={role => {if(operation) void runOperation(service, operation, true, role)}}
         onSelectStep={setStepId}
        />
       </div>
      </div>
      </aside>

      {logOpen && (
       <div className="log-modal" role="dialog" aria-modal="true" aria-label="Full flight log">
        <div className="log-modal-card">
         <div className="section-heading">
          <div><h2>Flight log</h2><p>{runs.length} request{runs.length === 1 ? "" : "s"} held in page memory, newest first. Nothing is stored.</p></div>
          <button className="subtle" onClick={() => setLogOpen(false)}>Close</button>
         </div>
         <ol className="log-rows">
          {runs.map(run => (
           <li key={run.id}>
            <button className={selectedRun?.id === run.id ? "selected" : ""} onClick={() => {inspectRun(run); setLogOpen(false); setPanel("console")}}>
             <span className={`log-status ${run.result?.status === 403 ? "bad" : run.result && run.result.status >= 400 ? "warn" : ""}`}>{run.result?.status ?? (run.error ? "ERR" : "…")}</span>
             <b>{run.service}</b>
             <em>{run.operation}</em>
             <span className="log-identity">{run.identity}</span>
             <time>{new Date(run.startedAt).toLocaleTimeString()}</time>
             <code>{run.id.slice(0, 8)}</code>
            </button>
           </li>
          ))}
         </ol>
        </div>
       </div>
      )}

      <div className="mobile-inspector">
       <SourceInspector
        catalog={catalog}
        service={service}
        step={service.steps.find(item => item.id === stepId)}
        run={selectedRun}
        operation={operation}
        identity={identity}
        focusNode={focusNode}
        onRetry={role => {if(operation) void runOperation(service, operation, true, role)}}
        onSelectStep={setStepId}
       />
      </div>
     </main>
    )}
   </div>

   <footer className="studio-footer">
    <span><CheckCircledIcon/>Local learning environment · mesh-study</span>
    <span>Source {catalog.revision.slice(0, 8)} · {catalogError ? "Refresh unavailable" : `synced ${new Date(catalog.generatedAt).toLocaleTimeString()}`}</span>
   </footer>
  </div>
 );
}

const IDENTITY_CHOICES = [
 {id:"admin", label:"admin", note:"Every registered path is allowed."},
 {id:"reader", label:"reader", note:"Orders, payments and the gRPC quote are refused."},
 {id:"missing", label:"no token", note:"No Authorization header is sent at all."},
 {id:"invalid", label:"invalid token", note:"A bearer token that matches no identity."},
 {id:"custom", label:"custom token", note:"Uses the token typed in the console's token tools."},
];

function LaunchPad({catalog, identity, busy, selected, services, onIdentity, onClose, onTrigger}:{
 catalog:Catalog; identity:string; busy:boolean; selected:string; services:LearningService[];
 onIdentity:(identity:string) => void;
 onClose:() => void;
 onTrigger:(service:LearningService, operation:Operation) => void;
}){
 const triggers = services.flatMap(item => item.operations
  .filter(operation => catalog.activeOperations[item.id]?.includes(operation.id))
  .map(operation => ({service:item, operation})));
 if(!triggers.length) return null;
 const chosen = IDENTITY_CHOICES.find(option => option.id === identity);
 return (
  <aside className="send-panel" aria-label="Service triggers">
   <div className="launchpad-head">
    <span className="eyebrow"><RocketIcon/>Send</span>
    <button className="side-close" onClick={onClose} aria-label="Close the send panel">✕</button>
   </div>

   <div className="launchpad-scroll">
    <h3>Send as</h3>
    <div className="send-identities">
     {IDENTITY_CHOICES.map(option => (
      <button key={option.id} className={`send-identity${identity === option.id ? " current" : ""}`} aria-pressed={identity === option.id} onClick={() => onIdentity(option.id)}>{option.label}</button>
     ))}
    </div>
    <p className="send-note">{chosen?.note ?? "Pick the credential this request carries."}</p>

    <h3>Then call</h3>
    <div className="launch-row">
     {triggers.map(({service, operation}) => (
      <button
       key={`${service.id}:${operation.id}`}
       className={`launch-chip${selected === service.id ? " active" : ""}`}
       disabled={busy}
       onClick={() => onTrigger(service, operation)}
      >
       <span className={`method ${operation.protocol}`}>{operation.protocol === "grpc" ? "RPC" : operation.method}</span>
       <span className="launch-copy"><b>{service.id}</b><small>{operation.path}</small></span>
      </button>
     ))}
    </div>
    <p className="send-note muted">Every call leaves as the identity above. Watch the map: the parcel stops at the sidecar until authz answers.</p>
   </div>
  </aside>
 );
}

function IdentityExplainer({identity}:{identity:string}){
 const supplied = identity === "missing" ? "No bearer token"
  : identity === "invalid" ? "Invalid token"
  : identity === "custom" ? "Custom bearer token"
  : `Demo ${identity} token`;
 const source = identity === "missing" ? "The request deliberately sends no Authorization header."
  : identity === "invalid" ? "The request sends an intentionally invalid bearer token."
  : identity === "custom" ? "The bearer token comes from the custom token field below."
  : "When you run, Next.js reads this local demo token from the mounted web Secret through /api/demo-token.";
 return (
  <aside className="identity-explainer" aria-label="Where the bearer token comes from">
   <div className="identity-head">
    <LockClosedIcon/>
    <div><b>How this parcel gets its identity</b><p>{source}</p></div>
    <span className="identity-chip">{supplied}</span>
   </div>
   <div className="identity-flow">
    <span><b>01</b> Browser picks a role</span><ArrowRightIcon/>
    <span><b>02</b> Next.js attaches the bearer</span><ArrowRightIcon/>
    <span><b>03</b> Envoy asks shared authz</span>
   </div>
  </aside>
 );
}

