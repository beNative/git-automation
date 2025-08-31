import { app, BrowserWindow, dialog } from 'electron';
import path from 'path';
import { platform } from 'os';
import { autoUpdater } from 'electron-updater';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'assets/icon.png'), // Optional: add an icon
  });

  // Load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  // Open the DevTools if not in production
  if (process.env.NODE_ENV !== 'production') {
    mainWindow.webContents.openDevTools();
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', () => {
  createWindow();
  
  // Check for updates once the app is ready
  autoUpdater.checkForUpdatesAndNotify();
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  // FIX: Use `platform()` from the 'os' module to correctly check the operating system.
  // This resolves a TypeScript error caused by incorrect type inference for the global `process` object.
  if (platform() !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// --- Auto-updater event listeners ---

autoUpdater.on('update-available', () => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Update Available',
    message: 'A new version is available. It will be downloaded in the background.',
  });
});

autoUpdater.on('update-downloaded', (info) => {
  dialog.showMessageBox({
    type: 'info',
    title: 'Update Ready',
    message: `A new version (${info.version}) has been downloaded. Restart the application to apply the updates.`,
    buttons: ['Restart Now', 'Later']
  }).then((buttonIndex) => {
    if (buttonIndex.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});

autoUpdater.on('error', (err) => {
  // This is a good place to log errors to a file
  console.error('Error in auto-updater. ' + err);
});
