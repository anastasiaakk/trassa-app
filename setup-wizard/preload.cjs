const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("trassaSetup", {
  pickFolder: () => ipcRenderer.invoke("pick-folder"),
  install: (dest) => ipcRenderer.invoke("install", dest),
  defaultPath: () => ipcRenderer.invoke("default-path"),
  openFolder: (dir) => ipcRenderer.invoke("open-folder", dir),
  openExe: (exe) => ipcRenderer.invoke("open-exe", exe),
  quit: () => ipcRenderer.send("app-quit"),
});
