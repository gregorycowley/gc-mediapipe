# WebSocket bridge (Hand Lab ↔ Figma)

Hand Lab can host a small **WebSocket server** inside the Electron **main process** so students do not need a separate server install. The Figma plugin (or any other client) connects to the same URL and receives gesture messages in real time.

## In-app server

- **Implementation:** `electron/ws-bridge.cjs` (uses the [`ws`](https://github.com/websockets/ws) package).
- **Startup:** The hub starts when the app starts and stops when the app quits.
- **Where it runs:** Main process only — not in the browser renderer.

## Behavior

- **Hub / relay:** Any connected client can send messages. Each message is **broadcast to every other client** (the sender does not receive its own message back).
- **Typical use:** The Hand Lab window connects as a **WebSocket client** to the hub and sends `gesture_match` JSON. The Figma plugin connects as another client and receives those messages to drive the file.

## Default URL

- **`ws://localhost:8787`** — loopback on the same machine (Hand Lab and Figma on one Mac).
- The renderer shows a short **“In-app hub”** line with the URL and a live **client count** after the server is listening.

## Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `HAND_LAB_WS_PORT` | `8787` | TCP port for the WebSocket server. |
| `HAND_LAB_WS_HOST` | `localhost` | **Listen address.** `localhost` = only this computer. **`0.0.0.0`** = all network interfaces so other devices on the LAN can connect using `ws://<this-computer-LAN-IP>:<port>`. |

Example (listen on all interfaces for classroom LAN):

```bash
HAND_LAB_WS_HOST=0.0.0.0 npm start
```

You may need to allow the app through the OS firewall for inbound connections from other machines.

## Connecting Hand Lab

1. Start Hand Lab (the in-app hub starts automatically if the port is free).
2. In **WebSocket → Bridge URL**, use `ws://127.0.0.1:8787` (or your chosen port).
3. Click **Connect** so the app’s renderer joins the hub as a client and can send gesture events.

## Connecting the Figma plugin

Use the **same** WebSocket URL (e.g. `ws://127.0.0.1:8787` on the same machine). The plugin’s `manifest.json` must allow that host under `networkAccess` / `devAllowedDomains` for development.

## Port already in use

If another process uses the port, you’ll see an error. Set a different port, for example:

```bash
HAND_LAB_WS_PORT=9876 npm start
```

Use the same port in the Bridge URL in Hand Lab and in the Figma plugin.

## Using a different server

You are **not** required to use the built-in hub. Any WebSocket server that accepts client connections will work if Hand Lab and Figma both point to its URL. The built-in server is optional convenience for local and classroom setups.

## Message shape (reference)

The renderer sends JSON such as:

```json
{
  "v": 1,
  "type": "event",
  "id": "…",
  "ts": 1710000000000,
  "payload": {
    "kind": "gesture_match",
    "gesture": { "id": "…", "name": "…", "handedness": "…" },
    "score": 0.08,
    "target": {
      "path": "Page 1 / Frame A / Rectangle 1",
      "property": "visible",
      "value": "true"
    }
  }
}
```

The Figma plugin can apply `target` directly (without manual selection). Supported properties are:

- `x` (number)
- `y` (number)
- `width` (number, `>= 0`)
- `height` (number, `>= 0`)
- `visible` (value like `true` / `false`)
- `opacity` (value `0..1`)
- `color` (value like `#FF0000`)
- `textContent` (string; applies to text layers)
- `variants` (string like `State=On;Size=L` or JSON object string)

The hub forwards the raw message to other clients; it does not rewrite the payload.
