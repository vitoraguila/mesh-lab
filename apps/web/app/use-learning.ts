"use client";
import {useEffect,useRef,useState} from "react";
import type {Catalog} from "../lib/learning";
import type {BrokerState, MeshEvent, MetricsSnapshot} from "../lib/types";
import {mergeEvents} from "../lib/journey";
export function useCatalog(){
 const [catalog,setCatalog]=useState<Catalog>();const [error,setError]=useState("");
 useEffect(()=>{let live=true;const refresh=async()=>{try{const response=await fetch('/api/learn/catalog',{cache:'no-store'});const data=await response.json();if(!response.ok)throw Error(data.error);if(live){setCatalog(previous=>previous?.revision===data.revision&&previous?.activeRevision===data.activeRevision&&previous?.appliedAt===data.appliedAt&&previous?.webRevision===data.webRevision?previous:data);setError("")}}catch(e){if(live)setError(e instanceof Error?e.message:'Catalog unavailable')}};void refresh();const timer=setInterval(refresh,4000);return()=>{live=false;clearInterval(timer)}},[]);
 return {catalog,error};
}
export function useEvents(token:string,reconnectKey=0){
 const [events,setEvents]=useState<MeshEvent[]>([]);const [connection,setConnection]=useState('Not connected');const [broker,setBroker]=useState<BrokerState>();const generation=useRef(0);
 useEffect(()=>{const gen=++generation.current;setEvents([]);setBroker(undefined);if(!token){setConnection('Choose a demo identity');return}let ws:WebSocket;let timer:ReturnType<typeof setTimeout>;let stopped=false;
 function connect(){setConnection('Connecting');ws=new WebSocket(`${location.protocol==='https:'?'wss':'ws'}://${location.host}/api/events`);ws.onopen=()=>ws.send(JSON.stringify({token}));ws.onmessage=message=>{if(gen!==generation.current)return;try{const data=JSON.parse(message.data);setConnection('Live');if(data.type==='broker'&&data.broker){setBroker(data.broker as BrokerState);return}const incoming:MeshEvent[]=data.type==='history'&&Array.isArray(data.events)?data.events:data.type==='event'?[data.event]:[];setEvents(previous=>mergeEvents(previous,incoming))}catch{setConnection('Invalid event')}};ws.onclose=()=>{if(!stopped){setConnection('Reconnecting');timer=setTimeout(connect,3000)}};ws.onerror=()=>ws.close()}
 connect();return()=>{stopped=true;clearTimeout(timer);ws?.close()};},[token,reconnectKey]);
 return {events,connection,broker};
}

/** Poll the read-only metric summary. Values come from Prometheus, never guessed. */
export function useMetrics(){
 const [metrics,setMetrics]=useState<MetricsSnapshot>();
 useEffect(()=>{let live=true;const refresh=async()=>{try{const response=await fetch('/api/learn/metrics',{cache:'no-store'});const data=await response.json() as MetricsSnapshot;if(live)setMetrics(data)}catch{if(live)setMetrics({enabled:true,reachable:false,reason:'Metric source unreachable'})}};void refresh();const timer=setInterval(refresh,10000);return()=>{live=false;clearInterval(timer)}},[]);
 return metrics;
}
