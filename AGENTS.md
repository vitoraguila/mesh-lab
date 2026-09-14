# Agent guide: Mesh Lab

## Purpose and user preferences

This repository is a runnable local Kubernetes case study, intended for ongoing experimentation. It contains a Next.js frontend, three small independent Go business APIs, and a shared authorization service. Helm manages deployment; Istio provides internal routing, workload identity, mTLS, and centralized authorization.

Preserve these explicit user preferences:

- Keep the frontend on modern Next.js with **strict TypeScript**. The implemented version is 16.3.4; verify the current release before any future upgrade and update the lockfile deliberately.
- Keep business authorization out of each microservice's application code. Enforce it through Istio and the shared authz layer.
- Make configuration granular and easy to find: each app owns its deployment manifests, routes, security policies, runtime configuration, and environment overrides.
- Put Kubernetes/Helm configuration under a clearly named **`deploy/`** folder, both per application and at repository root.
- Support **`stg` and `prd`** with independent settings and credentials.
- Use Helm templates and Make commands for repeatable operations. Avoid replacing explicit per-app manifests with one opaque loop over all applications.
- Automatically choose another local port when the preferred port-forward port is occupied.

Read [README.md](README.md), [deploy/README.md](deploy/README.md), and the relevant app's `deploy/README.md` before changing that area. Update these documents when behavior or ownership changes.

## Local cluster boundary

**Both `stg` and `prd` are namespaces in the local Minikube profile/context `mesh-study`.** `prd` is a local production simulation, not a remote production cluster.

The user's kubeconfig also contains a real remote EKS production context. Do not rely on the currently selected context when inspecting or changing cluster resources for this project. Always use the project Make targets or explicitly select `--context=mesh-study` / `--kube-context=mesh-study` / `minikube -p mesh-study`.

- Preserve unrelated clusters, Docker containers, namespaces, files, and running processes.
- `make cluster` uses `--keep-context` so startup does not silently change the active context.
- Use `make use ENV=stg` or `make use ENV=prd` when deliberately switching the user's local namespace.
- `make stop` stops this local profile; `make delete` destroys the entire local profile. Do not use deletion as routine troubleshooting.
- Do not create hidden, persistent background forwards unnecessarily. Prefer the documented foreground command and tell the user the actual URL.
- Do not kill an arbitrary process to free a port. The forwarding helper automatically finds an available port.

The earlier single-environment namespace `mesh-study` and its app/gateway releases were replaced by `stg` and `prd`. The **cluster context remains `mesh-study`**. Do not recreate the old namespace/layout as the default.

## Repository map

```text
apps/
  web/                        Next.js App Router, TypeScript, Dockerfile
  catalog/                    Independent Go module + Dockerfile
  orders/                     Independent Go module + Dockerfile
  inventory/                  Independent Go module + Dockerfile
  payments/                   Node.js REST API: server.js, telemetry.js, Dockerfile
  reviews/                    Python REST API: main.py, telemetry.py, Dockerfile
  authz/                      Shared Go authorization service + tests
  rabbitmq/                   Event broker: deploy folder only, upstream image, no source
  prometheus/                 Metric collection: deploy folder only, upstream image
  grafana/                    Dashboards: deploy folder only, upstream image
  shared/httpapi/             Shared Go HTTP lifecycle utility; no auth logic
  shared/telemetry/           Shared Go event publisher: AMQP transport, HTTP fallback

# Every deployable app above has:
apps/<app>/deploy/
  README.md                   App-specific configuration/injection guide
  helm/
    Chart.yaml
    values.yaml               App defaults
    values.schema.json
    templates/
      deployment.yaml
      service.yaml
      service-account.yaml
      config/
        config-map.yaml
        env-secret.yaml
      routes/                 App-owned Istio route/connection resources
      security/               App-owned access policies
  environments/
    stg/
      values.yaml             Image, replicas, resources, routing overrides
      config.yaml             Non-sensitive runtime variables
      secrets.example.yaml    Documentation only, never auto-loaded
    prd/                      Equivalent production-simulation overrides

# Authz additionally owns templates/secret.yaml and per-env policy.yaml.
deploy/
  helm/platform/              Root chart: app dependencies, general route, mesh boundary
  helm/namespaces/            Helm-managed stg/prd namespace provisioning
  environments/{stg,prd}/     Shared topology and gateway overrides
  istio/                     Official Istio chart values
scripts/                     Credential generation, Helm layering, forwarding, checks
Makefile                     Supported operator commands
.local/                      Ignored credentials and local artifacts
```

