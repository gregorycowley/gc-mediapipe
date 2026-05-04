# Hand Bridge

**Hand Bridge** is an Electron desktop app for experimenting with on-device hand tracking using [MediaPipe Hand Landmarker](https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker) (`@mediapipe/tasks-vision`). After a normal install, WASM, the JavaScript bundle, and the model file live under `vendor/mediapipe/`, so **runtime hand tracking does not need an internet connection**. The first `npm install` downloads the `.task` model once (see [Requirements](#requirements)).

## Start Here

- Students: `QUICK_START_STUDENTS.md`
- Full student setup: `STUDENT_SETUP.md`
- Teacher distribution workflow: `TEACHER_DISTRIBUTION.md`
- Figma plugin folder: `handbridge-figma-plugin/`

## Quick start

```bash
npm install
npm start
```

- Allow **camera** access when the system or browser layer prompts you.
- On macOS, packaged builds include a camera usage string in `package.json` (`build.mac.extendInfo.NSCameraUsageDescription`).

For the **built-in WebSocket hub** (Hand Bridge ↔ Figma), default URL and environment variables are documented in **[WEBSOCKET.md](WEBSOCKET.md)**.

### Camera access on macOS

- **`npm start` (development):** System Settings → Privacy & Security → **Camera** lists the app as **Electron** (`com.github.Electron`), not “Hand Bridge”. Turn the toggle **on** for Electron, then quit and run `npm start` again.
- **Packaged `Hand Bridge.app`:** Look for **Hand Bridge** in the same Camera list. Signed builds use `build/entitlements.mac.plist` so the hardened runtime is allowed to use the camera.
- The in-app **“Open Camera privacy settings”** button tries to open the right System Settings pane (macOS only).
- If permission was denied earlier and nothing appears in the list, reset the decision for development builds with  
  `tccutil reset Camera com.github.Electron`  
  (then reopen the app and accept the prompt). For a packaged app, use the bundle id from `package.json` → `build.appId` instead of `com.github.Electron`.

## Project layout

| Path | Purpose |
|------|---------|
| `electron/main.cjs` | Main process: window, macOS camera permission, WebSocket hub startup, IPC that exposes absolute `file://` URLs for WASM and the model |
| `electron/ws-bridge.cjs` | In-app WebSocket relay for Figma / LAN clients — see [WEBSOCKET.md](WEBSOCKET.md) |
| `electron/preload.cjs` | Preload: `getMediapipePaths`, `requestCameraPermission`, `getWsBridgeStatus` |
| `renderer/` | UI: webcam, canvas overlay, controls, short tips, landmark legend |
| `scripts/vendor-mediapipe.cjs` | Postinstall: copy WASM + `vision_bundle.mjs` from `node_modules`, download `hand_landmarker.task` if missing |
| `build/entitlements.mac.plist` | macOS hardened runtime: allows camera for signed `.app` builds (`electron-builder` merges with defaults) |
| `vendor/mediapipe/` | **Generated** (see `.gitignore`). Recreated by `postinstall`. |
| `handbridge-figma-plugin/` | Figma plugin project (manifest, UI, TS source, and `build/code.js`) |

## npm scripts

| Script | Description |
|--------|-------------|
| `npm install` | Installs dependencies and runs **`postinstall`**, which populates `vendor/mediapipe/` |
| `npm start` | Runs the app with Electron |
| `npm run dist` | Builds distributables via [electron-builder](https://www.electron.build/) (output under `dist/`) |

Packaged apps **unpack** the whole `vendor/` tree (`asarUnpack: ["vendor/**"]`) so MediaPipe can load WASM and the model from real disk paths (`app.asar.unpacked` in production). The main process resolves those paths in `electron/main.cjs` (`mediapipeRootDiskPath`).

## Features (student UI)

- Live camera with optional **mirror** (selfie-style).
- Draw **skeleton**, **landmark dots**, and optional **index labels**.
- Detect **one or two** hands; adjust **min detection** and **min presence** confidence.
- Tries **GPU** delegate first, then falls back to **CPU** if GPU setup fails.
- Simple **“try this”** ideas and a **0–20 landmark** reference list.

## Requirements

- **Node.js** and **npm** for development and for building installers.
- **Network on first install only**: `scripts/vendor-mediapipe.cjs` downloads the hand landmarker model from Google Cloud Storage (`hand_landmarker.task`). After `vendor/mediapipe/` exists, day-to-day `npm start` is offline-friendly.
- A **webcam** and OS permission to use it.

## Packaging notes

- Default product name in builds: **Hand Bridge** (`package.json` → `build.productName`).
- macOS category is set to education; adjust `build` in `package.json` for icons, notarization, or extra targets (Windows NSIS, Linux, etc.) as needed.

## Licenses

- This project’s `package.json` declares **ISC** for the app scaffold (you may change `license` / add an `LICENSE` file to match your intent).
- **MediaPipe** (`@mediapipe/tasks-vision`) is **Apache-2.0**. See the package in `node_modules` or [npm](https://www.npmjs.com/package/@mediapipe/tasks-vision) for the full license text.
