import type { TechKey } from './techIcons'

export type TermInfo = { body: string; href?: string; source?: string; tech?: TechKey }

/** A sentence or two each, plus wherever the authoritative answer lives. */
export const TERM_INFO: Record<string, TermInfo> = {
  Kubernetes: {
    body: 'A scheduler with an API. You give it objects describing what should exist, and controllers keep the cluster matching that description.',
    href: 'https://kubernetes.io/docs/concepts/overview/',
    source: 'kubernetes.io',
    tech: 'kubernetes',
  },
  Minikube: {
    body: 'Runs a complete single-node Kubernetes cluster on your own machine, usually as a Docker container. Profiles let several exist side by side.',
    href: 'https://minikube.sigs.k8s.io/docs/start/',
    source: 'minikube.sigs.k8s.io',
    tech: 'kubernetes',
  },
  Docker: {
    body: 'Builds images and runs containers. It knows nothing about pods, services or routing, which is the layer Kubernetes adds on top.',
    href: 'https://docs.docker.com/get-started/docker-overview/',
    source: 'docs.docker.com',
    tech: 'docker',
  },
  'Docker Desktop': {
    body: 'The desktop package that provides the Docker engine on macOS and Windows. Minikube boots its node inside it.',
    href: 'https://docs.docker.com/desktop/',
    source: 'docs.docker.com',
    tech: 'docker',
  },
  Istio: {
    body: 'A service mesh. A control plane that configures a proxy next to every workload, so routing, encryption and authorization are platform concerns rather than application code.',
    href: 'https://istio.io/latest/docs/concepts/what-is-istio/',
    source: 'istio.io',
    tech: 'istio',
  },
  Envoy: {
    body: 'The proxy Istio injects. Every byte in and out of a pod passes through it, which is where policy is enforced and mesh metrics are produced.',
    href: 'https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/intro/intro',
    source: 'envoyproxy.io',
    tech: 'envoyproxy',
  },
  Helm: {
    body: 'A template engine with a package manager attached. It renders charts into plain Kubernetes YAML on your machine, then sends the result to the API server.',
    href: 'https://helm.sh/docs/topics/charts/',
    source: 'helm.sh',
    tech: 'helm',
  },
  Homebrew: {
    body: 'The package manager most macOS development setups use. Here it installs the language runtimes and kubectl.',
    href: 'https://brew.sh',
    source: 'brew.sh',
  },
  'Next.js': {
    body: 'The React framework serving the browser interface. Its server routes hold the tokens and talk to the mesh, so the browser never does.',
    href: 'https://nextjs.org/docs',
    source: 'nextjs.org',
    tech: 'nextdotjs',
  },
  React: {
    body: 'The component library behind the interface. Version 19 here, rendered by Next.js on the server.',
    href: 'https://react.dev',
    source: 'react.dev',
    tech: 'react',
  },
  TypeScript: {
    body: 'JavaScript with static types. The frontend is strict mode throughout, which is a deliberate constraint in this project.',
    href: 'https://www.typescriptlang.org/docs/',
    source: 'typescriptlang.org',
    tech: 'typescript',
  },
  'Node.js': {
    body: 'The JavaScript runtime. The payments API is written on it, to prove the mesh does not care what language a service is.',
    href: 'https://nodejs.org/en/docs',
    source: 'nodejs.org',
    tech: 'nodedotjs',
  },
  Python: {
    body: 'The reviews API is Python. Same routes, same policies, same metric names as the Go services.',
    href: 'https://docs.python.org/3/',
    source: 'docs.python.org',
    tech: 'python',
  },
  Go: {
    body: 'Most services here are Go, compiled to a single static binary with no runtime dependencies, which is why the image can start from scratch.',
    href: 'https://go.dev/doc/',
    source: 'go.dev',
    tech: 'go',
  },
  GraphQL: {
    body: 'One endpoint, and the client states what it wants back. A query-only schema here, exposing products and the environment name.',
    href: 'https://graphql.org/learn/',
    source: 'graphql.org',
    tech: 'graphql',
  },
  gRPC: {
    body: 'Binary RPC over HTTP/2, with the contract written as a .proto file. The shipping quote uses it through the same Istio gateway.',
    href: 'https://grpc.io/docs/what-is-grpc/introduction/',
    source: 'grpc.io',
  },
  Protobuf: {
    body: 'The schema language and binary encoding gRPC uses. The contract lives in apps/grpc/proto/shipping.proto.',
    href: 'https://protobuf.dev/overview/',
    source: 'protobuf.dev',
  },
  RabbitMQ: {
    body: 'A broker that routes messages through exchanges into queues. An acknowledged message is gone, which is the opposite of how a log broker behaves.',
    href: 'https://www.rabbitmq.com/tutorials/amqp-concepts',
    source: 'rabbitmq.com',
    tech: 'rabbitmq',
  },
  AMQP: {
    body: 'The protocol RabbitMQ speaks, on port 5672. Because the Service port is named tcp-amqp, Istio treats it as plain TCP.',
    href: 'https://www.rabbitmq.com/tutorials/amqp-concepts',
    source: 'rabbitmq.com',
    tech: 'rabbitmq',
  },
  Prometheus: {
    body: 'A time series database that pulls. It discovers targets from the Kubernetes API and scrapes them on a schedule, rather than receiving anything.',
    href: 'https://prometheus.io/docs/introduction/overview/',
    source: 'prometheus.io',
    tech: 'prometheus',
  },
  Grafana: {
    body: 'Dashboards on top of Prometheus. It queries with PromQL and stores no metrics of its own.',
    href: 'https://grafana.com/docs/grafana/latest/',
    source: 'grafana.com',
    tech: 'grafana',
  },
  WebSocket: {
    body: 'A connection that stays open so the server can push. The events service uses it to stream mesh activity to the browser.',
    href: 'https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API',
    source: 'MDN',
  },
  'HTTP/2': {
    body: 'Multiplexes many streams over one connection, which is what gRPC needs. The internal gateway carries it end to end.',
    href: 'https://developer.mozilla.org/en-US/docs/Glossary/HTTP_2',
    source: 'MDN',
  },
  'mutual TLS': {
    body: 'Both ends present a certificate, so each proves who it is. Istio issues and rotates those certificates, so no application handles a key.',
    href: 'https://istio.io/latest/docs/concepts/security/#mutual-tls-authentication',
    source: 'istio.io',
    tech: 'istio',
  },
  mTLS: {
    body: 'Short for mutual TLS. STRICT mode means a plaintext connection is refused rather than merely discouraged.',
    href: 'https://istio.io/latest/docs/concepts/security/#mutual-tls-authentication',
    source: 'istio.io',
    tech: 'istio',
  },
  Deployment: {
    body: 'Declares how many copies of a pod template should exist. A controller creates and replaces pods to match; you never start one yourself.',
    href: 'https://kubernetes.io/docs/concepts/workloads/controllers/deployment/',
    source: 'kubernetes.io',
    tech: 'kubernetes',
  },
  ReplicaSet: {
    body: 'The controller a Deployment creates to hold one specific pod template at one specific count. Rollouts are one ReplicaSet growing while another shrinks.',
    href: 'https://kubernetes.io/docs/concepts/workloads/controllers/replicaset/',
    source: 'kubernetes.io',
    tech: 'kubernetes',
  },
  Pod: {
    body: 'The smallest schedulable unit: one or more containers sharing an IP address and a network namespace. Inside a pod, containers reach each other on localhost.',
    href: 'https://kubernetes.io/docs/concepts/workloads/pods/',
    source: 'kubernetes.io',
    tech: 'kubernetes',
  },
  Service: {
    body: 'A stable name and address in front of pods that keep being replaced. It resolves to whichever pods are ready at that moment.',
    href: 'https://kubernetes.io/docs/concepts/services-networking/service/',
    source: 'kubernetes.io',
    tech: 'kubernetes',
  },
  Namespace: {
    body: 'A name scope inside one cluster. Here stg and prd are namespaces on the same node, with separate configuration, credentials and policy.',
    href: 'https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/',
    source: 'kubernetes.io',
    tech: 'kubernetes',
  },
  ConfigMap: {
    body: 'Non-sensitive key and value pairs, mounted or injected as environment variables. Changing one is how an environment differs without a rebuild.',
    href: 'https://kubernetes.io/docs/concepts/configuration/configmap/',
    source: 'kubernetes.io',
    tech: 'kubernetes',
  },
  Secret: {
    body: 'The same idea as a ConfigMap for sensitive values. Base64 is encoding, not encryption, so cluster administrators can still read it.',
    href: 'https://kubernetes.io/docs/concepts/configuration/secret/',
    source: 'kubernetes.io',
    tech: 'kubernetes',
  },
  VirtualService: {
    body: 'Istio routing rules: which path reaches which destination, with what timeout and retries. It can delegate to another VirtualService.',
    href: 'https://istio.io/latest/docs/reference/config/networking/virtual-service/',
    source: 'istio.io',
    tech: 'istio',
  },
  DestinationRule: {
    body: 'How to connect once a destination has been chosen: TLS mode, connection pool limits, outlier detection, subsets.',
    href: 'https://istio.io/latest/docs/reference/config/networking/destination-rule/',
    source: 'istio.io',
    tech: 'istio',
  },
  AuthorizationPolicy: {
    body: 'Who may call what, enforced by the destination proxy before your handler runs. An empty spec denies everything it selects.',
    href: 'https://istio.io/latest/docs/reference/config/security/authorization-policy/',
    source: 'istio.io',
    tech: 'istio',
  },
  PeerAuthentication: {
    body: 'Whether workloads must use mutual TLS. STRICT refuses plaintext outright, which is what this namespace sets.',
    href: 'https://istio.io/latest/docs/reference/config/security/peer_authentication/',
    source: 'istio.io',
    tech: 'istio',
  },
  ALLOW: {
    body: 'An AuthorizationPolicy action that permits matching requests. With a default-deny in place, every ALLOW is an exception you wrote on purpose.',
    href: 'https://istio.io/latest/docs/concepts/security/#authorization-policies',
    source: 'istio.io',
    tech: 'istio',
  },
  CUSTOM: {
    body: 'An AuthorizationPolicy action that hands the decision to an external service. That is how business rules leave the business code.',
    href: 'https://istio.io/latest/docs/tasks/security/authorization/authz-custom/',
    source: 'istio.io',
    tech: 'istio',
  },
  'mesh-study': {
    body: 'The name of the local Minikube profile and kubectl context this project uses. Both stg and prd are namespaces inside it.',
  },
}
