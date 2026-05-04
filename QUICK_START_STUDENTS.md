# Hand Bridge Quick Start (Students)

If you only need the fastest setup, follow this page.

## 1) Install and open Hand Bridge

1. Install the app package from your instructor.
2. Open **Hand Bridge**.
3. Allow camera access.
4. In WebSocket settings, use `ws://localhost:8787`.
5. Click **Connect**.

## 2) Import and run the Figma plugin

1. Open Figma.
2. Go to `Plugins` -> `Development` -> `Import plugin from manifest...`
3. Select `handbridge-figma-plugin/manifest.json`.
4. Run it from `Plugins` -> `Development` -> `Hand Bridge`.
5. In the plugin, keep `ws://localhost:8787` and click **Connect**.

## 3) Use a gesture

1. In Hand Bridge app, click **Capture pose** and name it.
2. Set:
   - **Figma layer path** (example: `Page 1 / Frame A / Rectangle 1`)
   - **Figma property**
   - **New value**
3. Perform the gesture again to trigger the update in Figma.

## Need more detail?

See `STUDENT_SETUP.md`.
