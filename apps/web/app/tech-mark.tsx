"use client";
import type {MarkId} from "../lib/tech";

/**
 * Simplified marks for the technologies on the map. These are drawn here as
 * plain geometry so the page ships no third-party image assets and works with
 * no network access; each one is always shown next to its written name.
 */
export default function TechMark({mark, size = 34}:{mark:MarkId; size?:number}){
 return (
  <span className={`tech-mark mark-${mark}`} style={{width:size, height:size}} aria-hidden="true">
   <svg viewBox="0 0 32 32" width={size} height={size}>{shape(mark)}</svg>
  </span>
 );
}

/** The same mark, drawn inside an existing SVG scene. */
export function TechGlyph({mark, x, y, size}:{mark:MarkId; x:number; y:number; size:number}){
 const scale = size / 32;
 return (
  <g className={`tech-mark mark-${mark}`} transform={`translate(${x - size / 2},${y - size / 2}) scale(${scale})`}>
   {shape(mark)}
  </g>
 );
}

function polygon(sides:number, radius:number, rotate:number){
 return Array.from({length:sides}, (unused, i) => {
  const angle = rotate + (Math.PI * 2 * i) / sides;
  return `${(16 + Math.cos(angle) * radius).toFixed(2)},${(16 + Math.sin(angle) * radius).toFixed(2)}`;
 }).join(" ");
}

