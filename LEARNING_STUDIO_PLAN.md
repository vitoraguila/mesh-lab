# Mesh Lab: an interactive learning studio

## 1. Experience and visual design

Replace the long dashboard with a bright, focused workspace that teaches one request at a time.

- **Left: service explorer.** Searchable services grouped by REST, GraphQL, gRPC, and infrastructure. Each shows its purpose, available operations, and configuration files.
- **Center: request workspace.** Choose an operation and identity, edit its inputs, and run that service individually. Show its request journey and response together.
- **Right: learning inspector.** Selecting a journey step explains what happened, why it matters, and which source files control it.
- Keep environment, connection state, and selected identity visible in a compact toolbar. Move token reveal/copy and advanced controls into expandable panels.
- Use light neutral surfaces, readable typography, generous spacing, and consistent protocol colors. Animation communicates activity; labels and icons also communicate state.
- On smaller screens, use **Request / Journey / Explain** tabs rather than squeezed columns. Support keyboard navigation, accessible diagram controls, and reduced motion.

The default experience is **Guided explorer**. A secondary **Explore the mesh** view shows the full topology and environment-wide traffic.

## 2. Individual requests and teachable journeys

### Run one operation

- Extend the playground endpoint to support every registered business operation, including individual catalog, orders, and inventory requests.
- Generate REST controls from operation definitions, retain the GraphQL query/variables editor, and generate gRPC inputs from the registered Protobuf method.
- Keep “Run all” as a secondary action. Each result opens its own journey rather than mixing every request into one animation.
- Separate the **request identity** from the **observer identity** so testing missing or invalid credentials does not disconnect the event viewer.

### Follow the request

Present this path accurately:

**Browser → Next.js → gateway → API Envoy → authz check → API handler → response**

The authorization check branches from the destination Envoy. The event service appears on a separate observation path, not as a required business hop.

- Assign a correlation ID before dispatch so events can populate the selected journey while the request is running.
- Show real authz checks, decisions, service receipt/completion, and browser-observed results.
- Distinguish **observed events** from **configured routing steps**. Do not invent gateway spans, packet captures, or timings.
- Show safe request inputs, returned data, protocol conversion, and allowlisted headers. Represent authorization as “Bearer token present/redacted”; never copy credentials into events.
- Explain denial, GraphQL validation errors, gRPC errors, timeouts, and unavailable services separately. Missing telemetry means “not observed,” not proof that a service was never reached.

### Learn at your own pace

- After a real call completes, offer **Replay**, **Next step**, **Previous step**, and playback speed.
- Replay uses captured events and clearly marks explanatory transitions. It neither resends requests nor delays backend execution.
- Preserve up to 50 requests in page memory; pause presentation without stopping collection. Background requests must not steal the current selection.
- Include guided examples: successful REST access, reader denied from orders, GraphQL field selection/filtering, and a gRPC shipping quote.
- Each step starts with a short explanation, followed by expandable technical detail and “Show responsible code.”

## 3. Source explorer and automatic service discovery

### Generate a learning catalog from the repository

- Discover deployed app charts from the root Helm dependencies and discover their app-owned deployment files.
- Add optional `apps/<app>/learn.yaml` descriptors containing purpose, operations, example inputs, lesson steps, and source references.
- Generate frontend service lists, topology nodes, operation choices, and file relationships from this catalog. Remove hard-coded service arrays from the teaching UI.
- A chart without a descriptor still appears with its discovered files and an “examples not configured” state. A descriptor enables guided execution without frontend edits.
- Keep chart manifests explicit and app-owned. Catalog discovery does not automatically create routes, permissions, or deployments for an unfinished service.

### Show exactly what controls each step

| View | What it teaches |
|---|---|
| Explanation | The selected step’s role and the outcome actually observed |
| Source | Full approved source/template text with line numbers and highlighted responsible regions |
| Rendered configuration | Sanitized environment-specific YAML, linked to its template and contributing values |

- Cover the Next.js caller, gateway/SNI configuration, root routing, app delegate, CUSTOM/ALLOW policies, authz decision code, business handler, and event publisher.
- Resolve named source regions or unique text anchors into current line ranges during catalog generation. Do not maintain hard-coded line numbers.
- Map rendered YAML through resource identity and field paths. Explain configuration precedence and show the contributing defaults/overrides.
- Missing or ambiguous anchors produce a visible mapping diagnostic, never a guessed highlight. Existing registered mappings must pass validation.
- Source is read-only. File links use catalog IDs; there is no arbitrary filesystem-reading endpoint.
- Exclude credentials, `.local`, `.env`, generated dependency archives, and rendered Kubernetes Secrets. Secret templates may show variable references, never resolved values.

### Keep local edits visible without misrepresenting deployed behavior

- Add an explicit `make learn-watch ENV=stg` command that regenerates and synchronizes the selected environment’s learning catalog.
- Store bounded, compressed catalog data in a Helm-managed ConfigMap mounted read-only by web. Source-only refreshes must not rebuild images or restart web.
- Extend the existing watcher implementation with this mode so debounce and deployment serialization are shared. Do not run competing Helm upgrades.
- Publish catalog updates atomically; retain the last valid bundle when generation fails. Poll the catalog revision and refresh the inspector while preserving selection.
- Show workspace revision, last successful configuration-apply provenance, and workload build revision separately.
- Include source revision metadata in workload builds/events. Mark edited source as potentially different from running code; synchronized source is never labeled “deployed” merely because it is visible.
- Source-only synchronization does not activate newly described operations. Execution remains restricted to the operation catalog activated by an explicit deployment.
- Enforce a catalog size limit below Kubernetes’ ConfigMap limit; report oversized files/bundles instead of silently truncating content.

