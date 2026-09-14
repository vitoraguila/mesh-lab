# Shared deployment configuration

Application-specific configuration lives in `apps/<app>/deploy/`. This root folder owns only the composition and shared cluster resources.

- `helm/platform/Chart.yaml`: loads eight app charts using relative local dependencies.
- `helm/platform/templates/routes.yaml`: general Istio route delegating to each business API's own route.
- `helm/platform/templates/gateway.yaml`: environment-specific internal listener.
- `helm/platform/templates/security/`: strict mTLS, namespace default deny, web-to-gateway permission.
- `helm/namespaces/`: provisions `stg` and `prd` with sidecar injection enabled. Namespace resources have a keep annotation so uninstalling this provisioning release does not cascade-delete applications.
- `environments/<env>/values.yaml`: environment-wide topology overrides.
- `environments/<env>/gateway.yaml`: per-environment official gateway chart overrides.
- `istio/istiod-values.yaml`: shared control plane with separate authorization providers for staging and production simulation.
- `istio/gateway-values.yaml`: shared defaults for the official Istio gateway chart.

`make mesh` manages shared resources. `make gateway ENV=stg` manages that environment's gateway Deployment/Service. `make deploy ENV=stg` installs the root application chart and its dependencies. All commands select the local `mesh-study` context explicitly.

The root chart also owns `templates/demo-tokens.yaml`, a dedicated web credential Secret derived from authz credentials when local demo access is enabled. GraphQL, gRPC, and events own their delegated routes. The events app uses one replica per environment for its in-memory pub/sub history. Istio providers forward `x-mesh-request-id` to correlate authz telemetry. `make watch ENV=stg` explicitly watches app/platform inputs and deploys only to the local mesh-study context; shared mesh/gateway changes remain explicit.

## Learning catalog ownership

The per-environment `study` release continues to own all application workloads and policies. A separate `study-learning` release, sourced from `apps/web/deploy/learning-helm`, owns only `learning-catalog`. Its compressed `workspace.gz` and `active.gz` entries are mounted read-only by web using a directory projection, without a pod-template checksum or `subPath`, so source-only updates do not roll web.

`make deploy` validates a sanitized catalog before applying the application release and activates its operation definitions only after the application upgrade succeeds. `make learn-sync` refreshes workspace source while preserving `active.gz`; `make learn-watch` uses the existing watcher's debounce loop. Both commands share the same environment lock as deployment and explicitly target `mesh-study`. A failed publication leaves the previous ConfigMap intact; rerun `make deploy` if the application apply succeeded but catalog activation failed.

Rendered configuration is an environment-specific preview with no local secret inputs. It is not a live cluster snapshot. An explicit deployment `TAG` is reflected in that deployment's preview; later source-only previews use repository values again. Source maps identify resource kind/name, YAML field pointers, templates, and contributing values in precedence order. Kubernetes Secrets are omitted; sensitive configuration keys are redacted.
