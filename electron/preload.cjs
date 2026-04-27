const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getMediapipePaths: () => ipcRenderer.invoke("mediapipe-paths"),
  requestCameraPermission: () => ipcRenderer.invoke("camera-permission"),
  openCameraPrivacySettings: () => ipcRenderer.invoke("open-camera-privacy-settings"),
  getCameraTroubleshootInfo: () => ipcRenderer.invoke("camera-troubleshoot-info"),
});
