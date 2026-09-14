"use client";
import type React from "react";
import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import type {BrokerState, MeshEvent, MetricsSnapshot} from "../lib/types";
import type {Run} from "../lib/journey";
import {TechGlyph} from "./tech-mark";
import type {MarkId} from "../lib/tech";
import {buildWorld, decisionLegs, outboundLegs, scrapeLegs, telemetryLegs, type Leg, type WorldNode, type WorldService} from "../lib/world";

type Props = {
 services:WorldService[];
 selected:string;
 runs:Run[];
 focusRun?:Run;
 events:MeshEvent[];
 broker?:BrokerState;
 metrics?:MetricsSnapshot;
 activeStep:string;
 environment:string;
 simulation?:{tone:"deny"|"outage"; headline:string};
 onSelectService:(id:string) => void;
 onSelectStep:(step:string) => void;
 onFocusNode:(node:string) => void;
};

type Flight = {
 id:string;
 runId?:string;
 service?:string;
 legs:Leg[];
 index:number;
 t:number;
 focus:boolean;
 holding:boolean;
 heldAt:number;
 landed:boolean;
 head:SVGCircleElement;
 tail:SVGCircleElement[];
 group:SVGGElement;
 edge?:string;
};

const MAX_FLIGHTS = 26;

const LANGUAGE_TAG:Record<string,string> = {go:"GO", javascript:"JS", typescript:"TS", python:"PY"};

// A recognisable mark on the infrastructure nodes, so the map names its own parts.
const NODE_MARK:Record<string, MarkId> = {
 browser:"browser", web:"nextjs", gateway:"istio", envoy:"envoy", authz:"go",
 exchange:"rabbitmq", queue:"rabbitmq", telemetry:"socket", sink:"socket",
 tsdb:"prometheus", dashboard:"grafana",
};

function polygon(sides:number, radius:number, rotate = 0){
 return Array.from({length:sides}, (unused, i) => {
  const angle = rotate + (Math.PI * 2 * i) / sides;
  return `${(Math.cos(angle) * radius).toFixed(2)},${(Math.sin(angle) * radius).toFixed(2)}`;
 }).join(" ");
}

