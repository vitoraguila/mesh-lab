# RabbitMQ deployment configuration

This app owns the broker's Helm chart, its mesh connection policy and its stg/prd configuration under this folder. It is composed into the environment's `study` release, not installed independently.

Unlike the other apps there is no source folder and no Dockerfile: the chart runs the upstream `rabbitmq` image. `make build` therefore skips it, and a command-line `TAG` is not applied to it. Select the broker version in `helm/values.yaml` or in `environments/<env>/values.yaml`.

The broker listens on AMQP 5672 only. There is no VirtualService and no gateway route, so nothing outside the mesh can reach it. The management plugin is not enabled; queue depth is read by the events service with a passive queue declaration.

`routes/destination-rule.yaml` makes client sidecars originate `ISTIO_MUTUAL` to this workload. The Service port is named `tcp-amqp`, which selects plain TCP in Istio. Because TCP carries no paths or methods, `security/allow-clients.yaml` authorizes by workload identity and port only — the producing service accounts plus the events consumer. This is the deliberate contrast with the HTTP services, which additionally pass a CUSTOM external authorization check. Namespace-wide default-deny still applies, so any other workload is refused at the sidecar.

The login is generated per environment by `make secrets ENV=<env>` into the ignored `.local/<env>/rabbitmq-secrets.json`, never Git. The chart turns it into `rabbitmq-credentials` for the broker itself. The root platform chart publishes the same login to producers and consumers as the `mesh-broker-credentials` Secret, alongside the non-secret `mesh-broker` ConfigMap holding the exchange, queue and address. Each app opts in through `broker.enabled` in its own chart.

Storage is an `emptyDir`. Restarts start from an empty queue on purpose: this is an observation-scale broker for a learning environment, not a durable audit log. Keep exactly one replica per environment.

Producers publish to the `mesh.events` topic exchange with routing key `<environment>.<service>.<stage>`; the events service binds `mesh.events.<environment>` with `#` and acknowledges after fan-out. Publishing is best effort and never blocks a request: when the broker is unavailable the events are dropped and the business call still succeeds.

Use `make deploy ENV=stg` and `make logs APP=rabbitmq ENV=stg`. `make watch ENV=stg` watches this chart and its selected environment configuration.

The learning studio discovers this chart and reads optional `../learn.yaml`. See [the descriptor contract](../../web/deploy/README.md#learning-descriptor-contract).