The Go apps are individual modules, assembled locally by `go.work`. Each references the shared HTTP module with `replace ... => ../shared`. Go Dockerfiles use the **repository root** as build context; the web Dockerfile uses **`apps/web`**.

Do not restore the obsolete `apps/services`, `charts/case-study`, top-level `infra`, or app-level ungrouped `helm`/`environments` directories. Any `.local/migration` content is an ignored historical backup, not the source of truth.

## Helm ownership and composition

Shared releases in `istio-system`:

- `mesh-namespaces`: provisions `stg` and `prd` with sidecar injection. Namespace resources carry a keep annotation to avoid cascading removal when uninstalling the provisioning release.
- `istio-base`: official Istio CRDs/base chart.
- `istiod`: shared control plane, with one external authorization provider per environment.

Each environment namespace has:

- `internal-gateway`: official Istio gateway Deployment/Service.
- `study`: root `platform` chart, which owns all five application subcharts and the shared environment routing/security resources.

App charts are separate source folders but **not separate Helm releases** under the current design. Do not independently install an app chart into a namespace where `study` already owns those resources. `make deploy` upgrades the whole selected environment; Kubernetes rolls only Deployments whose pod templates changed.

`deploy/helm/platform/Chart.yaml` uses dependencies such as `file://../../../apps/catalog/deploy/helm`. Paths are relative to the root chart directory, not the shell's working directory. They remain portable if the repository structure is preserved. `make deps` packages them into ignored `deploy/helm/platform/charts/`; edit original app charts, never generated archives. Keep Chart versions and dependency declarations consistent. For separate repositories, use a published Helm/OCI chart registry rather than these local paths.

## Request path and security invariants

```text
Browser → web /api/demo → web Envoy → environment internal gateway
        → root VirtualService → app-owned delegate → API Envoy → Go API
                                                    ↓ authorization check
                                                 environment authz
```

```text
Producers (APIs + authz) → rabbitmq exchange mesh.events → queue mesh.events.<env>
                        → events consumer → gateway → web WebSocket bridge → Browser
```

- Browser access uses loopback-only port-forward to `svc/web:3000`.
- Next.js server-side aggregation forwards the caller's bearer token to `/catalog`, `/orders`, and `/inventory` on one environment-local internal gateway DNS name.
- The internal gateway Service maps port 80 to its 8443 `ISTIO_MUTUAL` listener. Web uses an HTTP URL; its sidecar originates mTLS using the app-owned DestinationRule and **explicit matching SNI**. Removing SNI previously caused `filter_chain_not_found` / connection resets.
- The root general route is `deploy/helm/platform/templates/routes.yaml`. It delegates to app-owned VirtualServices. Delegates omit `hosts` and `gateways`; their exact path matches must be subsets of the root prefix matches. Use only one level of delegation.
- Gateway selectors include the environment label. Routing resources are exported within their namespace.
- Namespace-wide strict mTLS and default-deny authorization are owned by the root chart.
- Each business API owns an `ALLOW` policy permitting its environment's gateway identity and a `CUSTOM` policy invoking its environment's authorization provider. **Both must pass.**
- Authz accepts checks only from its environment's API service accounts. Providers are `study-authz-stg` and `study-authz-prd`, configured in `deploy/istio/istiod-values.yaml`.
- External authorization is fail-closed: a provider outage returns 503. Do not enable `failOpen` to work around deployment problems.
- Missing/invalid credentials return 403. Admin can read all APIs; reader can read catalog/inventory but not orders. Other-environment tokens must be denied.
- Direct web-to-API calls with a valid token and forged identity header must still be denied. A client-supplied identity header never grants access.
- Health probes are rewritten by Istio. Keep sidecar injection, probe wiring, and workload identities intact when changing Deployments.
- Telemetry travels over AMQP to the environment's own RabbitMQ. Its Service port is named `tcp-amqp`, so Istio treats it as TCP: `security/allow-clients.yaml` can authorize by workload identity and port only, and there is no CUSTOM check and no gateway route for the broker. This contrast with the HTTP services is deliberate teaching material; do not "fix" it by adding an HTTP route.
- Publishing is best effort and must never block or fail a business request. A broker outage drops events; it does not change any response.
- Three languages sit behind one policy: Go, Node.js (`payments`) and Python (`reviews`). A new runtime must reproduce the same contract — `/healthz`, its business path, `/metrics` in Prometheus exposition, the `telemetry.Event` JSON shape, and the `<environment>.<service>.<stage>` routing key — and must contain no authorization logic. Registering a service means updating its chart, the root chart dependency list and route index, `authz` paths and allowed service accounts **in both `values.yaml` and each environment's `policy.yaml`**, the rabbitmq producer list, the events ingest list, the Makefile app list, and the smoke and playground expectations together.
- Metrics are pulled, never pushed. Each application serves `/metrics` on its own port; the sidecar scrapes it locally and merges it into `:15020/stats/prometheus`, which is exempt from mTLS and AuthorizationPolicy. Prometheus therefore needs one target per pod and no credentials. Keep `meshConfig.enablePrometheusMerge` on and keep the `prometheus.io/*` pod annotations.
- Prometheus discovery is namespace scoped: a Role and RoleBinding in its own environment, never a ClusterRole. It is the only workload in the study that mounts a service account token.
- The browser never reaches Prometheus. `apps/web/app/api/learn/metrics/route.ts` runs a fixed allowlist of queries server-side; never accept PromQL from the client.
- The broker login is generated per environment by `make secrets` into ignored `.local/<env>/rabbitmq-secrets.json`. The root chart publishes it as the `mesh-broker-credentials` Secret and the non-secret topology as the `mesh-broker` ConfigMap. Never put the exchange, queue or address into the Secret, and never put the password into the ConfigMap.

