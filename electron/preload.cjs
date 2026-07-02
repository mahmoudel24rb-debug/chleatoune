// Pont sécurisé entre le jeu (renderer) et le disque (main process).
// Le jeu détecte `window.chleatouneApp` pour activer le mode bureau.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('chleatouneApp', {
  lireSauvegarde: () => ipcRenderer.sendSync('save:lire'),
  ecrireSauvegarde: (json) => ipcRenderer.send('save:ecrire', json),
  exporterVersFichier: (json) => ipcRenderer.invoke('save:exporter', json),
  importerDepuisFichier: () => ipcRenderer.invoke('save:importer'),
});
