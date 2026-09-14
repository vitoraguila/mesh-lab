import type { TechKey } from './techIcons'

export type Manifest = {
  id: string
  file: string
  dir: string
  pattern: string
  note: string
  tech: TechKey
  template: string
  /** Guillemets mark what a value supplied, so the accent shows what changed. */
  rendered?: string
}

export type Group = { label: string; caption: string; items: Manifest[] }

export const GROUPS: Group[] = [
  {
    label: 'apps/catalog/deploy',
    caption: 'One application owns its image, its route, its policies and its settings.',
    items: [
      {
        id: 'app-values',
        file: 'helm/values.yaml',
        dir: 'apps/catalog/deploy',
        pattern: 'Defaults live with the chart',
        note: 'Everything an environment may override, with a working default already in place. Nothing here is environment specific, so the same chart serves staging and production.',
        tech: 'helm',
        template: `image:
  repository: mesh-study/catalog
  tag: dev
  pullPolicy: IfNotPresent
replicaCount: 1
# Runtime variables are injected by Kubernetes, never by Docker build args.
config: {}
metrics:
  enabled: true
  port: 8080
  path: /metrics
service:
  port: 8080
route:
  path: /catalog
  timeout: 5s
trafficPolicy:
  outlierDetection:
    consecutive5xxErrors: 5
    interval: 10s
    baseEjectionTime: 30s`,
      },
      {
        id: 'env-values',
        file: 'environments/stg/values.yaml',
        dir: 'apps/catalog/deploy',
        pattern: 'The environment overrides, and nothing else',
        note: 'Wrapped under the dependency name because it is loaded into the root chart. Three keys, because three keys are all that differ. Production has its own copy with its own tag and replica count.',
        tech: 'helm',
        template: `# Values for the catalog dependency in the platform chart.
catalog:
  replicaCount: 1
  image:
    tag: broker-20260912
  route:
    path: /catalog
    timeout: 5s`,
      },
      {
        id: 'env-config',
        file: 'environments/stg/config.yaml',
        dir: 'apps/catalog/deploy',
        pattern: 'Runtime variables, not build arguments',
        note: 'Edit a line here and run make deploy. Helm re-renders the ConfigMap, its checksum changes, and Kubernetes rolls catalog alone. No image is rebuilt and no other service restarts.',
        tech: 'kubernetes',
        template: `# Non-sensitive runtime values. Kubernetes injects these via catalog-config.
catalog:
  config:
    SERVICE_VERSION: "v1"
    READ_TIMEOUT_SECONDS: "10"
    SHUTDOWN_TIMEOUT_SECONDS: "5"
    EVENTS_URL: "http://events.stg.svc.cluster.local:8080/ingest"
    SERVICE_NAME: "catalog"`,
      },
      {
        id: 'deployment',
        file: 'helm/templates/deployment.yaml',
        dir: 'apps/catalog/deploy',
        pattern: 'A checksum turns a config edit into a rollout',
        note: 'Kubernetes only restarts pods when the pod template changes. Hashing the rendered ConfigMap into an annotation makes a value change look like a template change, which is exactly what you want.',
        tech: 'kubernetes',
        template: `spec:
  template:
    metadata:
      annotations:
        checksum/config: {{ include (print $.Template.BasePath "/config/config-map.yaml") . | sha256sum }}
        proxy.istio.io/config: '{"holdApplicationUntilProxyStarts":true}'
        prometheus.io/scrape: "true"
        prometheus.io/port: {{ .Values.metrics.port | quote }}
    spec:
      serviceAccountName: catalog
      securityContext:
        runAsNonRoot: true
        runAsUser: 10001
      containers:
        - name: catalog
          image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
          securityContext:
            readOnlyRootFilesystem: true
            capabilities:
              drop: [ALL]
          envFrom:
            - configMapRef:
                name: catalog-config`,
        rendered: `spec:
  template:
    metadata:
      annotations:
        checksum/config: «a3f9c1e77b204d18...»
        proxy.istio.io/config: '{"holdApplicationUntilProxyStarts":true}'
        prometheus.io/scrape: "true"
        prometheus.io/port: «"8080"»
    spec:
      serviceAccountName: catalog
      securityContext:
        runAsNonRoot: true
        runAsUser: 10001
      containers:
        - name: catalog
          image: «"mesh-study/catalog:broker-20260912"»
          securityContext:
            readOnlyRootFilesystem: true
            capabilities:
              drop: [ALL]
          envFrom:
            - configMapRef:
                name: catalog-config`,
      },
      {
        id: 'configmap',
        file: 'helm/templates/config/config-map.yaml',
        dir: 'apps/catalog/deploy',
        pattern: 'The template refuses to be misused',
        note: 'Three keys are owned by the chart because they describe topology, not behaviour. Setting one of them in config.yaml fails the render with a message, rather than producing a cluster that half works.',
        tech: 'helm',
        template: `apiVersion: v1
kind: ConfigMap
metadata:
  name: catalog-config
data:
  APP_ENV: {{ .Values.global.environment | quote }}
  HTTP_PORT: "8080"
  {{- range $key, $value := .Values.config }}
  {{- if has $key (list "APP_ENV" "HTTP_PORT" "INTERNAL_API_URL") }}
  {{- fail (printf "%s is managed by the chart" $key) }}
  {{- end }}
  {{ $key }}: {{ $value | quote }}
  {{- end }}`,
        rendered: `apiVersion: v1
kind: ConfigMap
metadata:
  name: catalog-config
data:
  APP_ENV: «"stg"»
  HTTP_PORT: "8080"
  SERVICE_VERSION: «"v1"»
  READ_TIMEOUT_SECONDS: «"10"»
  SHUTDOWN_TIMEOUT_SECONDS: «"5"»
  EVENTS_URL: «"http://events.stg.svc.cluster.local:8080/ingest"»
  SERVICE_NAME: «"catalog"»`,
      },
      {
        id: 'virtualservice',
        file: 'helm/templates/routes/virtual-service.yaml',
        dir: 'apps/catalog/deploy',
        pattern: 'The app owns its own route',
        note: 'A delegate omits hosts and gateways, and exportTo keeps it inside its namespace. Adding a service means adding a chart, not editing a shared routing file that every team fights over.',
        tech: 'istio',
        template: `# Delegated by deploy/helm/platform/templates/routes.yaml.
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: catalog-routes
spec:
  exportTo: ["."]
  http:
    - name: catalog
      match:
        - uri:
            exact: {{ .Values.route.path | quote }}
      timeout: {{ .Values.route.timeout }}
      route:
        - destination:
            host: catalog.{{ .Release.Namespace }}.svc.cluster.local
            port:
              number: {{ .Values.service.port }}`,
        rendered: `apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: catalog-routes
spec:
  exportTo: ["."]
  http:
    - name: catalog
      match:
        - uri:
            exact: «"/catalog"»
      timeout: «5s»
      route:
        - destination:
            host: catalog.«stg».svc.cluster.local
            port:
              number: «8080»`,
      },
      {
        id: 'allow',
        file: 'helm/templates/security/allow-gateway.yaml',
        dir: 'apps/catalog/deploy',
        pattern: 'Identity, not network location',
        note: 'The rule names a SPIFFE identity that the caller proves with a certificate. Being inside the cluster, or knowing the pod IP, gets you nothing. GET only, port 8080 only.',
        tech: 'istio',
        template: `apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: catalog-from-gateway
spec:
  selector:
    matchLabels:
      app: catalog
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - "cluster.local/ns/{{ .Release.Namespace }}/sa/{{ .Values.global.gateway.serviceAccount }}"
      to:
        - operation:
            methods: [GET]
            ports: ["8080"]`,
        rendered: `apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: catalog-from-gateway
spec:
  selector:
    matchLabels:
      app: catalog
  action: ALLOW
  rules:
    - from:
        - source:
            principals:
              - «"cluster.local/ns/stg/sa/internal-gateway"»
      to:
        - operation:
            methods: [GET]
            ports: ["8080"]`,
      },
      {
        id: 'custom',
        file: 'helm/templates/security/external-authorization.yaml',
        dir: 'apps/catalog/deploy',
        pattern: 'Business rules leave the business code',
        note: 'An empty rule means every request. Envoy calls the named provider before the handler is entered, so the Go source has no idea who a reader is and never needs to.',
        tech: 'istio',
        template: `# CUSTOM and ALLOW must both succeed, at the destination sidecar.
apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: catalog-external-authorization
spec:
  selector:
    matchLabels:
      app: catalog
  action: CUSTOM
  provider:
    name: study-authz-{{ .Values.global.environment }}
  rules:
    - {}`,
        rendered: `apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: catalog-external-authorization
spec:
  selector:
    matchLabels:
      app: catalog
  action: CUSTOM
  provider:
    name: «study-authz-stg»
  rules:
    - {}`,
      },
    ],
  },
  {
    label: 'deploy/helm/platform',
    caption: 'The environment: one release that composes every application chart.',
    items: [
      {
        id: 'root-routes',
        file: 'templates/routes.yaml',
        dir: 'deploy/helm/platform',
        pattern: 'One prefix per service, then get out of the way',
        note: 'The root route matches a prefix and hands off. One level of Istio delegation, so the shared file stays a table of contents instead of becoming the routing layer for fifteen services.',
        tech: 'istio',
        template: `apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: internal-api
spec:
  exportTo: ["."]
  hosts:
    - {{ .Values.global.gateway.name }}.{{ .Release.Namespace }}.svc.cluster.local
  gateways: [internal-api]
  http:
    {{- range .Values.routes }}
    - name: {{ .name }}
      match:
        - uri:
            prefix: {{ .prefix | quote }}
      delegate:
        name: {{ .delegate }}
        namespace: {{ $.Release.Namespace }}
    {{- end }}`,
        rendered: `apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: internal-api
spec:
  exportTo: ["."]
  hosts:
    - «internal-gateway.stg.svc.cluster.local»
  gateways: [internal-api]
  http:
    - name: «catalog»
      match:
        - uri:
            prefix: «"/catalog"»
      delegate:
        name: «catalog-routes»
        namespace: «stg»
    - name: «orders»
      match:
        - uri:
            prefix: «"/orders"»
      delegate:
        name: «orders-routes»
        namespace: «stg»`,
      },
      {
        id: 'deny',
        file: 'templates/security/default-deny.yaml',
        dir: 'deploy/helm/platform',
        pattern: 'The shortest important file in the repository',
        note: 'An AuthorizationPolicy with an empty spec denies everything in the namespace. Every ALLOW elsewhere is an exception carved out of this. Forget to write one and your service is unreachable, which is the safe way to fail.',
        tech: 'istio',
        template: `apiVersion: security.istio.io/v1
kind: AuthorizationPolicy
metadata:
  name: namespace-default-deny
spec: {}`,
      },
      {
        id: 'mtls',
        file: 'templates/security/peer-authentication.yaml',
        dir: 'deploy/helm/platform',
        pattern: 'Encryption is not optional',
        note: 'STRICT means a plaintext connection is refused, not merely discouraged. Certificates are issued and rotated by Istio, so no application handles a key and no developer configures TLS.',
        tech: 'istio',
        template: `apiVersion: security.istio.io/v1
kind: PeerAuthentication
metadata:
  name: strict-mtls
spec:
  mtls:
    mode: STRICT`,
      },
    ],
  },
  {
    label: 'apps/catalog',
    caption: 'Before any of that: the image.',
    items: [
      {
        id: 'dockerfile',
        file: 'Dockerfile',
        dir: 'apps/catalog',
        pattern: 'Ship the binary, not the toolchain',
        note: 'The build stage has a compiler. The final stage starts from scratch, an empty filesystem, and receives one static binary. No shell, no package manager, no root, nothing to exploit.',
        tech: 'docker',
        template: `FROM golang:1.25.5-alpine AS build
WORKDIR /src
COPY apps/shared ./shared
COPY apps/catalog ./catalog
WORKDIR /src/catalog
ARG SOURCE_REVISION=unknown
RUN CGO_ENABLED=0 go build -trimpath \\
      -ldflags="-s -w -X study.local/shared/telemetry.SourceRevision=\${SOURCE_REVISION}" \\
      -o /server .

FROM scratch
COPY --from=build /server /server
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["/server"]`,
      },
    ],
  },
]

export const LAYERS: { n: string; source: string; what: string }[] = [
  { n: '1', source: 'apps/<app>/deploy/helm/values.yaml', what: 'chart defaults' },
  { n: '2', source: 'deploy/environments/<env>/values.yaml', what: 'shared topology for the environment' },
  { n: '3', source: 'apps/<app>/deploy/environments/<env>/', what: 'values.yaml, config.yaml, policy.yaml' },
  { n: '4', source: '.local/<env>/<app>-secrets.json', what: 'ignored by Git, never committed' },
  { n: '5', source: 'TAG=... on the command line', what: 'overrides every image tag, for that run only' },
]
