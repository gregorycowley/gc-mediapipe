/**
 * Local WebSocket hub: any client can connect; each text/binary message is
 * broadcast to all *other* connected clients (Hand Lab → Figma plugin, etc.).
 */
const { WebSocketServer } = require("ws");

let wss = null;
/** @type {{ running: boolean; port: number | null; listenHost: string | null; connectUrl: string | null; error: string | null; clientCount: number }} */
let state = {
  running: false,
  port: null,
  listenHost: null,
  connectUrl: null,
  error: null,
  clientCount: 0,
};

function clientCount() {
  if (!wss) return 0;
  let n = 0;
  for (const c of wss.clients) {
    if (c.readyState === 1) n += 1;
  }
  return n;
}

function getStatus() {
  if (wss) {
    const addr = wss.address();
    if (addr && typeof addr === "object" && addr.port != null) {
      const lh = state.listenHost;
      const p = addr.port;
      return {
        running: true,
        port: p,
        listenHost: lh,
        connectUrl: `ws://127.0.0.1:${p}`,
        error: state.error,
        clientCount: clientCount(),
      };
    }
  }
  return { ...state, clientCount: clientCount() };
}

/**
 * env HAND_LAB_WS_PORT (default 8787)
 * env HAND_LAB_WS_HOST: listen address — 127.0.0.1 (default, loopback only) or 0.0.0.0 (all interfaces, for LAN)
 */
function startBridge() {
  if (wss) return getStatus();

  const port = Number(process.env.HAND_LAB_WS_PORT || 8787);
  const listenHost = process.env.HAND_LAB_WS_HOST || "127.0.0.1";

  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    state.error = `Invalid HAND_LAB_WS_PORT: ${process.env.HAND_LAB_WS_PORT}`;
    return getStatus();
  }

  wss = new WebSocketServer({ host: listenHost, port });

  wss.on("connection", (ws) => {
    ws.on("message", (data, isBinary) => {
      if (!wss) return;
      for (const client of wss.clients) {
        if (client !== ws && client.readyState === 1) {
          client.send(data, { binary: isBinary });
        }
      }
    });
  });

  wss.on("listening", () => {
    const addr = wss.address();
    const p = addr && typeof addr === "object" && addr.port != null ? addr.port : port;
    const sameMachine = "127.0.0.1";
    state = {
      running: true,
      port: p,
      listenHost,
      connectUrl: `ws://${sameMachine}:${p}`,
      error: null,
      clientCount: 0,
    };
    console.log(`[ws-bridge] listening on ${listenHost}:${p} → this Mac: ${state.connectUrl}`);
    if (listenHost === "0.0.0.0") {
      console.log("[ws-bridge] Other devices on LAN: ws://<this-computer-LAN-IP>:" + p);
    }
  });

  wss.on("error", (err) => {
    state.error = err.code === "EADDRINUSE" ? `Port ${port} in use (set HAND_LAB_WS_PORT)` : err.message;
    state.running = false;
    console.error("[ws-bridge]", err);
    wss = null;
  });

  return getStatus();
}

function stopBridge() {
  if (!wss) return;
  try {
    wss.close();
  } catch {
    /* ignore */
  }
  wss = null;
  state = {
    running: false,
    port: null,
    listenHost: null,
    connectUrl: null,
    error: null,
    clientCount: 0,
  };
}

module.exports = { startBridge, stopBridge, getStatus };
