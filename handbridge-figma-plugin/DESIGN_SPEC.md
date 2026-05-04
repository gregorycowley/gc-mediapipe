# `gc-mediapipe2f` Figma Plugin — Design Spec

## Purpose
Build a Figma plugin that **receives messages from the `gc-mediapipe` app** and **applies them to the open Figma document** (create/update nodes, selection, viewport, etc.).

This plugin is a **receiver + executor** inside Figma; the external app is the **source of intent**.

## Goals
- **Receive real-time or near-real-time messages** from `gc-mediapipe` and apply them to the open document.
- **Provide a minimal UI** for connection status, pairing/authorization, and basic controls (connect/disconnect, debug console).
- **Translate incoming “intent” messages** into deterministic Figma operations (create/update nodes, set properties, layout, styles).

## Non-goals
- **No heavy editing UI** inside Figma (the source of truth is `gc-mediapipe`).
- **No long-running background service** beyond the plugin’s session lifecycle.
- **No inbound network listener in plugin main** (Figma plugin main thread can’t accept inbound connections directly).

## Current Baseline (repo state)
- `manifest.json`
  - `"main": "code.js"`
  - `"networkAccess.allowedDomains": ["none"]`
  - no `"ui"` entry (no plugin UI)
- `code.ts` is the template that creates rectangles and immediately closes.

This spec assumes we will add a plugin UI (`ui.html` + UI script) to host the network client and forward messages to the main thread.

## High-level Architecture
The system is three cooperating pieces:

### A) `gc-mediapipe` app (external)
Produces events/commands (pose landmarks, gestures, tool intents, selections, etc.) and exposes a **bridge endpoint** reachable by the plugin.

### B) Plugin UI (browser sandbox inside Figma)
Runs in a browser-like environment and is the **network client**.

Responsibilities:
- Connect to the bridge via WebSocket (preferred) or HTTP polling (fallback)
- Perform handshake/auth and keepalive
- Validate + normalize incoming messages
- Forward messages to plugin main via `parent.postMessage(...)`

### C) Plugin main (`code.ts` → `code.js`)
Has access to the `figma` document APIs.

Responsibilities:
- Receive messages from UI via `figma.ui.onmessage`
- Apply document changes (create/update nodes, selection, styles)
- Persist small settings (pairing token, last connection URL) via `figma.clientStorage`
- Emit acknowledgements and errors back to UI

## Connectivity Model (Bridge)
Because a Figma plugin cannot accept inbound messages directly, the external app must expose a reachable endpoint.

### Preferred: WebSocket bridge
- `gc-mediapipe` runs a WebSocket server (local or remote).
- Plugin UI connects, subscribes to a session, receives push events.

### Fallback: HTTP long-poll / polling
- Plugin UI polls `GET /events?since=...` at a modest rate (e.g. 2–10 Hz).
- Used when WebSocket is unavailable.

### Manifest requirements
`manifest.json` must allow the bridge domain(s) via `networkAccess.allowedDomains`.
- For remote bridge: allow the HTTPS hostname.
- For local development: allow `http://127.0.0.1:<port>` / `http://localhost:<port>` if supported by Figma’s allowlist behavior in your environment.

## Plugin UX (Minimal, Functional)
### UI screen states
- **Disconnected**
  - Inputs: Bridge URL, Session ID (optional), “Connect”
  - Option: “Pair / Generate token”
- **Connecting**
  - Progress indicator + last connection attempt
- **Connected**
  - Status: latency, last message timestamp, message rate
  - Toggles: “Apply live updates”, “Debug log”, “Auto-select created nodes”
  - Buttons: “Disconnect”, “Send ping”, “Clear debug”
- **Error**
  - Friendly error text + “Retry” + copyable technical details

### Core user flows
- **First run pairing**
  - User enters bridge URL → plugin requests pairing → external app shows/returns short code or token → plugin stores token.
- **Normal run**
  - User clicks Connect → plugin resumes last URL/token → starts receiving commands.

## Message Protocol
Define a canonical message envelope usable for both WS and HTTP delivery.

### Envelope
- `v`: protocol version (integer)
- `type`: `"hello" | "hello_ack" | "auth" | "auth_ack" | "event" | "command" | "ack" | "error" | "ping" | "pong"`
- `id`: unique message id (uuid or monotonic id)
- `ts`: timestamp (ms)
- `session`: session id / document binding id
- `auth`: token or signature (depending on handshake)
- `payload`: message-specific object

