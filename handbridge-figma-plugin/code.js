"use strict";
(() => {
  // ui.html
  var ui_default = '<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="UTF-8" />\n    <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <title>Hand Bridge</title>\n    <style>\n      :root {\n        color-scheme: light;\n        --bg: #ffffff;\n        --panel: #f6f7fb;\n        --border: rgba(0, 0, 0, 0.12);\n        --text: rgba(0, 0, 0, 0.9);\n        --muted: rgba(0, 0, 0, 0.6);\n        --accent: #0b5cff;\n        --ok: #0a8f4e;\n        --err: #c53636;\n      }\n      body {\n        margin: 0;\n        font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto,\n          sans-serif;\n        color: var(--text);\n        background: var(--bg);\n      }\n      header {\n        padding: 12px 12px 10px;\n        border-bottom: 1px solid var(--border);\n        background: var(--panel);\n      }\n      h1 {\n        font-size: 13px;\n        margin: 0;\n        font-weight: 650;\n      }\n      .sub {\n        margin: 4px 0 0;\n        font-size: 11px;\n        color: var(--muted);\n      }\n      .title-row {\n        display: flex;\n        align-items: center;\n        justify-content: space-between;\n        gap: 8px;\n      }\n      .version {\n        font-size: 10px;\n        color: var(--muted);\n        border: 1px solid var(--border);\n        border-radius: 999px;\n        padding: 2px 8px;\n        white-space: nowrap;\n      }\n      main {\n        padding: 12px;\n        display: grid;\n        gap: 10px;\n      }\n      label {\n        display: grid;\n        gap: 4px;\n        font-size: 11px;\n        color: var(--muted);\n      }\n      input {\n        font: inherit;\n        font-size: 12px;\n        padding: 7px 8px;\n        border: 1px solid var(--border);\n        border-radius: 8px;\n        outline: none;\n      }\n      input:focus {\n        border-color: rgba(11, 92, 255, 0.5);\n        box-shadow: 0 0 0 3px rgba(11, 92, 255, 0.12);\n      }\n      select {\n        font: inherit;\n        font-size: 12px;\n        padding: 7px 8px;\n        border: 1px solid var(--border);\n        border-radius: 8px;\n        outline: none;\n        background: #fff;\n      }\n      select:focus {\n        border-color: rgba(11, 92, 255, 0.5);\n        box-shadow: 0 0 0 3px rgba(11, 92, 255, 0.12);\n      }\n      .row {\n        display: flex;\n        gap: 8px;\n        align-items: center;\n        flex-wrap: wrap;\n      }\n      button {\n        font: inherit;\n        font-size: 12px;\n        padding: 7px 10px;\n        border-radius: 10px;\n        border: 1px solid var(--border);\n        background: var(--panel);\n        cursor: pointer;\n      }\n      button.primary {\n        border-color: rgba(11, 92, 255, 0.25);\n        background: rgba(11, 92, 255, 0.08);\n        color: var(--accent);\n        font-weight: 600;\n      }\n      button:disabled {\n        opacity: 0.5;\n        cursor: not-allowed;\n      }\n      .status {\n        font-size: 11px;\n        color: var(--muted);\n      }\n      .status.ok {\n        color: var(--ok);\n      }\n      .status.err {\n        color: var(--err);\n      }\n      .log {\n        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;\n        font-size: 11px;\n        background: #0b1020;\n        color: #e7ecff;\n        border-radius: 10px;\n        padding: 8px;\n        max-height: 140px;\n        overflow: auto;\n        white-space: pre-wrap;\n        word-break: break-word;\n      }\n      .pill {\n        font-size: 11px;\n        padding: 2px 8px;\n        border-radius: 999px;\n        border: 1px solid var(--border);\n        color: var(--muted);\n      }\n    </style>\n  </head>\n  <body>\n    <header>\n      <div class="title-row">\n        <h1>Hand Bridge \u2192 Figma</h1>\n        <span class="version" id="versionLabel">build v?</span>\n      </div>\n      <p class="sub">Connect to your Hand Bridge WebSocket and apply gesture targets directly.</p>\n    </header>\n    <main>\n      <label>\n        Bridge URL (WebSocket)\n        <input id="wsUrl" type="text" spellcheck="false" placeholder="ws://localhost:8787" />\n      </label>\n      <div class="row">\n        <button class="primary" id="connectBtn">Connect</button>\n        <button id="disconnectBtn" disabled>Disconnect</button>\n        <span class="pill" id="connPill">disconnected</span>\n      </div>\n\n      <div class="status" id="status">Waiting\u2026</div>\n\n      <div class="row" style="flex-direction: column; align-items: stretch; gap: 8px">\n        <span class="status" style="margin: 0">Preview apply (applies change for visual validation):</span>\n        <label>\n          Layer path\n          <input id="dryPath" type="text" spellcheck="false" placeholder="Page 1 / Frame A / Rectangle 1" />\n        </label>\n        <label>\n          Property\n          <select id="dryProperty">\n            <option value="x">x</option>\n            <option value="y">y</option>\n            <option value="width">width</option>\n            <option value="height">height</option>\n            <option value="visible">visible</option>\n            <option value="opacity">opacity</option>\n            <option value="color">color</option>\n            <option value="textContent">text content</option>\n            <option value="variants">variants</option>\n          </select>\n        </label>\n        <label>\n          Value\n          <input id="dryValue" type="text" spellcheck="false" placeholder="true, 0.5, #FF0000, Hello, State=On;Size=L" />\n        </label>\n        <div class="row">\n          <button id="dryRunBtn">Preview apply</button>\n          <span class="status" id="dryRunResult">\u2014</span>\n        </div>\n      </div>\n\n      <div class="status" id="lastGesture">Last gesture: \u2014</div>\n\n      <div class="log" id="log" aria-label="debug log"></div>\n    </main>\n\n    <script>\n      const $ = (id) => document.getElementById(id);\n      const wsUrlEl = $("wsUrl");\n      const connectBtn = $("connectBtn");\n      const disconnectBtn = $("disconnectBtn");\n      const connPill = $("connPill");\n      const statusEl = $("status");\n      const logEl = $("log");\n      const lastGestureEl = $("lastGesture");\n      const versionLabelEl = $("versionLabel");\n      const dryPathEl = $("dryPath");\n      const dryPropertyEl = $("dryProperty");\n      const dryValueEl = $("dryValue");\n      const dryRunBtn = $("dryRunBtn");\n      const dryRunResultEl = $("dryRunResult");\n\n      const STORAGE_URL_KEY = "handlab.bridgeUrl";\n      const DEFAULT_WS_URL = "ws://localhost:8787";\n\n      /** Figma sometimes loads plugin UI in a context where localStorage throws (e.g. data: URLs). */\n      function storageGet(key) {\n        try {\n          return localStorage.getItem(key);\n        } catch {\n          return null;\n        }\n      }\n      function storageSet(key, value) {\n        try {\n          localStorage.setItem(key, value);\n        } catch {\n          /* ignore */\n        }\n      }\n\n      wsUrlEl.value = storageGet(STORAGE_URL_KEY) || DEFAULT_WS_URL;\n\n      let ws = null;\n      let lastGesture = null; // {id,name,handedness,score}\n      let lastTarget = null; // {path,property,value}\n\n      function log(line) {\n        const ts = new Date().toLocaleTimeString();\n        logEl.textContent = `[${ts}] ${line}\\n` + logEl.textContent.slice(0, 4000);\n      }\n\n      function setConn(state) {\n        connPill.textContent = state;\n        connPill.style.borderColor =\n          state === "connected" ? "rgba(10,143,78,0.35)" : "rgba(0,0,0,0.12)";\n        connectBtn.disabled = state === "connected" || state === "connecting";\n        disconnectBtn.disabled = state === "disconnected";\n      }\n\n      function postToMain(msg) {\n        parent.postMessage({ pluginMessage: msg }, "*");\n      }\n\n      /** Figma / Chromium may deliver text frames as string, ArrayBuffer, or Blob. */\n      function wsPayloadToText(data) {\n        if (typeof data === "string") return data;\n        if (data instanceof ArrayBuffer) return new TextDecoder("utf-8").decode(data);\n        if (ArrayBuffer.isView(data))\n          return new TextDecoder("utf-8").decode(data.buffer, data.byteOffset, data.byteLength);\n        return String(data);\n      }\n\n      function unwrapPayload(msg) {\n        let p = msg && msg.payload;\n        if (typeof p === "string") {\n          try {\n            p = JSON.parse(p);\n          } catch {\n            return {};\n          }\n        }\n        return p && typeof p === "object" ? p : {};\n      }\n\n      /** Hand Lab sends { type: "event", payload: { kind: "gesture_match", gesture, score, target } }. */\n      function extractGestureMatch(msg) {\n        if (msg == null) return null;\n        if (typeof msg === "string") {\n          try {\n            msg = JSON.parse(msg);\n          } catch {\n            return null;\n          }\n        }\n        if (typeof msg !== "object") return null;\n        const payload = unwrapPayload(msg);\n        const kind = payload.kind ?? msg.kind;\n        if (kind !== "gesture_match") return null;\n        return {\n          gesture: payload.gesture && typeof payload.gesture === "object" ? payload.gesture : {},\n          score: payload.score,\n          target: payload.target && typeof payload.target === "object" ? payload.target : null,\n        };\n      }\n\n      function handleParsedWsMessage(msg) {\n        if (typeof msg === "string") {\n          try {\n            msg = JSON.parse(msg);\n          } catch {\n            log(`WS string is not JSON: ${msg.slice(0, 80)}`);\n            return;\n          }\n        }\n        const match = extractGestureMatch(msg);\n        if (match) {\n          const g = match.gesture || {};\n          const rawName = typeof g.name === "string" ? g.name.trim() : "";\n          lastGesture = {\n            id: g.id,\n            name: rawName || "(unnamed)",\n            handedness: g.handedness || "Unknown",\n            score: match.score,\n          };\n          lastGestureEl.textContent = `Last gesture: ${lastGesture.name} (score ${Number(lastGesture.score).toFixed(3)})`;\n          log(`gesture_match: ${lastGesture.name}`);\n          if (match.target) {\n            lastTarget = match.target;\n            if (typeof match.target.path === "string") dryPathEl.value = match.target.path;\n            if (typeof match.target.property === "string") dryPropertyEl.value = match.target.property;\n            dryValueEl.value =\n              match.target.value == null\n                ? ""\n                : typeof match.target.value === "string"\n                  ? match.target.value\n                  : JSON.stringify(match.target.value);\n          }\n          postToMain({ type: "gesture_match", gesture: lastGesture, target: match.target });\n          return;\n        }\n        const p = unwrapPayload(msg);\n        if (msg?.type === "event") log(`event (not match) kind=${p.kind ?? "?"}`);\n        else log(`msg type=${msg?.type ?? "?"}`);\n      }\n\n      connectBtn.onclick = () => {\n        const url = wsUrlEl.value.trim();\n        if (!url) return;\n        storageSet(STORAGE_URL_KEY, url);\n        try {\n          if (ws && (ws.readyState === 0 || ws.readyState === 1)) return;\n          setConn("connecting");\n          statusEl.textContent = "Connecting\u2026";\n          statusEl.className = "status";\n          ws = new WebSocket(url);\n          ws.onopen = () => {\n            setConn("connected");\n            statusEl.textContent = "Connected. Waiting for gesture_match events\u2026";\n            statusEl.className = "status ok";\n            log("WS open");\n          };\n          ws.onclose = () => {\n            setConn("disconnected");\n            statusEl.textContent = "Disconnected.";\n            statusEl.className = "status";\n            log("WS closed");\n          };\n          ws.onerror = () => {\n            statusEl.textContent = "WebSocket error (check allowedDomains + URL).";\n            statusEl.className = "status err";\n            log("WS error");\n          };\n          ws.onmessage = (ev) => {\n            const data = ev.data;\n            if (data instanceof Blob) {\n              data\n                .text()\n                .then((text) => {\n                  let msg;\n                  try {\n                    msg = JSON.parse(text);\n                  } catch {\n                    log(`Non-JSON (blob): ${text.slice(0, 120)}`);\n                    return;\n                  }\n                  handleParsedWsMessage(msg);\n                })\n                .catch((e) => log(`Blob read error: ${e.message || e}`));\n              return;\n            }\n            let text;\n            try {\n              text = wsPayloadToText(data);\n            } catch (e) {\n              log(`WS decode error: ${e.message || e}`);\n              return;\n            }\n            let msg;\n            try {\n              msg = JSON.parse(text);\n            } catch {\n              log(`Non-JSON message: ${text.slice(0, 120)}`);\n              return;\n            }\n            handleParsedWsMessage(msg);\n          };\n        } catch (e) {\n          setConn("disconnected");\n          statusEl.textContent = `Failed to connect: ${e.message || e}`;\n          statusEl.className = "status err";\n          log(`connect exception: ${e.message || e}`);\n        }\n      };\n\n      disconnectBtn.onclick = () => {\n        try {\n          ws?.close();\n        } catch {}\n      };\n\n      dryRunBtn.onclick = () => {\n        const path = dryPathEl.value.trim();\n        const property = dryPropertyEl.value.trim();\n        const valueRaw = dryValueEl.value;\n        let value = valueRaw;\n        const v = valueRaw.trim();\n        if (v.startsWith("{") && v.endsWith("}")) {\n          try {\n            value = JSON.parse(v);\n          } catch {\n            // Keep as raw string if not valid JSON.\n          }\n        }\n        postToMain({ type: "dry_run_target", target: { path, property, value } });\n        dryRunResultEl.textContent = "Applying preview\u2026";\n        log(`dry_run: path="${path}" property="${property}"`);\n      };\n\n      window.onmessage = (event) => {\n        const msg = event?.data?.pluginMessage;\n        if (!msg || typeof msg !== "object") return;\n        if (msg.type === "plugin_version") {\n          versionLabelEl.textContent = `build v${msg.version || "?"}`;\n          return;\n        }\n        if (msg.type === "dry_run_result") {\n          dryRunResultEl.textContent = msg.message || "Done";\n          log(`dry_run_result: ${msg.message || "(no message)"}`);\n        }\n      };\n\n      postToMain({ type: "request_version" });\n      setConn("disconnected");\n      log("UI ready");\n    <\/script>\n  </body>\n</html>\n\n';

  // build-version.json
  var build_version_default = {
    version: 2
  };

  // code.ts
  var _a;
  var PLUGIN_BUILD_VERSION = String((_a = build_version_default.version) != null ? _a : "?");
  function setSolidFill(nodes, r, g, b) {
    const paint = {
      type: "SOLID",
      color: { r, g, b }
    };
    for (const n of nodes) {
      if ("fills" in n) n.fills = [paint];
    }
  }
  var LEGACY_BINDING_KEYS = ["handlab.bindings.v2", "handlab.bindings.v1"];
  function normalizedSegments(path) {
    return path.split("/").map((s) => s.trim()).filter(Boolean);
  }
  function nodeName(node) {
    return "name" in node ? node.name : "";
  }
  async function childNodesAsync(node) {
    if (node.type === "PAGE" && "loadAsync" in node) {
      await node.loadAsync();
    }
    return "children" in node ? node.children : [];
  }
  function findPathChild(nodes, segment) {
    const exact = nodes.filter((n) => nodeName(n) === segment);
    if (exact.length) return exact;
    const needle = segment.toLowerCase();
    return nodes.filter((n) => nodeName(n).toLowerCase() === needle);
  }
  async function resolveNodeByPathDetailed(path) {
    const segments = normalizedSegments(path);
    if (!segments.length) return { ok: false, reason: "Empty path." };
    const pages = [...figma.root.children];
    const first = segments[0];
    const exactPage = pages.filter((p) => p.name === first);
    const pageMatches = exactPage.length ? exactPage : pages.filter((p) => p.name.toLowerCase() === first.toLowerCase());
    const roots = pageMatches.length ? pageMatches : [figma.currentPage];
    const startIdx = pageMatches.length ? 1 : 0;
    let frontier = [...roots];
    for (let i = startIdx; i < segments.length; i++) {
      const seg = segments[i];
      const next = [];
      const parentNames = /* @__PURE__ */ new Set();
      for (const node of frontier) {
        const children = await childNodesAsync(node);
        if (!children.length) continue;
        for (const child of children) parentNames.add(nodeName(child));
        next.push(...findPathChild(children, seg));
      }
      if (!next.length) {
        const sample = [...parentNames].filter(Boolean).slice(0, 8).join(", ");
        return {
          ok: false,
          reason: `Missing segment "${seg}" at position ${i + 1}/${segments.length}. Candidates here: ${sample || "(none)"}`
        };
      }
      frontier = next;
    }
    for (const n of frontier) {
      if (n.type !== "DOCUMENT" && n.type !== "PAGE") return { ok: true, node: n };
    }
    return { ok: false, reason: "Path resolves to non-scene node." };
  }
  function parseBoolean(value) {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value !== 0;
    if (typeof value === "string") {
      const v = value.trim().toLowerCase();
      if (v === "true" || v === "1" || v === "yes" || v === "on") return true;
      if (v === "false" || v === "0" || v === "no" || v === "off") return false;
    }
    return null;
  }
  function parseOpacity(value) {
    if (typeof value === "number" && Number.isFinite(value)) return Math.min(1, Math.max(0, value));
    if (typeof value === "string") {
      const n = Number(value.trim());
      if (Number.isFinite(n)) return Math.min(1, Math.max(0, n));
    }
    return null;
  }
  function parseNumber01(value) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string") {
      const n = Number(value.trim());
      if (Number.isFinite(n)) return n;
    }
    return null;
  }
  function parseHexColor(value) {
    if (typeof value !== "string") return null;
    const hex = value.trim().replace(/^#/, "");
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
    const num = Number.parseInt(hex, 16);
    const r = (num >> 16 & 255) / 255;
    const g = (num >> 8 & 255) / 255;
    const b = (num & 255) / 255;
    return { r, g, b };
  }
  function parseGestureTarget(raw) {
    if (!raw || typeof raw !== "object") return null;
    const o = raw;
    if (typeof o.path !== "string" || typeof o.property !== "string") return null;
    const path = o.path.trim();
    const property = o.property.trim();
    if (!path || !property) return null;
    return { path, property, value: o.value };
  }
  async function ensureTextNodeEditable(node) {
    const fonts = node.getRangeAllFontNames(0, node.characters.length);
    for (const font of fonts) {
      if (font !== figma.mixed) await figma.loadFontAsync(font);
    }
  }
  function parseVariants(value) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const out2 = {};
      for (const [k, v] of Object.entries(value)) {
        if (!k.trim()) continue;
        if (typeof v === "string" || typeof v === "boolean") out2[k.trim()] = v;
      }
      return Object.keys(out2).length ? out2 : null;
    }
    if (typeof value !== "string") return null;
    const raw = value.trim();
    if (!raw) return null;
    if (raw.startsWith("{") && raw.endsWith("}")) {
      try {
        const parsed = JSON.parse(raw);
        return parseVariants(parsed);
      } catch (e) {
        return null;
      }
    }
    const out = {};
    const pairs = raw.split(/[;,]/);
    for (const pair of pairs) {
      const idx = pair.indexOf("=");
      if (idx <= 0) continue;
      const key = pair.slice(0, idx).trim();
      const valRaw = pair.slice(idx + 1).trim();
      if (!key || !valRaw) continue;
      const b = parseBoolean(valRaw);
      out[key] = b == null ? valRaw : b;
    }
    return Object.keys(out).length ? out : null;
  }
  async function applyTargetToNode(node, target) {
    if (!target.path) throw new Error("Target path is empty.");
    if (!target.property) throw new Error("Target property is empty.");
    const prop = target.property;
    if (prop === "x" || prop === "y") {
      const v = parseNumber01(target.value);
      if (v == null) throw new Error(`Invalid ${prop} value: ${String(target.value)}`);
      if (!("x" in node) || !("y" in node)) throw new Error(`Node "${node.name}" has no position properties.`);
      if (prop === "x") node.x = v;
      else node.y = v;
      return `Applied ${prop}=${v} on "${node.name}".`;
    }
    if (prop === "width" || prop === "height") {
      const v = parseNumber01(target.value);
      if (v == null || v < 0) throw new Error(`Invalid ${prop} value: ${String(target.value)}`);
      if (!("resize" in node)) throw new Error(`Node "${node.name}" is not resizable.`);
      const width = prop === "width" ? v : node.width;
      const height = prop === "height" ? v : node.height;
      node.resize(width, height);
      return `Applied ${prop}=${v} on "${node.name}".`;
    }
    if (prop === "visible") {
      const v = parseBoolean(target.value);
      if (v == null) throw new Error(`Invalid visible value: ${String(target.value)}`);
      node.visible = v;
      return `Applied ${prop}=${v} on "${node.name}".`;
    }
    if (prop === "opacity") {
      const v = parseOpacity(target.value);
      if (v == null) throw new Error(`Invalid opacity value: ${String(target.value)}`);
      if (!("opacity" in node)) throw new Error(`Node "${node.name}" has no opacity property.`);
      node.opacity = v;
      return `Applied ${prop}=${v.toFixed(3)} on "${node.name}".`;
    }
    if (prop === "color" || prop === "fillHex") {
      const rgb = parseHexColor(target.value);
      if (!rgb) throw new Error(`Invalid ${prop} value: ${String(target.value)}`);
      if (!("fills" in node)) throw new Error(`Node "${node.name}" has no fills property.`);
      setSolidFill([node], rgb.r, rgb.g, rgb.b);
      return `Applied ${prop}=${String(target.value)} on "${node.name}".`;
    }
    if (prop === "textContent") {
      if (node.type !== "TEXT") throw new Error(`Node "${node.name}" is not a text node.`);
      if (typeof target.value !== "string") throw new Error(`Invalid textContent value: ${String(target.value)}`);
      await ensureTextNodeEditable(node);
      node.characters = target.value;
      return `Applied ${prop} on "${node.name}".`;
    }
    if (prop === "variants") {
      if (node.type !== "INSTANCE") throw new Error(`Node "${node.name}" is not a component instance.`);
      const properties = parseVariants(target.value);
      if (!properties) throw new Error(`Invalid variants value: ${String(target.value)}`);
      node.setProperties(properties);
      return `Applied ${prop} on "${node.name}".`;
    }
    throw new Error(`Unsupported property "${prop}".`);
  }
  function toast(msg) {
    figma.notify(msg, { timeout: 1600 });
  }
  figma.showUI(ui_default, { width: 380, height: 500, title: "Hand Bridge" });
  var initReady = (async () => {
    for (const key of LEGACY_BINDING_KEYS) {
      await figma.clientStorage.setAsync(key, []);
    }
  })();
  initReady.catch((e) => {
    var _a2;
    console.error(e);
    toast(`Init error: ${(_a2 = e == null ? void 0 : e.message) != null ? _a2 : e}`);
  });
  figma.ui.onmessage = async (msg) => {
    var _a2;
    if (!msg || typeof msg !== "object") return;
    await initReady;
    if (msg.type === "request_version") {
      figma.ui.postMessage({ type: "plugin_version", version: PLUGIN_BUILD_VERSION });
      return;
    }
    if (msg.type === "dry_run_target") {
      const target = parseGestureTarget(msg.target);
      if (!target) {
        figma.ui.postMessage({ type: "dry_run_result", ok: false, message: "Invalid target payload." });
        return;
      }
      const resolved = await resolveNodeByPathDetailed(target.path);
      if (!resolved.ok) {
        figma.ui.postMessage({ type: "dry_run_result", ok: false, message: `Path error: ${resolved.reason}` });
        return;
      }
      try {
        const outcome = await applyTargetToNode(resolved.node, target);
        figma.viewport.scrollAndZoomIntoView([resolved.node]);
        figma.ui.postMessage({
          type: "dry_run_result",
          ok: true,
          message: `Preview applied: ${outcome}`
        });
      } catch (e) {
        figma.ui.postMessage({
          type: "dry_run_result",
          ok: false,
          message: `Dry run failed: ${e instanceof Error ? e.message : String(e)}`
        });
      }
      return;
    }
    if (msg.type === "gesture_match") {
      const name = (_a2 = msg.gesture) == null ? void 0 : _a2.name;
      if (typeof name !== "string" || !name.trim()) return;
      const target = parseGestureTarget(msg.target);
      if (!target) {
        toast(`Gesture "${name.trim()}" has no valid target.`);
        return;
      }
      const resolved = await resolveNodeByPathDetailed(target.path);
      if (!resolved.ok) {
        toast(`Path error: ${resolved.reason}`);
        return;
      }
      const node = resolved.node;
      try {
        const outcome = await applyTargetToNode(node, target);
        toast(outcome);
      } catch (e) {
        toast(`Apply failed: ${e instanceof Error ? e.message : String(e)}`);
      }
      return;
    }
  };
})();