`/api/demo` itself returns HTTP 200 with an array of upstream statuses; inspect each result rather than treating the aggregate status as proof of authorization success.

This is a mock-data, static-token learning environment. Kubernetes admin, pod exec, and port-forward permissions are trusted administrative capabilities; mesh policy is not protection against those administrators. No persistent application database or real login system is implemented.

## Environment variables and credentials

**Build once, configure at runtime.** Do not bake environment-specific values or secrets into Docker build args, image ENV instructions, or frontend bundles. Docker build contexts exclude `deploy/`, `.local/`, and `.env` files.

The authoritative merge order is in `scripts/helm_environment.py`:

1. App chart defaults and root chart defaults.
2. `deploy/environments/<env>/values.yaml`.
3. Each app's `deploy/environments/<env>/values.yaml`, `config.yaml`, and optional `policy.yaml`.
4. For actual deployment only, `.local/<env>/<app>-secrets.json` then `.yaml`, if present.
5. Explicit `TAG=...`, if supplied, overrides every app image tag for that invocation.

App environment inputs are wrapped under their dependency name, e.g. `catalog: {config: ...}`. Example secret files are never automatically loaded. Render/lint use dummy authz credentials and do not load local secrets.

Injection mechanisms:

- App `config` → `<app>-config` ConfigMap → Deployment `envFrom.configMapRef` → process environment.
- Optional app `secrets` → `<app>-env` Secret → Deployment `envFrom.secretRef`. Empty maps create no placeholder Secret.
- `existingEnvSecret` supports a separately managed Secret instead. Do not combine it with chart-managed `secrets`.
- ConfigMap and chart-managed Secret checksums trigger app rollouts. Externally managed Secret content changes require an explicit restart.
- Reserved chart-managed keys (`APP_ENV`, `HTTP_PORT`, `INTERNAL_API_URL`) cannot be overridden in `config` or chart-managed env secrets. Conflicting config/secret keys are rejected.
- Authz credentials take a different path: `.local/<env>/authz-secrets.json`, under `authz.credentials`, is combined with allowed paths into the `authz-policy` Secret and mounted read-only at `/etc/authz/policy.json`. `AUTHZ_POLICY_PATH` selects it. Policy/credential changes roll authz through a checksum.

`make secrets ENV=...` generates missing authz credentials with file mode 0600 and preserves existing ones. `make tokens ENV=...` intentionally prints them for the user. Never put real credentials in documentation, commits, routine logs, test fixtures, or rendered manifest output. Helm release history and Kubernetes Secrets contain credentials; handle their output accordingly.

Implemented process settings:

| App | Setting | Purpose |
|---|---|---|
| All | `APP_ENV` | Environment identity |
| Go apps | `HTTP_PORT` | Chart-managed 8080 listener |
| Go apps | `READ_TIMEOUT_SECONDS` | Positive request-read timeout |
| Go apps | `SHUTDOWN_TIMEOUT_SECONDS` | Positive graceful shutdown timeout |
| Business APIs | `SERVICE_VERSION` | API response label, not image provenance |
| Authz | `AUTHZ_POLICY_PATH` | Mounted policy file location |
| Web | `INTERNAL_API_URL` | Server-only environment-local gateway URL |
| Web | `UPSTREAM_TIMEOUT_MS` | Server-side fetch timeout |
| Web | `SITE_TITLE` | Public runtime title |

