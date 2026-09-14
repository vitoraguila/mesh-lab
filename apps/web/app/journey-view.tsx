"use client";
import {useEffect,useState} from "react";
import {PlayIcon,PauseIcon,ChevronLeftIcon,ChevronRightIcon,ResetIcon,CheckCircledIcon,CrossCircledIcon,DotFilledIcon} from "@radix-ui/react-icons";
import type {LearningService} from "../lib/learning";
import {evidence,outcome,type Run} from "../lib/journey";

const LABELS:Record<string,string> = {browser:"Browser", next:"Next.js", gateway:"Istio gateway", envoy:"API Envoy", authz:"Authorization", response:"Response"};

export default function JourneyView({service,run,selected,onSelect}:{service:LearningService;run?:Run;selected:string;onSelect:(id:string)=>void}){
 const path=service.steps.filter(s=>s.id!=='events');
 const [captured,setCaptured]=useState<Run>();
 const [replay,setReplay]=useState(false);const [playing,setPlaying]=useState(false);const [position,setPosition]=useState(0);const [speed,setSpeed]=useState('1');
 useEffect(()=>{setReplay(false);setPlaying(false);setPosition(0)},[run?.id]);
 useEffect(()=>{if(!playing)return;const timer=setInterval(()=>setPosition(p=>{if(p>=path.length-1){setPlaying(false);return path.length-1}return p+1}),1400/Number(speed));return()=>clearInterval(timer)},[playing,speed,path.length]);
 useEffect(()=>{if(replay)onSelect(path[position]?.id??'browser')},[position,replay,path[position]?.id,onSelect]);
 const presented=replay?captured:run;
 return <section className="journey-panel" aria-label="Request journey">
  <div className="section-heading">
   <div><h2>Follow the request</h2><p>{replay?'Replaying captured activity. Nothing is sent again.':'Each stop opens its explanation and source on the right.'}</p></div>
   <span className={`outcome ${run?.result?.status===403?'bad':''}`}>{outcome(run)}</span>
  </div>
  <ol className="journey-rail">{path.map((step,i)=>{
   const state=evidence(step.id,presented);const hidden=replay&&i>position;
   return <li key={step.id}>
    <button className={`journey-node node-${step.id} ${selected===step.id?'selected':''} ${hidden?'future':state.kind}`} onClick={()=>onSelect(step.id)} aria-pressed={selected===step.id}>
     <span className="node-index">{String(i+1).padStart(2,'0')}{state.kind==='observed'&&!hidden?<CheckCircledIcon/>:state.kind==='denied'&&!hidden?<CrossCircledIcon/>:<DotFilledIcon/>}</span>
     <b>{LABELS[step.id]??(step.id==='handler'?`${service.id} handler`:step.title)}</b>
     <small>{hidden?'Not yet replayed':state.label}</small>
    </button>
   </li>;
  })}</ol>
  <div className="journey-footer">
   <div className="journey-legend">
    <span><i className="legend-observed"/>Observed</span>
    <span><i className="legend-context"/>Configured</span>
    <span><i className="legend-denied"/>Denied</span>
   </div>
   <div className="replay-controls">
    <button className="subtle" disabled={!run?.result&&!run?.error} onClick={()=>{setCaptured(run?{...run,events:[...run.events]}:undefined);setReplay(true);setPosition(0);setPlaying(!matchMedia('(prefers-reduced-motion: reduce)').matches)}}><ResetIcon/>Replay</button>
    <button className="icon-button" aria-label="Previous step" disabled={!replay||position===0} onClick={()=>{setPlaying(false);setPosition(p=>p-1)}}><ChevronLeftIcon/></button>
    <button className="icon-button" aria-label={playing?'Pause replay':'Play replay'} disabled={!replay} onClick={()=>setPlaying(!playing)}>{playing?<PauseIcon/>:<PlayIcon/>}</button>
    <button className="icon-button" aria-label="Next step" disabled={!replay||position>=path.length-1} onClick={()=>{setPlaying(false);setPosition(p=>p+1)}}><ChevronRightIcon/></button>
    <select aria-label="Replay speed" value={speed} onChange={e=>setSpeed(e.target.value)}><option value="0.5">0.5×</option><option value="1">1× speed</option><option value="2">2× speed</option></select>
    {replay&&<button className="text-button" onClick={()=>{setReplay(false);setPlaying(false)}}>Return to live</button>}
   </div>
  </div>
  <button className={`observation-path ${selected==='events'?'selected':''}`} onClick={()=>onSelect('events')}>
   <span>Separate observation channel</span>
   <b>Authz + API <ChevronRightIcon/> RabbitMQ <ChevronRightIcon/> Event service <ChevronRightIcon/> WebSocket</b>
   <small>{run?`${run.events.length} correlated events received`:'Metadata only. Independent of the business request.'}</small>
  </button>
 </section>
}
