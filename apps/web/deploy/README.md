# Web deployment configuration

Everything in this folder belongs to Kubernetes/Helm deployment. Application source and the Dockerfile are one directory above.

| Change | File |
|---|---|
| Replica count, image tag, resources, route settings for staging | `environments/stg/values.yaml` |
| The same settings for production simulation | `environments/prd/values.yaml` |
| Non-secret process environment | `environments/<env>/config.yaml` |
| Document optional sensitive env variables | `environments/<env>/secrets.example.yaml` |
| Default settings and supported configuration | `helm/values.yaml` |
| Kubernetes process and injection wiring | `helm/templates/deployment.yaml` |
| Non-secret env resource | `helm/templates/config/config-map.yaml` |
| Optional secret env resource | `helm/templates/config/env-secret.yaml` |
| Network routing and connection settings | `helm/templates/routes/` |
| Istio workload access policies | `helm/templates/security/` |

Environment files are wrapped under `web:` because the root chart loads this chart as its `web` dependency. They are values inputs, not manifests for `kubectl apply`.

## Runtime injection

`environments/stg/config.yaml` → Helm → `web-config` ConfigMap → Deployment `envFrom.configMapRef` → running process environment. The chart injects `APP_ENV` from `global.environment`. The chart also computes `INTERNAL_API_URL` from the environment namespace. `SITE_TITLE` and `UPSTREAM_TIMEOUT_MS` are configured in the environment file. Server routes read `process.env`; `/api/runtime-config` exposes only the title and environment to the browser. No `NEXT_PUBLIC_*` variables or environment-specific build arguments are required.

Optional sensitive variables: ignored `.local/<env>/web-secrets.yaml` → Helm `secrets` values → `web-env` Secret → Deployment `envFrom.secretRef`. No env Secret is created when `secrets` is empty. Use `existingEnvSecret` for an externally managed Secret instead. Config and chart-managed Secret checksums trigger a rollout automatically; external Secret updates need an explicit restart.

The same Docker image runs in both environments. These deployment files and local secrets are excluded from Docker build contexts.

## Commands (run at repository root)

```sh
make config APP=web ENV=stg
make deploy ENV=stg
make build APP=web
make restart APP=web ENV=stg
make logs APP=web ENV=stg
```

`make deploy` upgrades the root environment release, which owns all application charts. It does not reinstall unchanged pods. The examples under `.local/` are relative to the repository root; actual secret values must not be committed.

## Protocol playground, demo tokens and WebSockets

The runtime Node entrypoint is `server.cjs`, which serves Next.js and bridges same-origin WebSocket upgrades at `/api/events` to the internal gateway. It receives the token in the first frame, applies it as an Authorization header upstream, and closes slow consumers. Native gRPC uses the bundled `proto/shipping.proto` and the same gateway DNS/explicit mTLS SNI.

`demoTokens.enabled` defaults to false; both local environment overrides enable it. The root chart owns the dedicated `web-demo-tokens` Secret, mounted at `/etc/mesh-demo/tokens.json`. `/api/demo-token` is a same-origin POST that returns one selected local demo role token with no-store headers; it is deliberately open demo access, not real authentication. Mounted secret updates are read per request after Kubernetes propagates them. Browser tokens stay in memory.

## Learning descriptor contract

The studio discovers application names from local dependencies in `deploy/helm/platform/Chart.yaml`. Every discovered app appears in navigation and topology. An optional `apps/<app>/learn.yaml` supplies:

```yaml
title: Product catalog
description: Browse products and prices.
operations:
  - id: list
    title: Get catalog
    protocol: rest
    method: GET
    path: /catalog
    input: {}
    examples:
      - title: Successful REST access
        identity: reader
        input: {}
steps:
  - id: handler
    title: Execute the operation
    description: Business code runs after the mesh allows access.
    detail: Missing telemetry does not prove that this handler was skipped.
    sources:
      - file: apps/catalog/main.go
        anchor: func main()
        context: 4
```

Operation IDs are unique lowercase identifiers. Protocols are `rest`, `graphql`, and `grpc`; fixed gateway paths permit GET or POST, with POST required for GraphQL/gRPC. Inputs and example inputs are JSON objects. Example `identity` may select a local demo role; never put a credential in descriptors. GraphQL inputs contain `query` and `variables`. gRPC additionally requires an app-relative `proto`, fully qualified `rpcService`, and `rpcMethod`; the request path must match that contract. The server loads the activated Protobuf definition and the form derives fields from its request message.

Steps use stable IDs (`browser`, `next`, `gateway`, `envoy`, `authz`, `handler`, `response`, `events` for the built-in journey). References use approved repository-relative file IDs. `{env}` resolves to the selected environment. `anchor` must uniquely match a line; optional `end` uniquely matches after it, or `context` includes following lines. Rendered resource references use an optional YAML `pointer`, such as `/spec/trafficPolicy/tls`. Missing or ambiguous registered anchors and missing rendered fields fail validation. The viewer never accepts filesystem paths outside the generated allowlist.

Source files are bounded to 160,000 bytes, uncompressed bundles to 8 MB, and base64 compressed workspace/active bundles to 700,000 bytes each and 900,000 combined. `.local`, `.env`, dependency archives, symlinks and secret input files are excluded. Resolved Secrets are never published. Sensitive YAML/JSON keys are redacted; only approved source belongs in these public learning artifacts.

`make learn-sync ENV=stg` publishes through the dedicated `study-learning` Helm release. `make learn-watch ENV=stg` shares the existing watcher's debounce behavior and deployment lock. Source refresh preserves inspector selection and active operations; changed operation definitions need an explicit `make deploy`. Web reads both files from one atomic projected-volume generation and retains its last readable bundle on transient errors. Kubernetes propagation may take roughly a minute before the browser's four-second poll sees a change.

`SOURCE_REVISION` is a non-secret build argument containing an application source digest. Web reads `/app/source-revision.txt`; Go publishers attach the digest to events. This metadata identifies build inputs, independently from runtime `SERVICE_VERSION` and synchronized workspace source. It never contains environment credentials.

The learning studio discovers this chart and reads optional `../learn.yaml`. See [the descriptor contract](../../web/deploy/README.md#learning-descriptor-contract). Source-only updates use `make learn-sync ENV=stg`; activate operation changes with `make deploy`. Image tags are selected explicitly in environment values: use that tag when rebuilding and restarting this app, or update the selected tag before deployment.
