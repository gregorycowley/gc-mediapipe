# Hand Bridge Student Setup

Use this guide to install and run **Hand Bridge** with the Figma plugin.

## What You Need

- A computer with a webcam
- Figma desktop app (recommended) or Figma in browser
- Hand Bridge installer from your instructor (`.dmg` on macOS or `.exe` on Windows)
- Hand Bridge Figma plugin folder from your instructor (`handbridge-figma-plugin/`)
- The plugin folder should include `manifest.json`, `build/code.js`, and `ui.html`

## Part 1: Install and Open Hand Bridge

1. Install Hand Bridge using the installer from your instructor.
2. Open Hand Bridge.
3. Allow camera access when prompted.
4. In Hand Bridge, keep the WebSocket URL as:
   - `ws://localhost:8787`
5. Click **Connect** in the WebSocket section if it is not already connected.

## Part 2: Import the Figma Plugin (Development)

1. Open Figma.
2. Go to:
   - `Plugins` -> `Development` -> `Import plugin from manifest...`
3. Select:
   - `handbridge-figma-plugin/manifest.json`
4. Run the plugin:
   - `Plugins` -> `Development` -> `Hand Bridge`

## Part 3: Connect Plugin to Hand Bridge

1. In the plugin UI, confirm the Bridge URL is:
   - `ws://localhost:8787`
2. Click **Connect**.
3. You should see status change to connected in both the app and plugin.

## Part 4: Create and Use a Gesture

1. In Hand Bridge app, place your hand in view.
2. Click **Capture pose** and name the gesture.
3. Fill in gesture target fields:
   - **Figma layer path**: example `Page 1 / Frame A / Rectangle 1`
   - **Figma property**: pick one (like `color`, `opacity`, `textContent`, etc.)
   - **New value**: provide value format for that property (example `#FF0000` for color)
4. Perform the gesture again to send the event.
5. In Figma plugin, use **Preview apply** (dry-run section) to visually validate path/property/value if needed.

## Troubleshooting

### Camera does not work

- On macOS: System Settings -> Privacy & Security -> Camera -> enable Hand Bridge.
- Quit and reopen Hand Bridge after changing permission.

### Plugin does not show latest changes

- Stop and rerun the plugin in Figma.
- If needed, remove and re-import from `handbridge-figma-plugin/manifest.json`.

### Gesture detected, but Figma does not update

- Check that both app and plugin are connected to the same URL (`ws://localhost:8787`).
- Check target path spelling and hierarchy.
- Use plugin **Preview apply** to confirm path/property/value compatibility.

### Path errors

- Include full layer hierarchy with `/` separators.
- Start with page name for best reliability.
- Example: `Page 1 / Main Frame / Card / Title`

## Quick Checklist

- Hand Bridge open and camera allowed
- WebSocket connected in app
- Plugin imported from manifest and running
- WebSocket connected in plugin
- Gesture captured
- Target path/property/value configured
- Gesture performed to trigger update
