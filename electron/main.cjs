// Processus principal Electron : ouvre le jeu dans une fenêtre native et
// gère la sauvegarde sur disque (automatique dans le dossier utilisateur,
// manuelle via des boîtes de dialogue).

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');

function fichierSauvegarde() {
  return path.join(app.getPath('userData'), 'sauvegarde.json');
}

// ---- lecture/écriture automatiques (dossier %APPDATA%/Chleatoune)
ipcMain.on('save:lire', (event) => {
  try {
    event.returnValue = fs.readFileSync(fichierSauvegarde(), 'utf-8');
  } catch {
    event.returnValue = null;
  }
});

ipcMain.on('save:ecrire', (_event, json) => {
  try {
    fs.mkdirSync(path.dirname(fichierSauvegarde()), { recursive: true });
    fs.writeFileSync(fichierSauvegarde(), json, 'utf-8');
  } catch (err) {
    console.error('Écriture de la sauvegarde impossible :', err);
  }
});

// ---- sauvegarde/chargement manuels (dialogues de fichiers)
ipcMain.handle('save:exporter', async (_event, json) => {
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Exporter la sauvegarde',
    defaultPath: 'chleatoune-sauvegarde.json',
    filters: [{ name: 'Sauvegarde JSON', extensions: ['json'] }],
  });
  if (canceled || !filePath) return false;
  fs.writeFileSync(filePath, json, 'utf-8');
  return true;
});

ipcMain.handle('save:importer', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Importer une sauvegarde',
    filters: [{ name: 'Sauvegarde JSON', extensions: ['json'] }],
    properties: ['openFile'],
  });
  if (canceled || !filePaths[0]) return null;
  return fs.readFileSync(filePaths[0], 'utf-8');
});

app.whenReady().then(() => {
  const fenetre = new BrowserWindow({
    width: 1400,
    height: 860,
    autoHideMenuBar: true,
    backgroundColor: '#0b0b0f',
    title: 'Chléatoune',
    icon: path.join(__dirname, '..', 'build', 'icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });
  fenetre.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

app.on('window-all-closed', () => app.quit());