Next.js server routes read `process.env` at request time. `/api/runtime-config` deliberately exposes **only** `environment` and `title`, with no caching. Do not return all of `process.env`. No environment-specific `NEXT_PUBLIC_*` build variables are used; those would prevent promoting the same frontend image between environments. Browser bearer tokens stay in page memory.

Demo identity acquisition is a visible learning concept and must remain documented in the studio for every service and protocol. When the user selects Demo admin or Demo reader, the browser calls the same-origin `POST /api/demo-token`; the Next.js route reads the selected value from the read-only `/etc/mesh-demo/tokens.json` mount and returns only that role's static local token. The browser keeps the token in page memory and Next.js forwards it as a bearer token to the environment gateway. No login, OIDC, OAuth, password flow, or persistent browser storage is implemented. Missing credentials deliberately send no Authorization header, invalid credentials use a known invalid value, and custom credentials come from the expandable token controls. The request identity is separate from the observer identity so testing credentials does not disconnect event observation.

The request workspace must show this flow before the operation form for REST, GraphQL, gRPC, and infrastructure selections: Browser chooses role → Next.js adds bearer → destination Envoy and shared authz decide. Keep the source of the token and its in-memory handling clear to learners; do not expose credentials in events, source catalogs, runtime config, logs, or documentation. The implementation lives in `apps/web/app/api/demo-token/route.ts`, `deploy/helm/platform/templates/demo-tokens.yaml`, and the identity explainer in `apps/web/app/studio.tsx`.

## Frontend structure and its contract

```text
apps/web/lib/world.ts        Pure scene geometry + animation legs. Wide and narrow layouts.
apps/web/lib/journey.ts      Event merge, outcome and evidence reducer. Covered by check_journey.cjs.
apps/web/app/mesh-world.tsx  SVG scene + requestAnimationFrame packet engine (no WebGL, no library).
apps/web/lib/tech.ts         Plain-language explanation of each technology on the map.
apps/web/app/tech-mark.tsx   Hand-drawn marks in each project's brand colours; no third-party assets.
apps/web/app/layers-panel.tsx  Cluster down to container, read from the rendered manifests.
apps/web/app/studio.tsx      Orchestrator: request dispatch, panels, flight log, layout.
apps/web/app/journey-view.tsx   DOM step-by-step journey, replay controls.
apps/web/app/source-inspector.tsx  Approved source, rendered YAML, provenance.
```

Rules for this area:

- The map's motion is a **configured explanation**. It may never invent a decision: a parcel parks at the authorization branch until a correlated `authz` event or the actual response resolves it. Never synthesize proxy spans or handler execution.
- The interface stores nothing. There is no progress, no saved panel state, and no credential ever reaches browser storage.
- Nodes must stay clickable: anything that animates its own geometry belongs outside the clickable group, or the node's bounding box never settles and clicks are rejected. That is why the ping circles live in their own layer.
- Panels are overlays measured at runtime (`--chrome-h`, `--drawer-right`, `--drawer-bottom`), so the scene always keeps clear of them. Do not hard-code those sizes.
- Packet positions are written imperatively inside one animation frame; React state is not used per frame. Keep it that way or the map will drop frames with several concurrent runs.
- `prefers-reduced-motion` disables the animation engine entirely. The journey panel is the complete non-animated account and must keep working on its own.

`scripts/check_studio.cjs` drives the real interface and depends on exact accessible names and class hooks. It opens the `Console` and `Inspector` panels first, because the map alone is the default view, and those two share one right-hand column — the test selects the tab it needs through `.side-tabs` before touching either. It also opens the left `Send` column and exercises the per-service eye toggles, so `Send`/`Hide send`, `Hide <service id>` and `Show all` are load-bearing accessible names. Eye toggles are labelled with the service **identifier**, never the title, so `Hide inventory` cannot collide with the `Stock & availability` dock entry. Before renaming anything in the workspace, re-check that each of these still resolves to exactly one element: the service dock entries (`Product catalog` must not collide with any other button name), the `Product catalog` heading, `Request identity`, `Run this operation`, `Run all services`, `Replay`, `Next step`, `Previous step`, `Return to live`, `Budget filter`, the exact text `Events live`, the mobile tabs `request`/`journey`/`explain`, and the selectors `.journey-panel`, `.node-next`, `.node-gateway`, `.desktop-inspector`, `.mobile-inspector`, `.source-view`, `.code-line[data-highlight="true"]`, `.run-history`, `.response-section .text-button`, `.send-panel .launch-chip`. Map nodes therefore carry service **identifiers** (`CATALOG`), never service titles.

