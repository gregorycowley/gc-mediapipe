# Hand Bridge Teacher Distribution Guide

Use this guide to package and share Hand Bridge with students.

## What to distribute

### A) Desktop app installers

From this repo root:

```bash
npm install
npm run dist
```

Share installer files from `dist/` with students.

### B) Figma plugin folder

Share `handbridge-figma-plugin/` with students. It should include at least:

- `manifest.json`
- built plugin JS (`build/code.js`)
- `ui.html`

Students import via:

- `Plugins` -> `Development` -> `Import plugin from manifest...`
- Select `handbridge-figma-plugin/manifest.json`

## Recommended student package structure

Share two separate items:

1. **Hand Bridge app installer**
2. **Figma plugin folder zip**

This keeps setup simple and avoids requiring Node/npm on student machines.

## Classroom checklist

- Students installed app and granted camera permission
- App WebSocket connected to `ws://localhost:8787`
- Plugin imported from manifest and running
- Plugin connected to `ws://localhost:8787`
- Gesture captured and target fields configured

## Troubleshooting shortcuts

- Plugin stale: stop and rerun plugin in Figma
- Path issues: use plugin Preview apply / dry-run tools
- Camera denied: re-enable camera permission in OS settings, then relaunch app
