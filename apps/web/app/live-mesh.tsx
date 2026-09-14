"use client";
import { useEffect, useRef, useState } from "react";
type MeshEvent = {requestId:string;service:string;stage:string;path:string;status?:number;time:string;environment:string};
const nodes = ["catalog","orders","inventory","graphql","grpc"];
export default function LiveMesh({token}:{token:string}) {
 const [events,setEvents]=useState<MeshEvent[]>([]); const [connection,setConnection]=useState("Choose a token to connect");
 const [paused,setPaused]=useState(false);const pausedRef=useRef(false);const [filter,setFilter]=useState("all"); const [selected,setSelected]=useState("");const [tick,setTick]=useState(Date.now());
 useEffect(()=>{pausedRef.current=paused},[paused]);
 useEffect(()=>{const timer=setInterval(()=>setTick(Date.now()),500);return ()=>clearInterval(timer)},[]);
 useEffect(()=>{
  setEvents([]);setSelected("");if(!token){setConnection("Choose a token to connect");return}
  let stopped=false;let retry:ReturnType<typeof setTimeout>;let socket:WebSocket;
  function connect(){
   setConnection("Connecting…");socket=new WebSocket(`${location.protocol==="https:"?"wss":"ws"}://${location.host}/api/events`);
   socket.onopen=()=>socket.send(JSON.stringify({token}));
   socket.onmessage=message=>{try{const data=JSON.parse(message.data);setConnection("Live");if(pausedRef.current)return;if(data.type==="history")setEvents(data.events.slice(-200));if(data.type==="event")setEvents(previous=>[...previous.slice(-199),data.event])}catch{setConnection("Invalid event")}};
   socket.onclose=()=>{if(!stopped){setConnection("Disconnected · retrying");retry=setTimeout(connect,4000)}};
   socket.onerror=()=>socket.close();
  }
  connect();return()=>{stopped=true;clearTimeout(retry);socket?.close()};
 },[token]);
 const recent=events.filter(event=>tick-Date.parse(event.time)<2500);
 const active=(service:string)=>recent.some(e=>e.service===service);
 const denied=recent.some(e=>e.stage==="denied");
 const requests=new Set(events.map(e=>e.requestId));const allowed=events.filter(e=>e.stage==="allowed").length;const rejected=events.filter(e=>e.stage==="denied").length;
 const visible=events.filter(e=>(filter==="all"||e.service===filter)&&(!selected||e.requestId===selected)).sort((a,b)=>Date.parse(a.time)-Date.parse(b.time)).slice(-40).reverse();
 return <section className="live-panel">
  <div className="live-heading"><div><p className="eyebrow">LIVE MESH OBSERVATORY</p><h2>Watch every decision ripple through the mesh.</h2></div><span className={`connection ${connection==="Live"?"connected":""}`}><i/>{connection}</span></div>
  <p className="live-description">Real events from authz and the Go services, streamed over WebSocket. The gateway is shown as routing context; glowing nodes reflect events observed in the last 2.5 seconds.</p>
  <div className="mesh-stats"><div><strong>{requests.size}</strong><span>observed requests</span></div><div><strong>{allowed}</strong><span>allowed checks</span></div><div><strong className="denied">{rejected}</strong><span>denied checks</span></div><div><strong>{events.length}<small> / 200</small></strong><span>buffered events</span></div></div>
  <div className="mesh-map" role="img" aria-label="Request flow: Next.js to Istio gateway, authz decision, then five Go services">
   <svg viewBox="0 0 1000 310" aria-hidden="true">
    <defs><linearGradient id="meshLine"><stop stopColor="#7be9c5"/><stop offset="1" stopColor="#98a2ff"/></linearGradient></defs>
    <path d="M150 155 H360 M470 155 H600 M600 155 V35 H770 M600 155 V95 H770 M600 155 H770 M600 155 V215 H770 M600 155 V275 H770" className={recent.length?"mesh-wire moving":"mesh-wire"}/>
    <path d="M415 155 V45" className={active("authz")?"mesh-wire moving":"mesh-wire"}/>
   </svg>
   <div className={`mesh-node browser-node ${recent.length?"node-active":""}`}><span>01 / CALLER</span><b>Next.js</b><small>REST · Protobuf</small></div>
   <div className={`mesh-node gateway-node ${recent.length?"node-active":""}`}><span>02 / ROUTING</span><b>Istio gateway</b><small>mTLS identity</small></div>
   <div className={`mesh-node authz-node ${active("authz")?denied?"node-denied":"node-active":""}`}><span>POLICY ENGINE</span><b>authz {active("authz")?(denied?"×":"✓"):""}</b></div>
   {nodes.map((node,i)=><div key={node} style={{top:`${i*19.35+2}%`}} className={`mesh-node service-node ${active(node)?"node-active":""}`}><b>{node}</b><small>{node==="grpc"?"HTTP/2 · Protobuf":node==="graphql"?"GraphQL query":"REST API"}</small></div>)}
  </div>
  <div className="stream-toolbar"><h3>Event stream</h3><select aria-label="Filter events by service" value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All services</option>{["authz",...nodes].map(n=><option key={n}>{n}</option>)}</select><button className="secondary" onClick={()=>setPaused(!paused)}>{paused?"Resume":"Pause"}</button><button className="secondary" onClick={()=>{setEvents([]);setSelected("")}}>Clear</button>{selected&&<button className="secondary" onClick={()=>setSelected("")}>Show all requests</button>}</div>
  <p className="stream-hint">{paused?"Display paused; new events are discarded until resumed.":selected?`Following request ${selected}`:"Click an event to follow its request across services. Buffer is environment-wide and resets when the event service restarts."}</p>
  <div className="event-list" aria-label="Live request events">{visible.length?visible.map((event,i)=><button key={`${event.requestId}-${event.stage}-${event.time}-${i}`} className={`event-row ${event.stage==="denied"?"event-denied":""}`} onClick={()=>setSelected(event.requestId)}><time>{new Date(event.time).toLocaleTimeString("en-GB",{hour12:false})}.{event.time.split(".")[1]?.slice(0,3)}</time><b>{event.service}</b><span className={`stage stage-${event.stage}`}>{event.stage}</span><code>{event.path}</code><small>{event.requestId.slice(0,8)}</small></button>):<div className="stream-empty"><span>◎</span><h3>The mesh is listening.</h3><p>Choose an identity and run a request to see authorization checks and service activity arrive here.</p></div>}</div>
 </section>
}
