# Events deployment configuration

This independent Go application owns its Helm chart, routes, security policies, and stg/prd configuration under this folder. It is composed into the environment's study release, not installed independently.

The app listens on HTTP 8080 with `/healthz`, a workload-only POST `/ingest` endpoint, and a gateway-only WebSocket `/events` endpoint. It also consumes the environment's RabbitMQ queue, which is the normal transport; `/ingest` remains the direct fallback. Ingestion ALLOW policies list exact environment-local producer service accounts. The WebSocket route also requires CUSTOM authorization; both demo roles have access. No public route exposes ingestion. Web bridges browser connections through the internal gateway, preserving central authorization and namespace mTLS.

`helm/values.yaml` and `environments/<env>/values.yaml` own image, resources and route settings. The WebSocket route omits its overall timeout when configured as `0s`, which disables the timeout without violating the Istio CRD duration validation. `config.yaml` is runtime-only; credentials are never built into images. As with other apps, env maps become ConfigMaps/optional Secrets, and checksums trigger rollouts.

`broker.enabled` binds the durable queue named by the `mesh-broker` ConfigMap and authenticates with the `mesh-broker-credentials` Secret, both owned by the root platform chart. Deliveries are acknowledged after fan-out and each one is stamped with its exchange, queue and delivery time, so the studio can show real publish-to-deliver latency. Queue depth is read with a passive queue declaration on a second channel; no management plugin is enabled. A broker outage leaves the WebSocket connected and reporting `connected: false`.

Keep exactly one replica per environment: this service uses an in-memory pub/sub hub with a 200-event replay ring, 256-event client queues, and at most 50 subscribers. Slow clients may lose events; reconnecting replays the current ring. Restarts clear history. It is intended for observation, not an audit log or durable broker. GraphQL/gRPC/business/authz event publishers remain nonblocking when this service is unavailable.

Use `make build APP=events`, `make deploy ENV=stg`, and `make logs APP=events ENV=stg`. `make watch ENV=stg` watches this chart and its selected environment configuration.

The learning studio discovers this chart and reads optional `../learn.yaml`. See [the descriptor contract](../../web/deploy/README.md#learning-descriptor-contract). Source-only updates use `make learn-sync ENV=stg`; activate operation changes with `make deploy`. Image tags are selected explicitly in environment values: use that tag when rebuilding and restarting this app, or update the selected tag before deployment.