Several `apps/*/learn.yaml` descriptors anchor source highlights into `apps/web/app/studio.tsx` and `apps/web/lib/upstream.ts` by exact text (for example `async function runOperation`). Renaming those declarations fails `make lint` and `make deploy`; update the anchors in the same change.

Outside production the web server accepts `LEARNING_CATALOG_DIR` as a stand-in for the `/etc/mesh-learning` projected volume, so the interface can be developed without a cluster. It is ignored when `NODE_ENV=production`. Generate a fixture with `scripts/learning_catalog.py`'s `build()` and write gzipped `workspace`/`active` bundles into `<dir>/..data/`.

## Commands

Run Make commands at repository root. `ENV` defaults to `stg`; only `stg`/`prd` are accepted. `APP` accepts web/catalog/orders/inventory/authz where supported.

```sh
make tools                            # Install local CLI tools through Homebrew
make up ENV=stg                       # Cluster, mesh, gateway, build, deploy, restart, smoke
make up-all                           # Bootstrap and verify both environments
make mesh                             # Shared namespaces and Istio control plane
make gateway ENV=prd                  # Selected environment's gateway release
make deploy ENV=stg                   # Regenerate deps and apply selected environment
make build APP=catalog                # Build/load only catalog:dev
make restart APP=catalog ENV=stg      # Roll one Deployment after reusing a tag
make build TAG=experiment-1           # Build all images with a new tag
make deploy ENV=stg TAG=experiment-1  # Deploy explicit tag to the selected environment
make render ENV=prd                   # Manifests with dummy credentials
make config APP=web ENV=stg           # Inspect ConfigMap, not secrets
make tokens ENV=prd                   # Show local prd admin/reader credentials
make logs APP=catalog ENV=stg
make authz-logs ENV=prd
make status ENV=stg
make use ENV=stg                      # Select local context and stg namespace
make port-forward ENV=prd             # Preferred :3001, automatic fallback if occupied
make port-forward ENV=stg PORT=4000   # Start searching for a free port at 4000
```

`make port-forward` uses `scripts/port_forward.py`, which invokes installed `kubectl --context=mesh-study` directly. It binds only `127.0.0.1`, tries up to 100 ports from the requested starting port, handles a bind race, and prints the actual browser URL when ready. Staging starts at 3000; production simulation starts at 3001. Ctrl+C stops forwarding. `make serve` is an alias. Most other targets use Minikube's matching kubectl binary because the host-installed kubectl was older than the cluster at setup.

`rabbitmq`, `prometheus` and `grafana` are deployed but never built: they run upstream images, `make build APP=<name>` refuses, and a command-line `TAG` is not applied to them. Select their versions in `apps/<name>/deploy`. `make logs APP=<name> ENV=...` works like any other app. `make grafana ENV=...` forwards the dashboards to a loopback port and prints the generated login.

A command-line `TAG` is not persisted into environment files. For durable per-app version selection, edit that app's environment `values.yaml`. `make deploy` does not automatically restart unchanged pods when an existing image tag was rebuilt: explicitly restart the app or use a new tag. Config-only changes need deployment, not image rebuilds.

If `kubectl get pods` says no resources in `default`, use `make use ENV=stg`, `kns stg`, or an explicit `-n stg`. If a browser port is occupied, use the automatic forwarding fallback rather than terminating an unrelated process.

## Validation and extension workflow

Use checks appropriate to the change. Documentation-only changes do not require rebuilding the cluster.

- `make test`: Go race tests across workspace modules plus strict frontend type checking. Run `npm ci --prefix apps/web` first if dependencies are missing.
- `make lint`: repackage dependencies and lint both environment configurations.
- `make render ENV=...`: inspect generated manifests without real credentials.
- `make analyze ENV=...`: Istio configuration analysis against the local cluster.
- `make smoke ENV=...`: running-cluster allow/deny checks, direct bypass denial, unauthorized service-account denial, and fail-closed outage behavior. **It temporarily scales authz to zero**, then restores the original replica count and removes its probe pod.
- `make smoke-all`: both smoke suites plus `scripts/check_isolation.py`, verifying public runtime configuration, rejection of other-environment credentials, and cross-namespace workload denial.
- Rebuild the affected image and validate in the browser for frontend or application behavior changes.
- `node scripts/check_studio.cjs <loopback-url>`: full browser acceptance against a running environment. Set `PLAYWRIGHT_MODULE` to the Playwright module path and `CHROME_PATH` to a Chrome binary when Playwright's own browsers are not installed.