### Handshake (example)
1. UI → bridge: `hello` (plugin instance id, requested session)
2. bridge → UI: `hello_ack` (capabilities, required auth mode)
3. UI → bridge: `auth` (token / pairing code)
4. bridge → UI: `auth_ack` (scopes + expiry)

### Command categories (examples)
- **Document ops**
  - `createNodes`: rectangles/frames/components with properties
  - `updateNodes`: set fills/strokes/text, position/size, constraints
  - `deleteNodes`
- **Selection / viewport**
  - `setSelection`: node ids
  - `viewportFocus`: node ids
- **Higher-level intents**
  - `gesture`: pinch/drag/rotate mapped to node transforms
  - `landmarks`: pose/hand landmark sets (optionally used to drive transforms)
- **Query ops**
  - `getSelection`
  - `findNodesByName`
  - `getNodeProps` (safe subset)

### Ack + error
- Commands may set `expectsAck: true`.
- Main replies with:
  - `{ type: "ack", id: <original id>, payload: { result } }`
  - or `{ type: "error", id: <original id>, payload: { code, message, details } }`

## Command Execution Model (Main Thread)
### Principles
- **Deterministic**: same message → same result (as much as possible).
- **Idempotent**: updates reference stable ids; creates return ids for subsequent updates.
- **Bounded**: guardrails against runaway node creation or huge payloads.

### Implementation approach
- Maintain in-memory `Map<externalId, figmaNodeId>` for stable mapping.
- Support batch transactions:
  - UI sends `commandBatch` containing ordered ops.
  - Main applies sequentially, returns one ack.

### Performance constraints
- Throttle high-frequency updates:
  - UI merges rapid `landmarks/gesture` events and sends at most ~30 fps (or less).
  - Main applies only the latest update per node per frame.

## Data Storage
### `figma.clientStorage`
- `bridgeUrl`
- `sessionId` (optional)
- `authToken` (if safe; otherwise store only short-lived token and require re-pair)
- `settings` (toggles)

### Optional per-document metadata
Use `figma.root.setPluginData(...)` for:
- Document binding id (to prevent cross-document accidents)
- External-to-figma id map snapshot (if persistence across runs is needed)

## Security & Safety
- **Allowlist network domains** via manifest; avoid wildcard unless intentionally supported.
- **Authentication**: short-lived bearer token or signed nonce challenge.
- **Session binding**: include document binding id so messages can’t affect the wrong file.
- **Scopes**: tokens include permissions (read selection, write nodes, etc.).
- **Rate limits**: reject/ignore oversized payloads or excessive message rates.
- **Validation**: strict schema validation in UI before forwarding; main re-validates critical fields.

## Error Handling & Resilience
- Connection retry with exponential backoff (UI).
- “Safe mode” toggle: stop applying commands but keep connection alive.
- Batch behavior:
  - return error including which op failed
  - configurable “fail-fast” vs “best-effort”
- User-facing errors are readable and copyable for debugging.

## Observability (Developer Experience)
- UI “Debug log” includes:
  - connection lifecycle
  - last N messages (redacting auth)
  - acks/errors
- Optional “Export logs” (copy to clipboard).

## Required Repo Changes (High level)
- Add plugin UI:
  - `ui.html` (plus UI script)
- Update `manifest.json`:
  - add `"ui": "ui.html"`
  - configure `networkAccess.allowedDomains` for the bridge host(s)
- Update `code.ts`:
  - call `figma.showUI(...)`
  - implement `figma.ui.onmessage` dispatcher + command handlers
  - remove immediate `figma.closePlugin()`; keep running until user disconnects/closes

## Milestones (Implementation Roadmap)
### MVP
- UI connects to bridge, receives `commandBatch`
- Main applies: create/update rectangles + selection + viewport focus
- Ack/error loop works end-to-end

### V1
- ExternalId↔NodeId mapping; idempotent updates
- Gesture/landmark streaming with throttling
- Pairing/auth + persisted settings

### V2
- More node types (text, frames, components), styles, auto-layout
- Query APIs (read selection, node props) back to `gc-mediapipe`

