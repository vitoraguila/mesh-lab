# Authz deployment configuration

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

Environment files are wrapped under `authz:` because the root chart loads this chart as its `authz` dependency. They are values inputs, not manifests for `kubectl apply`.

## Runtime injection

`environments/stg/config.yaml` → Helm → `authz-config` ConfigMap → Deployment `envFrom.configMapRef` → running process environment. The chart injects `APP_ENV` from `global.environment`. The chart injects `HTTP_PORT=8080`. Go reads timeout settings through `os.Getenv`; the business APIs also return `SERVICE_VERSION` and `APP_ENV` in their responses.

Optional sensitive variables: ignored `.local/<env>/authz-secrets.yaml` → Helm `secrets` values → `authz-env` Secret → Deployment `envFrom.secretRef`. No env Secret is created when `secrets` is empty. Use `existingEnvSecret` for an externally managed Secret instead. Config and chart-managed Secret checksums trigger a rollout automatically; external Secret updates need an explicit restart.

The same Docker image runs in both environments. These deployment files and local secrets are excluded from Docker build contexts.

## Authorization policy file

Credentials are different from optional env secrets: `make secrets ENV=stg` generates `.local/stg/authz-secrets.json` under `authz.credentials`. The template `helm/templates/secret.yaml` combines these credentials with `environments/stg/policy.yaml` into the `authz-policy` Secret. Deployment `volumes`/`volumeMounts` mount it at `/etc/authz/policy.json`, read-only. `AUTHZ_POLICY_PATH` selects that file. A policy checksum rolls authz when either policy or credentials change. There is no public gateway route to authz.

## Commands (run at repository root)

```sh
make config APP=authz ENV=stg
make deploy ENV=stg
make build APP=authz
make restart APP=authz ENV=stg
make logs APP=authz ENV=stg
```

`make deploy` upgrades the root environment release, which owns all application charts. It does not reinstall unchanged pods. The examples under `.local/` are relative to the repository root; actual secret values must not be committed.

## Live telemetry

`EVENTS_URL` and `SERVICE_NAME` in each environment config enable bounded, best-effort metadata delivery to the environment-local events service. Request IDs correlate authz checks and business service activity. No tokens or payloads are emitted; event delivery does not control authorization.

The learning studio discovers this chart and reads optional `../learn.yaml`. See [the descriptor contract](../../web/deploy/README.md#learning-descriptor-contract). Source-only updates use `make learn-sync ENV=stg`; activate operation changes with `make deploy`. Image tags are selected explicitly in environment values: use that tag when rebuilding and restarting this app, or update the selected tag before deployment.
