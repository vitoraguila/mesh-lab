# GRAPHQL deployment configuration

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

Environment files are wrapped under `graphql:` because the root chart loads this chart as its `graphql` dependency. They are values inputs, not manifests for `kubectl apply`.

## Runtime injection

`environments/stg/config.yaml` → Helm → `graphql-config` ConfigMap → Deployment `envFrom.configMapRef` → running process environment. The chart injects `APP_ENV` from `global.environment`. The chart injects `HTTP_PORT=8080`. Go reads timeout settings through `os.Getenv`; the business APIs also return `SERVICE_VERSION` and `APP_ENV` in their responses.

Optional sensitive variables: ignored `.local/<env>/graphql-secrets.yaml` → Helm `secrets` values → `graphql-env` Secret → Deployment `envFrom.secretRef`. No env Secret is created when `secrets` is empty. Use `existingEnvSecret` for an externally managed Secret instead. Config and chart-managed Secret checksums trigger a rollout automatically; external Secret updates need an explicit restart.

The same Docker image runs in both environments. These deployment files and local secrets are excluded from Docker build contexts.

## Route ownership

`helm/templates/routes/virtual-service.yaml` is the `graphql-routes` delegate. The root general route in `deploy/helm/platform/templates/routes.yaml` points to it. The app route owns the exact request path and timeout; `destination-rule.yaml` owns mTLS and connection/outlier settings. If you change the URL path, update the root matching prefix, authz allowed paths, and the Next.js caller together.

## Commands (run at repository root)

```sh
make config APP=graphql ENV=stg
make deploy ENV=stg
make build APP=graphql
make restart APP=graphql ENV=stg
make logs APP=graphql ENV=stg
```

`make deploy` upgrades the root environment release, which owns all application charts. It does not reinstall unchanged pods. The examples under `.local/` are relative to the repository root; actual secret values must not be committed.

## Live telemetry

`EVENTS_URL` and `SERVICE_NAME` in each environment config enable bounded, best-effort metadata delivery to the environment-local events service. Request IDs correlate authz checks and business service activity. No tokens or payloads are emitted; event delivery does not control authorization.

The query-only `/graphql` endpoint accepts POST with `query`, `variables` and optional `operationName`. Admin and reader are allowed by central authz. Products are mock data, and GraphQL validation errors are returned in the standard `errors` array.

The learning studio discovers this chart and reads optional `../learn.yaml`. See [the descriptor contract](../../web/deploy/README.md#learning-descriptor-contract). Source-only updates use `make learn-sync ENV=stg`; activate operation changes with `make deploy`. Image tags are selected explicitly in environment values: use that tag when rebuilding and restarting this app, or update the selected tag before deployment.