**Expired workload certificates look like application bugs.** Istio issues 24-hour workload certificates and rotates them in place, but a laptop that sleeps can carry the cluster past a rotation window. The symptom is never an error in application logs: a long-lived pod keeps working on its established connections while any freshly started client fails its handshake against it. Check the client sidecar (`kubectl logs deploy/<app> -c istio-proxy`) for `CERTIFICATE_VERIFY_FAILED ... certificate has expired` and note which `upstream_cluster` it names — that upstream is the pod to `kubectl rollout restart`, not the client. This has been seen twice: as a blanket `503` from a stale `internal-gateway`, and as authz silently publishing no telemetry because the 24-hour-old `rabbitmq` pod refused its new AMQP connection. `mesh_events_published_total` counts events **queued for** the broker, so it keeps climbing while nothing is actually published; the broker chip in the studio HUD is the honest signal.

During the original implementation, both environment smoke suites, cross-environment isolation, browser admin/reader/missing/invalid flows, mobile layout, Helm lint, server dry-run validation, and Istio analysis passed. A staging-only catalog configuration change was also verified to update its runtime response and roll only catalog without rebuilding or affecting production. Port fallback was verified by occupying a port and checking that the next port served the requested environment. These are historical checks, not evidence that a future modified cluster is healthy. Recheck relevant behavior after changes. Ignored `.local` browser scripts/logs/screenshots are optional artifacts, not required dependencies.

When adding an API, update its app folder/chart/environment files, root chart dependency and route index, Make app list/build/test handling, Helm layering script's app list, authz allowed paths/service accounts, frontend fan-out/types, and smoke expectations together. Maintain environment isolation and central authorization. When changing paths or gateway names, update caller URLs, root prefixes, delegates, provider references and SNI together.

## Version and runtime baseline

At implementation: Kubernetes 1.35.1, Istio 1.30.4, Next.js 16.3.4, React 19.3.0, TypeScript 7.0.2, Go module baseline 1.25.0 with builder image 1.25.5, and Node 22 container images. Consult the Makefile, module files, Dockerfiles, and npm lockfile for the current source of truth. Container base tags are not digest-pinned.

Minikube uses the Docker driver with 4 CPUs and a 5632 MiB memory limit. Staging defaults to one replica per app/gateway; production simulation defaults to two, on the same single node. This is not production high availability. Do not assume CLI versions, active namespaces, running forwards, or pod health remain unchanged across sessions.

## Protocol and live-event extension

The current app set is web, catalog, orders, inventory, graphql, grpc, events, and authz (eight subcharts in each study release). GraphQL owns POST `/graphql`; the gRPC shipping app owns POST `/shipping.v1.ShippingService/Quote`, with native HTTP/2/Protobuf from Next.js and HTTP health on 8081. Reader may use GraphQL, while shipping is admin-only. The canonical proto is `apps/grpc/proto/shipping.proto`; `make proto` regenerates Go and copies the contract into the web build.

The Go events service owns WebSocket `/events` and workload-only POST `/ingest`. Both demo identities may subscribe, through the gateway and central authz. Events intentionally uses one replica per namespace with bounded in-memory buffers and no durable broker. Telemetry is best-effort and never controls access. Correlation uses `x-mesh-request-id`, because Envoy may replace standard `x-request-id`; the Istio authorization providers forward the custom header. Never add token/payload logging.

Web now uses `server.cjs` to serve Next.js and bridge same-origin WebSockets. `/api/demo-token` exposes a selected role only when `web.demoTokens.enabled` is true (false by default, true in local stg/prd). Root Helm owns the dedicated mounted credential Secret; this is deliberate local demo access, not real login. `/api/runtime-config` remains unchanged.

`make watch ENV=stg` is an opt-in foreground watcher of app/platform Helm inputs and selected local environment settings/secrets. It never targets a remote cluster or rebuilds source images. Shared mesh/gateway changes remain explicit. `make smoke` now also checks the token endpoint, WebSocket authorization, and correlated events via `scripts/check_playground.cjs`; install the web npm dependencies first.