export default function MeshWorld({services, selected, runs, focusRun, events, broker, metrics, activeStep, environment, simulation, onSelectService, onSelectStep, onFocusNode}:Props){
 const [narrow, setNarrow] = useState(false);
 const world = useMemo(
  () => buildWorld(narrow ? services.filter(item => item.id === selected) : services, narrow),
  [services, narrow, selected],
 );
 const svgRef = useRef<SVGSVGElement>(null);
 const viewportRef = useRef<SVGGElement>(null);
 const surfaceRef = useRef<HTMLElement>(null);
 const view = useRef({x:0, y:0, k:1});
 const dragging = useRef<{x:number; y:number; id:number}|null>(null);
 const layerRef = useRef<SVGGElement>(null);
 const pathRefs = useRef<Record<string, SVGPathElement|null>>({});
 const nodeRefs = useRef<Record<string, SVGGElement|null>>({});
 const pingRefs = useRef<Record<string, SVGCircleElement|null>>({});
 const flights = useRef<Flight[]>([]);
 const edgeLoad = useRef<Record<string, number>>({});
 const decisions = useRef<Record<string, {allowed:boolean; observed:boolean}>>({});
 const started = useRef<Set<string>>(new Set());
 const seenEvents = useRef<Set<string>>(new Set());
 const collected = useRef<Record<string, number>>({});
 const [reduced, setReduced] = useState(false);
 const [hover, setHover] = useState<WorldNode|undefined>();
 const [traffic, setTraffic] = useState(0);
 const [legendOpen, setLegendOpen] = useState(false);
 const [camera, setCamera] = useState({x:0, y:0, k:1});

 useEffect(() => {
  const query = matchMedia("(max-width: 899px)");
  const apply = () => setNarrow(query.matches);
  apply();
  query.addEventListener("change", apply);
  return () => query.removeEventListener("change", apply);
 }, []);

 useEffect(() => {
  const query = matchMedia("(prefers-reduced-motion: reduce)");
  const apply = () => setReduced(query.matches);
  apply();
  query.addEventListener("change", apply);
  return () => query.removeEventListener("change", apply);
 }, []);

 // Pan and zoom live on one group so the animation engine keeps working in
 // scene coordinates and never needs to know where the camera is.
 const applyView = useCallback(() => {
  const {x, y, k} = view.current;
  viewportRef.current?.setAttribute("transform", `translate(${x.toFixed(2)},${y.toFixed(2)}) scale(${k.toFixed(4)})`);
  setCamera({x, y, k});
 }, []);

 /** Pointer position in scene units, accounting for the letterboxed viewBox. */
 const toScene = useCallback((clientX:number, clientY:number) => {
  const svg = svgRef.current;
  if(!svg) return {x:0, y:0};
  const box = svg.getBoundingClientRect();
  const fit = Math.min(box.width / world.width, box.height / world.height) || 1;
  const offsetX = (box.width - world.width * fit) / 2;
  const offsetY = (box.height - world.height * fit) / 2;
  const vx = (clientX - box.left - offsetX) / fit;
  const vy = (clientY - box.top - offsetY) / fit;
  return {x:(vx - view.current.x) / view.current.k, y:(vy - view.current.y) / view.current.k, vx, vy};
 }, [world.width, world.height]);

 const zoomTo = useCallback((next:number, anchor?:{vx:number; vy:number; x:number; y:number}) => {
  const k = Math.min(3.2, Math.max(0.45, next));
  if(anchor){
   view.current = {k, x:anchor.vx - anchor.x * k, y:anchor.vy - anchor.y * k};
  }else{
   const cx = world.width / 2;
   const cy = world.height / 2;
   const scene = {x:(cx - view.current.x) / view.current.k, y:(cy - view.current.y) / view.current.k};
   view.current = {k, x:cx - scene.x * k, y:cy - scene.y * k};
  }
  applyView();
 }, [applyView, world.width, world.height]);

 const resetView = useCallback(() => {view.current = {x:0, y:0, k:1}; applyView()}, [applyView]);

 // React attaches wheel passively at the root, where preventDefault is ignored
 // and a trackpad pinch reaches the browser as page zoom. Bind it natively.
 useEffect(() => {
  const svg = surfaceRef.current;
  if(!svg) return;
  const lines = (event:WheelEvent) => (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 400 : 1);
  const onWheel = (event:WheelEvent) => {
   event.preventDefault();
   const step = lines(event);
   const point = toScene(event.clientX, event.clientY) as {x:number; y:number; vx:number; vy:number};
   // macOS reports a pinch as ctrl+wheel; every platform zooms with ctrl or cmd.
   if(event.ctrlKey || event.metaKey){
    const delta = Math.max(-60, Math.min(60, event.deltaY * step));
    zoomTo(view.current.k * Math.exp(-delta / 160), point);
    return;
   }
   view.current = {
    ...view.current,
    x:view.current.x - event.deltaX * step,
    y:view.current.y - event.deltaY * step,
   };
   applyView();
  };
  // Safari sends its own gesture events, which would zoom the page as well.
  const stop = (event:Event) => event.preventDefault();
  svg.addEventListener("wheel", onWheel, {passive:false});
  svg.addEventListener("gesturestart", stop);
  svg.addEventListener("gesturechange", stop);
  svg.addEventListener("gestureend", stop);
  return () => {
   svg.removeEventListener("wheel", onWheel);
   svg.removeEventListener("gesturestart", stop);
   svg.removeEventListener("gesturechange", stop);
   svg.removeEventListener("gestureend", stop);
  };
 }, [applyView, toScene, zoomTo]);

 const flash = useCallback((nodeId:string, tone:string) => {
  // The ping lives outside the clickable group: a growing child would keep the
  // node's bounding box moving, and a moving target cannot be clicked.
  for(const element of [nodeRefs.current[nodeId], pingRefs.current[nodeId]]){
   if(!element) continue;
   element.setAttribute("data-flash", tone);
   window.setTimeout(() => {if(element.getAttribute("data-flash") === tone) element.removeAttribute("data-flash")}, 620);
  }
 }, []);

 const markEdge = useCallback((edge:string|undefined, delta:number) => {
  if(!edge) return;
  const next = (edgeLoad.current[edge] ?? 0) + delta;
  edgeLoad.current[edge] = Math.max(0, next);
  const element = pathRefs.current[edge]?.parentElement;
  if(element) element.classList.toggle("live", edgeLoad.current[edge] > 0);
 }, []);

 const drop = useCallback((flight:Flight) => {
  markEdge(flight.edge, -1);
  flight.group.remove();
  flights.current = flights.current.filter(item => item !== flight);
 }, [markEdge]);

 const launch = useCallback((legs:Leg[], options:{id:string; runId?:string; service?:string; focus:boolean}) => {
  const layer = layerRef.current;
  if(!layer || !legs.length || flights.current.length >= MAX_FLIGHTS) return;
  const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
  group.setAttribute("class", `packet tone-${legs[0].tone}${options.focus ? " focus" : ""}`);
  const tail = [0, 1, 2].map(index => {
   const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
   circle.setAttribute("class", "packet-tail");
   circle.setAttribute("r", String(4.2 - index * 1.1));
   circle.setAttribute("opacity", String(0.42 - index * 0.12));
   group.appendChild(circle);
   return circle;
  });
  const halo = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  halo.setAttribute("class", "packet-halo");
  halo.setAttribute("r", options.focus ? "15" : "10");
  group.appendChild(halo);
  const head = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  head.setAttribute("class", "packet-head");
  head.setAttribute("r", options.focus ? "5.4" : "3.6");
  group.appendChild(head);
  layer.appendChild(group);
  const flight:Flight = {id:options.id, runId:options.runId, service:options.service, legs, index:0, t:0, focus:options.focus, holding:false, heldAt:0, landed:false, head, tail:[halo, ...tail], group};
  flights.current.push(flight);
  markEdge(legs[0].edge, 1);
  flight.edge = legs[0].edge;
 }, [markEdge]);

 // Position every live packet. Runs from one shared animation frame.
 useEffect(() => {
  if(reduced) return;
  let frame = 0;
  let last = performance.now();
  const tick = (now:number) => {
   const delta = Math.min(now - last, 90);
   last = now;
   for(const flight of [...flights.current]){
    const leg = flight.legs[flight.index];
    const path = leg && pathRefs.current[leg.edge];
    if(!leg || !path){drop(flight); continue}
    if(!flight.holding) flight.t = Math.min(1, flight.t + delta / leg.ms);
    const total = path.getTotalLength();
    const place = (element:SVGCircleElement, at:number) => {
     const progress = Math.min(1, Math.max(0, at));
     const point = path.getPointAtLength(total * (leg.reverse ? 1 - progress : progress));
     element.setAttribute("cx", point.x.toFixed(2));
     element.setAttribute("cy", point.y.toFixed(2));
    };
    place(flight.head, flight.t);
    flight.tail.forEach((element, index) => place(element, flight.t - index * 0.035));
    if(flight.t < 1) continue;
    if(!flight.landed){flight.landed = true; if(leg.land) flash(leg.land, leg.tone)}
    if(leg.hold === "decision"){
     const decision = flight.runId ? decisions.current[flight.runId] : undefined;
     if(!decision){
      // Park at the decision point rather than inventing an outcome.
      if(!flight.holding){flight.holding = true; flight.heldAt = now; flight.group.classList.add("waiting")}
      else if(now - flight.heldAt > 12000) drop(flight);
      continue;
     }
     flight.group.classList.remove("waiting");
     flight.holding = false;
     const next = decisionLegs(flight.service ?? "", decision.allowed);
     markEdge(flight.edge, -1);
     flight.legs = next;
     flight.index = 0;
     flight.t = 0;
     flight.landed = false;
     flight.edge = next[0].edge;
     markEdge(flight.edge, 1);
     flight.group.setAttribute("class", `packet tone-${next[0].tone}${flight.focus ? " focus" : ""}`);
     continue;
    }
    markEdge(flight.edge, -1);
    flight.index += 1;
    flight.t = 0;
    flight.landed = false;
    const upcoming = flight.legs[flight.index];
    if(!upcoming){drop(flight); continue}
    flight.edge = upcoming.edge;
    markEdge(flight.edge, 1);
    flight.group.setAttribute("class", `packet tone-${upcoming.tone}${flight.focus ? " focus" : ""}`);
   }
   frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
 }, [reduced, drop, flash, markEdge]);

 // A decision becomes known either from a correlated authz event or the response.
 useEffect(() => {
  for(const run of runs){
   const observed = run.events.findLast(event => event.service === "authz" && (event.stage === "allowed" || event.stage === "denied"));
   if(observed){decisions.current[run.id] = {allowed:observed.stage === "allowed", observed:true}; continue}
   if(run.result) decisions.current[run.id] = {allowed:run.result.status < 400, observed:false};
   else if(run.error) decisions.current[run.id] = {allowed:false, observed:false};
  }
 }, [runs]);

 // Every dispatched request flies the configured route exactly once.
 useEffect(() => {
  if(reduced) return;
  for(const run of runs){
   if(started.current.has(run.id) || !world.lanes[run.service]) continue;
   started.current.add(run.id);
   launch(outboundLegs(run.service), {id:run.id, runId:run.id, service:run.service, focus:run.id === focusRun?.id});
   flash("browser", "identity");
  }
  if(started.current.size > 400) started.current = new Set([...started.current].slice(-200));
 }, [runs, world.lanes, launch, flash, reduced, focusRun?.id]);

 // Observed telemetry travels its own lane, whoever produced it.
 useEffect(() => {
  if(reduced) return;
  let spawned = 0;
  for(const event of events.slice(-24)){
   const key = event.eventId ?? `${event.requestId}:${event.service}:${event.stage}:${event.time}`;
   if(seenEvents.current.has(key)) continue;
   seenEvents.current.add(key);
   if(spawned >= 4) continue;
   const origin = event.service === "authz" ? "authz" : world.lanes[event.service] ? event.service : undefined;
   if(!origin) continue;
   spawned += 1;
   launch(telemetryLegs(origin), {id:key, focus:false});
   flash(origin === "authz" ? "authz" : `pod:${origin}`, event.stage === "denied" ? "deny" : "telemetry");
  }
  if(spawned) setTraffic(value => value + spawned);
  if(seenEvents.current.size > 800) seenEvents.current = new Set([...seenEvents.current].slice(-400));
 }, [events, world.lanes, launch, flash, reduced]);

 useEffect(() => {
  const timer = window.setInterval(() => setTraffic(value => (value > 0 ? value - 1 : 0)), 1600);
  return () => window.clearInterval(timer);
 }, []);

 // A scrape mote is only drawn when Prometheus actually reports more samples.
 useEffect(() => {
  if(reduced || !metrics?.handled) return;
  let moved = false;
  for(const [service, total] of Object.entries(metrics.handled)){
   if(!world.lanes[service]) continue;
   const previous = collected.current[service];
   collected.current[service] = total;
   if(previous === undefined || total <= previous) continue;
   moved = true;
   launch(scrapeLegs(service), {id:`scrape:${service}:${total}`, focus:false});
  }
  if(moved) flash("prometheus", "scrape");
 }, [metrics, world.lanes, launch, flash, reduced]);

 const handled = metrics?.handled ?? {};
 const depthLabel = broker?.enabled ? `${broker.depth} READY` : "";
 const centreOn = (event:React.PointerEvent<SVGSVGElement>) => {
  const box = event.currentTarget.getBoundingClientRect();
  const fit = Math.min(box.width / world.width, box.height / world.height) || 1;
  const sceneX = (event.clientX - box.left - (box.width - world.width * fit) / 2) / fit;
  const sceneY = (event.clientY - box.top - (box.height - world.height * fit) / 2) / fit;
  const {k} = view.current;
  view.current = {k, x:world.width / 2 - sceneX * k, y:world.height / 2 - sceneY * k};
  applyView();
 };

 const activate = (node:WorldNode) => {
  if(node.service) onSelectService(node.service);
  if(node.step) onSelectStep(node.step);
  onFocusNode(node.id);
 };
 const decision = focusRun ? decisions.current[focusRun.id] : undefined;
 const phase = simulation ? "simulated"
  : focusRun && !focusRun.result && !focusRun.error ? "transit"
  : decision ? (decision.allowed ? "allowed" : "denied")
  : "idle";
 const headline = simulation ? simulation.headline
  : phase === "transit" ? "Parcel in transit"
  : phase === "allowed" ? "Delivered to the handler"
  : phase === "denied" ? "Refused at the sidecar"
  : "Standing by";

 const observedNodes = useMemo(() => {
  const map:Record<string,"observed"|"denied"> = {};
  if(!focusRun) return map;
  for(const event of focusRun.events){
   const tone = event.stage === "denied" ? "denied" : "observed";
   if(event.service === "authz") map.authz = tone;
   else if(world.lanes[event.service]) map[`pod:${event.service}`] = tone;
   map.events = "observed";
  }
  return map;
 }, [focusRun, world.lanes]);

 return (
  <section ref={surfaceRef} className={`mesh-world phase-${phase}`} aria-label="Mesh world">
   <div className="world-hud">
    <span className="world-state"><i/>{headline}</span>
    <span className="world-meter" aria-label="Telemetry activity">
     {[0,1,2,3,4,5,6,7].map(bar => <i key={bar} className={bar < Math.min(8, traffic) ? "on" : ""}/>)}
     <b>TELEMETRY</b>
    </span>
    <span className={`broker-chip${broker?.connected ? " up" : broker?.enabled ? " down" : ""}`} aria-label="Broker status">
     <i/>
     {broker?.enabled
      ? <>RABBITMQ {broker.connected ? "· connected" : "· reconnecting"} <b>{broker.exchange}</b> depth <b>{broker.depth}</b> consumed <b>{broker.delivered}</b></>
      : <>DIRECT HTTP TELEMETRY</>}
    </span>
   </div>
   <div className="world-fit">
   <svg
    ref={svgRef}
    className={dragging.current ? "grabbing" : ""}
    viewBox={`0 0 ${world.width} ${world.height}`}
    preserveAspectRatio="xMidYMid meet"
    role="img"
    aria-label="Live map of the request path through the mesh. Scroll to pan, hold command and scroll to zoom."
    onPointerDown={event => {
     if((event.target as Element).closest(".wnode")) return;
     dragging.current = {x:event.clientX, y:event.clientY, id:event.pointerId};
     (event.currentTarget as SVGSVGElement).setPointerCapture(event.pointerId);
    }}
    onPointerMove={event => {
     const drag = dragging.current;
     if(!drag || drag.id !== event.pointerId) return;
     view.current = {...view.current, x:view.current.x + (event.clientX - drag.x), y:view.current.y + (event.clientY - drag.y)};
     dragging.current = {...drag, x:event.clientX, y:event.clientY};
     applyView();
    }}
    onPointerUp={event => {
     if(dragging.current?.id === event.pointerId) dragging.current = null;
    }}
    onPointerCancel={() => {dragging.current = null}}
   >
    <defs>
     <radialGradient id="floorGlow" cx="50%" cy="42%" r="62%">
      <stop offset="0%" stopColor="#1a3550" stopOpacity="0.62"/>
      <stop offset="55%" stopColor="#0b1728" stopOpacity="0.32"/>
      <stop offset="100%" stopColor="#04070d" stopOpacity="0"/>
     </radialGradient>
     <linearGradient id="podFace" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#16304a"/>
      <stop offset="100%" stopColor="#0a1524"/>
     </linearGradient>
     <linearGradient id="gateFace" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stopColor="#1d3d5c"/>
      <stop offset="100%" stopColor="#0a1626"/>
     </linearGradient>
     <filter id="bloom" x="-80%" y="-80%" width="260%" height="260%">
      <feGaussianBlur stdDeviation="7" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
     </filter>
     <filter id="softBloom" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="3.4" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
     </filter>
     <mask id="floorFade">
      <rect width={world.width} height={world.height} fill="url(#floorGlow)"/>
     </mask>
    </defs>

    <rect width={world.width} height={world.height} fill="url(#floorGlow)"/>

    <g ref={viewportRef} className="viewport">
    <g className="floor" mask="url(#floorFade)">
     {Array.from({length:Math.ceil(world.height / 31)}, (unused, i) => <line key={`h${i}`} x1="0" y1={i * 31} x2={world.width} y2={i * 31}/>)}
     {Array.from({length:Math.ceil(world.width / 31)}, (unused, i) => <line key={`v${i}`} x1={i * 31} y1="0" x2={i * 31} y2={world.height}/>)}
    </g>

    <g className="layer-frames">
     <rect className="frame-cluster" x={world.cluster.x} y={world.cluster.y} width={world.cluster.width} height={world.cluster.height} rx="26"/>
     <text className="frame-label cluster" role="button" tabIndex={0} aria-label="What Kubernetes is" onClick={() => onFocusNode("cluster")} onKeyDown={event => {if(event.key === "Enter") onFocusNode("cluster")}} x={world.cluster.x + 24} y={world.cluster.y + 32}>CLUSTER · mesh-study ⓘ</text>
     <rect className="frame-namespace" x={world.namespace.x} y={world.namespace.y} width={world.namespace.width} height={world.namespace.height} rx="20"/>
     <text className="frame-label namespace" x={world.namespace.x + 24} y={world.namespace.y + 34}>NAMESPACE · {environment} · STRICT mTLS · DEFAULT-DENY</text>
    </g>

    <g className="pod-boundaries" aria-hidden="true">
     {world.pods.map(pod => (
      <g key={pod.service} className={`pod-boundary${pod.service === selected ? " selected" : ""}`}>
       <rect x={pod.x} y={pod.y} width={pod.width} height={pod.height} rx="16"/>
       <text x={pod.x + pod.width - 14} y={pod.y + 20}>POD · 2 CONTAINERS</text>
      </g>
     ))}
    </g>

    <g className="edges">
     {world.edges.map(edge => {
      const dim = edge.from.startsWith("envoy:") || edge.to.startsWith("envoy:") || edge.from.startsWith("pod:")
       ? !(edge.id.includes(`:${selected}`))
       : false;
      return (
       <g key={edge.id} className={`edge edge-${edge.kind}${dim ? " dim" : ""}`} style={edge.accent ? {"--accent":edge.accent} as React.CSSProperties : undefined}>
        <path className="edge-glow" d={edge.d} ref={element => {pathRefs.current[edge.id] = element}}/>
        <path className="edge-line" d={edge.d}/>
        {edge.mtls && <path className="edge-mtls" d={edge.d}/>}
       </g>
      );
     })}
    </g>

    <g ref={layerRef} className="packets"/>

    <g className="pings" aria-hidden="true">
     {world.nodes.map(node => (
      <circle
       key={node.id}
       ref={element => {pingRefs.current[node.id] = element}}
       className="node-ping"
       cx={node.x}
       cy={node.y}
       r={node.kind === "pod" ? 42 : 30}
      />
     ))}
    </g>

    <g className="nodes">
     {world.nodes.map(node => {
      const isSelected = node.service === selected || (node.step === activeStep && !node.service);
      const state = observedNodes[node.id];
      return (
       <g
        key={node.id}
        ref={element => {nodeRefs.current[node.id] = element}}
        className={`wnode wnode-${node.kind}${isSelected ? " selected" : ""}${state ? ` ${state}` : ""}${node.service && node.service !== selected && node.kind !== "authz" && node.kind !== "telemetry" ? " muted" : ""}`}
        transform={`translate(${node.x},${node.y})`}
        style={node.accent ? {"--accent":node.accent} as React.CSSProperties : undefined}
        role="button"
        tabIndex={0}
        aria-label={`Inspect ${node.label}. ${node.caption}`}
        onClick={() => activate(node)}
        onKeyDown={event => {if(event.key === "Enter" || event.key === " "){event.preventDefault(); activate(node)}}}
        onMouseEnter={() => setHover(node)}
        onMouseLeave={() => setHover(current => (current?.id === node.id ? undefined : current))}
        onFocus={() => setHover(node)}
        onBlur={() => setHover(current => (current?.id === node.id ? undefined : current))}
       >
        <ellipse className="node-shadow" cx="0" cy={node.kind === "pod" ? 44 : 36} rx={node.kind === "pod" ? 52 : 38} ry="9"/>
        <NodeShape node={node}/>
        {NODE_MARK[node.kind] && <TechGlyph mark={NODE_MARK[node.kind]} x={node.kind === "pod" ? 0 : 0} y={node.kind === "envoy" ? -34 : node.kind === "client" ? -46 : -42} size={21}/>}
        {node.kind !== "pod" && <text className="node-label" y={node.kind === "envoy" ? 42 : 54}>{node.label}</text>}
        {node.kind === "envoy" && <text className="node-sublabel" y="56">SIDECAR</text>}
        {node.kind === "authz" && <text className="node-sublabel" y="68">PERMISSION CHECK</text>}
        {node.kind === "queue" && <text className="queue-depth" y="-34">{depthLabel}</text>}
        {node.kind === "pod" && node.service && handled[node.service] !== undefined && (
         <text className="pod-count" x="0" y="60">{handled[node.service]} handled</text>
        )}
       </g>
      );
     })}
    </g>

    {!narrow && (
     <g className="world-annotations">
      
      <text className="lane-note" x="396" y={world.metricsY + 104}>METRICS LANE · PULLED FROM :15020</text>
      <text className="lane-note" x="1180" y={world.laneY - 104}>TELEMETRY LANE · METADATA ONLY</text>
      <text className="lane-note" x="1180" y={world.laneY - 78}>PUBLISH → ROUTE → QUEUE → CONSUME → BROWSER</text>
     </g>
    )}
    </g>
   </svg>
   </div>

   <button className={`legend-toggle${legendOpen ? " open" : ""}`} onClick={() => setLegendOpen(!legendOpen)} aria-expanded={legendOpen}>Legend</button>
   <div className={`world-legend${legendOpen ? " open" : ""}`}>
    <span><i className="k-identity"/>Request identity</span>
    <span><i className="k-allow"/>Allowed</span>
    <span><i className="k-deny"/>Denied</span>
    <span><i className="k-telemetry"/>Published</span>
    <span><i className="k-consume"/>Consumed</span>
    <span><i className="k-scrape"/>Metric scrape</span>
    <span><i className="k-mtls"/>mTLS link</span>
    <span className="world-note">Motion is the configured route. Badges below are measured evidence.</span>
   </div>
   <div className="world-nav">
    <div className="minimap" aria-hidden="true">
     <svg
      viewBox={`0 0 ${world.width} ${world.height}`}
      preserveAspectRatio="xMidYMid meet"
      onPointerDown={event => centreOn(event)}
      onPointerMove={event => {if(event.buttons === 1) centreOn(event)}}
     >
      <rect className="mini-bg" width={world.width} height={world.height}/>
      <rect className="mini-frame" x={world.cluster.x} y={world.cluster.y} width={world.cluster.width} height={world.cluster.height} rx="20"/>
      {world.nodes.map(node => (
       <circle
        key={node.id}
        className={`mini-node mini-${node.kind}${node.service === selected ? " selected" : ""}`}
        cx={node.x}
        cy={node.y}
        r={node.kind === "pod" ? 26 : 18}
       />
      ))}
      <rect
       className="mini-view"
       x={-camera.x / camera.k}
       y={-camera.y / camera.k}
       width={world.width / camera.k}
       height={world.height / camera.k}
      />
     </svg>
     <span className="minimap-label">Map</span>
    </div>
    <div className="zoom-controls">
     <button onClick={() => zoomTo(view.current.k / 1.25)} aria-label="Zoom out">−</button>
     <button className="zoom-level" onClick={resetView} title="Reset the view">{Math.round(camera.k * 100)}%</button>
     <button onClick={() => zoomTo(view.current.k * 1.25)} aria-label="Zoom in">+</button>
     <button className="zoom-fit" onClick={resetView}>Fit</button>
    </div>
    <span className="nav-hint">Drag to move · scroll to pan · ⌘ or ctrl + scroll to zoom</span>
   </div>
   {hover && <div className="world-tip" role="status"><b>{hover.label}</b><span>{hover.caption}</span></div>}
   {reduced && <p className="world-note reduced">Reduced motion is on: packets are not animated. The request journey below lists every step.</p>}
  </section>
 );
}

function NodeShape({node}:{node:WorldNode}){
 if(node.kind === "client") return (
  <g className="shape">
   <rect x="-42" y="-34" width="84" height="64" rx="9"/>
   <path className="shape-bar" d="M-42,-20 H42"/>
   <circle className="dot" cx="-33" cy="-27" r="2.6"/><circle className="dot" cx="-25" cy="-27" r="2.6"/><circle className="dot" cx="-17" cy="-27" r="2.6"/>
   <path className="shape-mark" d="M-16,4 h32 M-16,14 h20"/>
  </g>
 );
 if(node.kind === "edge") return (
  <g className="shape">
   <rect x="-46" y="-36" width="92" height="70" rx="12"/>
   <text className="shape-text" y="6">NEXT.JS</text>
   <polygon className="sidecar" points={polygon(6, 15, Math.PI / 6)} transform="translate(46,30)"/>
  </g>
 );
 if(node.kind === "gateway") return (
  <g className="shape">
   <polygon className="gate-outer" points={polygon(6, 48, Math.PI / 6)}/>
   <polygon className="gate-inner" points={polygon(6, 30, Math.PI / 6)}/>
   <circle className="gate-core" r="9"/>
  </g>
 );
 if(node.kind === "envoy") return (
  <g className="shape">
   <circle className="envoy-ring" r="23"/>
   <circle className="envoy-scan" r="17"/>
   <path className="envoy-mark" d="M0,-8 L7,-4 V4 L0,9 L-7,4 V-4 Z"/>
   {/* The endpoint Prometheus pulls from, on the sidecar rather than the app. */}
   <circle className="metrics-port" cx="-20" cy="-16" r="4"/>
   <text className="metrics-port-label" x="-26" y="-24">:15020</text>
  </g>
 );
 if(node.kind === "pod") return (
  <g className="shape">
   <rect className="pod-body" x="-58" y="-36" width="116" height="72" rx="15"/>
   <rect className="pod-core" x="-46" y="-24" width="92" height="48" rx="10"/>
   <path className="pod-grid" d="M-46,-8 H46 M-46,10 H46"/>
   <text className="pod-name" y="7">{node.label}</text>
   {node.language && <g className="pod-language" transform="translate(-58,-36)"><rect x="0" y="0" width="34" height="19" rx="6"/><text x="17" y="14">{LANGUAGE_TAG[node.language] ?? node.language.slice(0, 2).toUpperCase()}</text></g>}
   {node.protocol && <text className="pod-chip" x="70" y="5">{node.protocol.toUpperCase()}</text>}
  </g>
 );
 if(node.kind === "authz") return (
  <g className="shape">
   <polygon className="authz-outer" points={polygon(8, 44, Math.PI / 8)}/>
   <polygon className="authz-inner" points={polygon(8, 27, Math.PI / 8)}/>
   <path className="authz-mark" d="M-9,-2 a9,9 0 0 1 18,0 v3 h-18 z M-11,1 h22 v13 h-22 z"/>
  </g>
 );
 if(node.kind === "exchange") return (
  <g className="shape">
   <polygon className="mq-body" points={polygon(6, 30, Math.PI / 6)}/>
   <path className="mq-fan" d="M-13,0 L13,0 M4,-8 L13,0 L4,8 M-4,-11 L6,-3 M-4,11 L6,3"/>
  </g>
 );
 if(node.kind === "queue") return (
  <g className="shape">
   <rect className="mq-body" x="-34" y="-24" width="68" height="48" rx="9"/>
   <rect className="mq-slot" x="-25" y="-13" width="13" height="26" rx="3"/>
   <rect className="mq-slot" x="-6" y="-13" width="13" height="26" rx="3"/>
   <rect className="mq-slot" x="13" y="-13" width="13" height="26" rx="3"/>
  </g>
 );
 if(node.kind === "tsdb") return (
  <g className="shape">
   <polygon className="obs-body" points={polygon(6, 30, Math.PI / 6)}/>
   <path className="obs-mark" d="M-12,6 L-6,-6 L0,4 L6,-10 L12,2"/>
  </g>
 );
 if(node.kind === "dashboard") return (
  <g className="shape">
   <rect className="obs-body" x="-32" y="-24" width="64" height="48" rx="9"/>
   <path className="obs-mark" d="M-20,10 L-20,-4 M-8,10 L-8,-12 M4,10 L4,-6 M16,10 L16,-16"/>
  </g>
 );
 if(node.kind === "telemetry") return (
  <g className="shape">
   <polygon className="tele-body" points={polygon(4, 34, Math.PI / 4)}/>
   <polygon className="tele-core" points={polygon(4, 18, Math.PI / 4)}/>
   <path className="tele-wave" d="M-13,6 q13,-18 26,0 M-8,10 q8,-11 16,0"/>
  </g>
 );
 return (
  <g className="shape">
   <path className="sink-bracket" d="M-14,-24 h20 v8 h-12 v32 h12 v8 h-20 z"/>
   <circle className="sink-core" r="6" cx="12"/>
  </g>
 );
}
