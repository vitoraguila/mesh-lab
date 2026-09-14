# Mesh Lab immersive frontend plan

## Outcome

Turn the learning studio into a dark, isometric mission lab for beginner-to-intermediate Kubernetes learners. A learner predicts a request outcome, obtains a demo identity, launches a real request, follows its parcel through Next.js, the Istio gateway, API Envoy, shared authz, and application code, then explains the result and earns local mastery progress.

## Experience

- Mission mode presents short lessons for token identity, REST authorization, reader denial, GraphQL, gRPC, events, isolation, and labeled outage simulations.
- Free lab keeps every discovered service and operation executable against the local cluster.
- The world visualizes Browser, Next.js, gateway, destination pod/Envoy, authz, handler, response, and a separate telemetry lane.
- Observed events, configured explanations, simulations, and missing evidence are always labeled distinctly.
- Progress stores only completed mission IDs and badges in versioned local browser storage; credentials, payloads, responses, and events stay out of storage.
- A DOM 2D journey, reduced-motion mode, keyboard controls, and WebGL-free fallback preserve accessibility.

## Implementation

- Preserve Next.js 16.3.4, strict TypeScript, current request APIs, event WebSocket, source inspector, and runtime secret rules.
- Add a client mission layer, CSS perspective world, prediction/checkpoint cards, and evidence-aware completion logic.
- Keep request correlation and source anchors as the evidence source; never fabricate proxy spans or code execution.
- Later phase can add metadata-only checkpoints at Next.js, authz, REST, GraphQL, and gRPC boundaries without changing authorization ownership.

## Acceptance

- A learner can complete a catalog success and orders reader-denial mission, see the identity flow, watch the branch at API Envoy, inspect responsible source, replay without resending, and see progress persist locally.
- Missing telemetry is shown as incomplete evidence. Simulation results are visibly marked.
- Existing admin/reader/missing/invalid behavior, environment isolation, token secrecy, responsive layout, reduced motion, and repository test commands remain valid.
