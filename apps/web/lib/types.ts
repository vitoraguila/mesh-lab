export type ServiceName = string;
export interface DemoResult {
 service: ServiceName;
 operation?:string;
 requestId: string;
 status: number;
 grpcCode?: number;
 latencyMs: number;
 body: unknown;
}
export type MeshEvent = {
 eventId?:string;requestId:string;service:string;stage:string;path:string;status?:number;
 statusKind?:"http"|"grpc";time:string;environment:string;sourceRevision?:string;
 // Transport metadata, present only for the path the event actually took.
 transport?:"amqp"|"http";exchange?:string;routingKey?:string;queue?:string;publishedAt?:string;deliveredAt?:string;
};
export type MetricsSnapshot = {
 enabled:boolean; reachable?:boolean; reason?:string; at?:string;
 handled?:Record<string,number>; published?:Record<string,number>;
 decisions?:Record<string,number>; latency?:Record<string,number>;
};
export type BrokerState = {
 enabled:boolean;connected:boolean;exchange:string;queue:string;
 depth:number;consumers:number;delivered:number;ingested:number;since:string;
};