## 4. Interfaces and implementation structure

- Extend `POST /api/playground` with registered service/operation identifiers, protocol-specific input, and a validated request ID. Keep `/api/demo` compatible with existing smoke checks.
- Resolve destinations and methods from the active server-side catalog. Clients cannot provide arbitrary upstream URLs.
- Add read-only catalog and source endpoints under `/api/learn`, including revision metadata and resolved source highlights.
- Extend event types with stable event identity, source revision, and explicit HTTP/gRPC status information. Continue supporting existing event fields during rollout.
- Separate frontend components for service navigation, operation forms, journey rendering, replay state, explanations, and source viewing.
- Maintain the existing environment isolation, central authorization, runtime configuration, and lightweight event service. No tracing backend or durable broker is added.

## 5. Acceptance tests and delivery

- Run every business service individually; verify admin/reader/missing/invalid cases and correlate each response with its own events.
- Verify denied requests cannot reach handlers, incomplete telemetry is presented honestly, and replay makes no network calls.
- Test concurrent requests, out-of-order/duplicate events, reconnect/replay history, observer identity separation, and retention limits.
- Insert lines above source anchors and confirm highlights move correctly. Test broken anchors, deleted files, sanitized YAML, traversal rejection, and oversized bundles.
- Add a fixture service/chart/descriptor and verify discovery, file listing, operation registration, and topology appearance without frontend edits.
- Verify local source synchronization updates the viewer without claiming rebuilt behavior, rolling workloads, or affecting the other environment.
- Run strict TypeScript and Go tests, Helm validation, browser accessibility/mobile checks, both environment smoke suites, and isolation checks.
- Deploy and validate staging first, then local `prd`. Update the repository and app deployment guides with the learning descriptor contract and watcher commands.

**Chosen defaults:** bright learning studio; guided exploration; explanation before code; read-only source inspection; safe request detail; app discovery plus teaching descriptors; explicit local synchronization; no remote deployment or infrastructure expansion.

## Implementation audit and continuation (2026-09-11)

The initial workspace already contained the eight learning descriptors, catalog generator, separate learning ConfigMap chart, synchronization/deployment scripts, registered playground operations, telemetry revisions, and studio components. It was not ready to run: the frontend had a JSX syntax error, and the new catalog/journey paths had no acceptance suite or operator documentation.

The continuation completed these fixes and checks:

- Fixed frontend compilation, initial business-service selection, independent custom observer credentials, missing-token observation, and active-operation filtering for background runs.
- Made replay follow the descriptor's step count, snapshot its event evidence, and respect reduced motion. Authorization is shown as a branch from the destination Envoy, with observation separate from business traffic.
- Preserved inspector file/tab/resource selection across catalog refreshes and limited source highlighting scroll to the code pane. Added keyboard tab navigation, mobile connection state, readable supporting typography, contrast corrections, and guided identity examples.
- Distinguished timeout, outage, denial, GraphQL errors, and native gRPC errors. Successful gRPC event status zero is explicitly serialized.
- Added strict operation/Protobuf validation, duplicate-ID rejection, rendered-field diagnostics, contributing values links, source sanitization, and pre-deployment bundle validation. Source-only synchronization retains the activated contract; edited definitions stay disabled in the UI until deployment.
- Documented descriptors, source provenance, separate Helm ownership, projected-volume propagation, limits, and foreground watcher commands.
- Added `scripts/test_learning_catalog.py`, `scripts/check_journey.cjs`, `scripts/check_studio.cjs`, and `scripts/check_learning_sync.py`; extended the existing playground integration suite to every operation and all four request identities.

Validation recorded so far:

- Go race tests, strict TypeScript, eight catalog fixture tests, and journey-state checks passed.
- Both environment Helm/catalog validations and the existing watcher check passed.
- Staging individual-operation checks and the full smoke suite passed, including direct bypass denial, unauthorized service-account denial, correlated events, and fail-closed outage with authz restored.
- Browser checks passed for all protocols, observer separation, replay without dispatch, inspector persistence, keyboard navigation, concurrent selection, and mobile layout.
- Source synchronization moved highlights and exposed an inactive fixture operation without rolling any pod or changing `prd`; fixture edits were restored.
- Final frontend artifact validation, local `prd` rollout, both-environment final smoke/isolation checks, and the user-facing port-forward are tracked below when finished.

Final continuation (2026-09-11):

- Added an animated request graph to the journey view: a directional packet travels from Browser through Next.js, gateway, API Envoy, handler, and response; authorization is shown as a branch and telemetry remains a separate observation path. Completed requests animate once, live requests loop while pending, replay moves through captured steps, and reduced-motion preferences disable movement without hiding state.
- Fixed `make smoke-all` probe cleanup so back-to-back environment runs wait for the previous probe to terminate before reusing its name.
- Promoted the verified `learning-studio-20260911-final` image to the local prd web configuration and rebuilt/deployed the full application set under that tag so both environments emit the current event metadata.
- Validation passed: strict TypeScript, production Next.js build, staging and prd individual-operation suites, both environment smoke suites, `make smoke-all`, and cross-environment isolation. Staging is available through the Kubernetes forward at `http://localhost:3100/`.
