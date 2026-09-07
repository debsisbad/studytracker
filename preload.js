// preload.js
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("studyIO", {
  // Mantém compatibilidade
  pickAndReadXlsx: () => ipcRenderer.invoke("pick-and-read-xlsx"),

  // XLSX ou DOCX -> rows + kind
  pickAndReadAny: () => ipcRenderer.invoke("pick-and-read-any"),

  // Salvar backup
  saveBackupXlsx: (bytesArray, filename) =>
    ipcRenderer.invoke("studyio:saveBackupXlsx", bytesArray, filename),

  // Versão do app (package.json version)
  getAppVersion: () => ipcRenderer.invoke("studyio:getAppVersion"),
});
