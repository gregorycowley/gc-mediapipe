const { app, BrowserWindow, ipcMain, systemPreferences, shell } = require("electron");
const path = require("path");
const { pathToFileURL } = require("url");
const { execFile } = require("child_process");

function mediapipeRootDiskPath() {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, "app.asar.unpacked", "vendor", "mediapipe");
  }
  return path.join(__dirname, "..", "vendor", "mediapipe");
}

function mediapipePaths() {
  const root = mediapipeRootDiskPath();
  const wasmDir = path.join(root, "wasm");
  const modelFile = path.join(root, "models", "hand_landmarker.task");
  return {
    wasmBaseUrl: pathToFileURL(wasmDir).href + "/",
    modelUrl: pathToFileURL(modelFile).href,
  };
}

async function ensureCameraPermission() {
  if (process.platform !== "darwin") return true;
  const status = systemPreferences.getMediaAccessStatus("camera");
  if (status === "granted") return true;
  return systemPreferences.askForMediaAccess("camera");
}

/** Deep link to Camera privacy pane; falls back to opening System Settings. */
async function openMacCameraPrivacySettings() {
  const urls = [
    "x-apple.systempreferences:com.apple.preference.security?Privacy_Camera",
    "x-apple.systempreferences:com.apple.settings.extensions.PrivacySecurity.extension?Privacy_Camera",
  ];
  for (const u of urls) {
    try {
      await shell.openExternal(u);
      return;
    } catch {
      /* try next */
    }
  }
  execFile("/usr/bin/open", ["/System/Applications/System Settings.app"], () => {});
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1320,
    height: 880,
    minWidth: 960,
    minHeight: 640,
    title: "Hand Lab — MediaPipe",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      // Renderer sandbox breaks camera / mediaDevices on many macOS + Electron combos.
      sandbox: false,
    },
  });

  win.loadFile(path.join(__dirname, "..", "renderer", "index.html"));
}

app.whenReady().then(async () => {
  ipcMain.handle("mediapipe-paths", () => mediapipePaths());
  ipcMain.handle("camera-permission", () => ensureCameraPermission());
  ipcMain.handle("open-camera-privacy-settings", async () => {
    if (process.platform === "darwin") await openMacCameraPrivacySettings();
    return true;
  });
  ipcMain.handle("camera-troubleshoot-info", () => ({
    isPackaged: app.isPackaged,
    appName: app.getName(),
    platform: process.platform,
    /** macOS Privacy list shows this for `npm start` dev builds */
    privacyListNameDev: "Electron",
  }));

  await ensureCameraPermission();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