function shape(mark:MarkId){
 switch(mark){
  case "kubernetes":
   // The helm wheel: a seven sided badge with seven spokes.
   return (
    <g className="glyph">
     <polygon className="brand" points={polygon(7, 14, -Math.PI / 2)}/>
     <polygon className="knock" points={polygon(7, 11.4, -Math.PI / 2)}/>
     <polygon className="brand" points={polygon(7, 10.2, -Math.PI / 2)}/>
     <circle className="knock" cx="16" cy="16" r="4.6"/>
     {Array.from({length:7}, (unused, i) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * i) / 7;
      return (
       <line
        key={i}
        className="knock-stroke"
        x1={16 + Math.cos(angle) * 4.6}
        y1={16 + Math.sin(angle) * 4.6}
        x2={16 + Math.cos(angle + 0.26) * 9.6}
        y2={16 + Math.sin(angle + 0.26) * 9.6}
       />
      );
     })}
    </g>
   );
  case "istio":
   // The sail: a filled triangle beside a mast, on a rounded badge.
   return (
    <g className="glyph">
     <circle className="brand" cx="16" cy="16" r="14"/>
     <path className="knock" d="M20.5 5 L20.5 22.5 L9 22.5 Z"/>
     <path className="knock" d="M22.5 24.5 H9.5 v2 h13 z"/>
    </g>
   );
  case "envoy":
   return (
    <g className="glyph">
     <polygon className="brand" points={polygon(6, 14, Math.PI / 6)}/>
     <path className="knock" d="M11 10 H22 v3 H14.5 v2.5 H21 v3 H14.5 V21 H22 v3 H11 z"/>
    </g>
   );
  case "nextjs":
   return (
    <g className="glyph">
     <circle className="brand" cx="16" cy="16" r="14"/>
     <path className="knock" d="M11.4 22.6 V9.4 h2.6 l8 11.4 V9.4 h2.2 v13.2 h-2.5 l-8.1 -11.5 v11.5 z"/>
    </g>
   );
  case "go":
   // The Go wordmark in Go blue.
   return (
    <g className="glyph">
     <rect className="brand-soft" x="1" y="8" width="30" height="16" rx="8"/>
     <text className="wordmark" x="16" y="21.5" fontSize="12">Go</text>
    </g>
   );
  case "node":
   // Node's hexagon, filled in Node green.
   return (
    <g className="glyph">
     <polygon className="brand" points={polygon(6, 14, -Math.PI / 2)}/>
     <path className="knock" d="M12 11 h2.4 l5 7.6 V11 H22 v10 h-2.4 l-5 -7.6 V21 H12 z"/>
    </g>
   );
  case "python":
   // Two interlocking halves, blue above and yellow below.
   return (
    <g className="glyph">
     <path className="brand" d="M15.6 2.5 c-3.4 0 -6.2 1 -6.2 3.6 v3.4 h6.4 v1 H6.6 c-2.6 0 -4.1 2.2 -4.1 5.5 s1.5 5.5 4.1 5.5 h2.3 v-3.9 c0 -2.8 2.3 -5 5 -5 h6.3 c2.3 0 4.1 -1.8 4.1 -4.1 V6.1 c0 -2.3 -1.9 -3.6 -4.3 -3.6 z m-3.6 2.6 a1.3 1.3 0 1 1 0 2.6 a1.3 1.3 0 0 1 0 -2.6 z"/>
     <path className="accent" d="M16.4 29.5 c3.4 0 6.2 -1 6.2 -3.6 v-3.4 h-6.4 v-1 h9.2 c2.6 0 4.1 -2.2 4.1 -5.5 s-1.5 -5.5 -4.1 -5.5 h-2.3 v3.9 c0 2.8 -2.3 5 -5 5 h-6.3 c-2.3 0 -4.1 1.8 -4.1 4.1 v3.4 c0 2.3 1.9 3.6 4.3 3.6 z m3.6 -2.6 a1.3 1.3 0 1 1 0 -2.6 a1.3 1.3 0 0 1 0 2.6 z"/>
    </g>
   );
  case "rabbitmq":
   // The three pipes and the body, in RabbitMQ orange.
   return (
    <g className="glyph">
     <rect className="brand" x="3" y="3" width="26" height="26" rx="6"/>
     <path className="knock" d="M8 8 h4.2 v8.4 h3.6 V8 H20 v8.4 h2.4 a1.6 1.6 0 0 1 1.6 1.6 V24 h-16 z"/>
     <rect className="brand" x="17.6" y="19.4" width="3.4" height="3" rx="1"/>
    </g>
   );
  case "prometheus":
   // The torch flame above its base, in Prometheus red.
   return (
    <g className="glyph">
     <circle className="brand" cx="16" cy="16" r="14"/>
     <path className="knock" d="M16 4.5 c3.6 4.2 1.2 6.6 2.6 9 c1.1 1.9 3.4 2.8 3.4 5.6 a6 6 0 0 1 -12 0 c0 -3.4 2.6 -4.4 3.2 -7.4 c1.4 1.4 2 2.8 2 4.2 c1 -3.6 0.4 -7.4 0.8 -11.4 z"/>
     <rect className="knock" x="9.4" y="21.6" width="13.2" height="2.6" rx="1.3"/>
     <rect className="knock" x="11.6" y="25" width="8.8" height="2.4" rx="1.2"/>
    </g>
   );
  case "grafana":
   // The flame mark, in Grafana orange.
   return (
    <g className="glyph">
     <circle className="brand" cx="16" cy="16" r="14"/>
     <path className="knock" d="M16 4 c-3 2.4 -3.6 5 -3 7 c-2.4 -0.4 -3.6 0.8 -4 2 c1.6 -0.4 2.6 0 3.2 0.6 c-2.4 1.2 -3.4 3 -3.4 5.2 a7.2 7.2 0 0 0 14.4 0 c0 -4 -2.8 -6 -5.4 -6.6 c2 -0.6 3.4 -0.2 4.4 0.4 c-0.4 -2.6 -3 -4 -5 -4 c1 -1.8 0.6 -3.4 -1.2 -4.6 z m0 10.6 a4.4 4.4 0 1 1 0 8.8 a4.4 4.4 0 0 1 0 -8.8 z"/>
    </g>
   );
  case "graphql":
   // The connected hexagon, in GraphQL pink.
   return (
    <g className="glyph">
     <polygon className="brand-stroke" points={polygon(6, 11, -Math.PI / 2)}/>
     <path className="brand-stroke" d="M16 5 L6.5 21.5 H25.5 z"/>
     {[0, 1, 2, 3, 4, 5].map(i => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * i) / 6;
      return <circle key={i} className="brand" cx={16 + Math.cos(angle) * 11} cy={16 + Math.sin(angle) * 11} r="3"/>;
     })}
    </g>
   );
  case "grpc":
   return (
    <g className="glyph">
     <polygon className="brand" points={polygon(6, 14, 0)}/>
     <path className="knock" d="M10 16 h9 M15.5 11.5 L20 16 l-4.5 4.5" style={{fill:"none", stroke:"#06101c", strokeWidth:2.4, strokeLinecap:"round", strokeLinejoin:"round"}}/>
    </g>
   );
  case "service":
   // Deliberately generic: an unlabelled container, for a language this page
   // has no mark for. Better an honest blank than someone else's logo.
   return (
    <g className="glyph">
     <rect className="brand-soft" x="3" y="6" width="26" height="20" rx="5"/>
     <rect className="brand-stroke" x="3" y="6" width="26" height="20" rx="5"/>
     <path className="brand-stroke" d="M10 12 h12 M10 16 h12 M10 20 h7"/>
    </g>
   );
  case "browser":
   return (
    <g className="glyph">
     <rect className="brand-soft" x="2" y="5" width="28" height="22" rx="4"/>
     <rect className="brand-stroke" x="2" y="5" width="28" height="22" rx="4"/>
     <path className="brand-stroke" d="M2 12 H30"/>
     <circle className="brand" cx="7" cy="8.5" r="1.5"/>
     <circle className="brand" cx="12" cy="8.5" r="1.5"/>
    </g>
   );
  default:
   // A socket: the signal arcs of a live connection.
   return (
    <g className="glyph">
     <circle className="brand" cx="16" cy="16" r="4"/>
     <path className="brand-stroke" d="M9.5 9.5 a9 9 0 0 0 0 13 M22.5 9.5 a9 9 0 0 1 0 13 M5 5 a15 15 0 0 0 0 22 M27 5 a15 15 0 0 1 0 22"/>
    </g>
   );
 }
}
