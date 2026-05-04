const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getWsBridgeStatus: () => ipcRenderer.invoke("ws-bridge-status"),
  getMediapipePaths: () => ipcRenderer.invoke("mediapipe-paths"),
  getAppBuildInfo: () => ipcRenderer.invoke("app-build-info"),
  requestCameraPermission: () => ipcRenderer.invoke("camera-permission"),
  openCameraPrivacySettings: () => ipcRenderer.invoke("open-camera-privacy-settings"),
  getCameraTroubleshootInfo: () => ipcRenderer.invoke("camera-troubleshoot-info"),
});
