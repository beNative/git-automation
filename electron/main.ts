import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { platform } from 'os';
import { autoUpdater } from 'electron-updater';
import { spawn } from 'child_process';
import type { Repository, TaskStep, GlobalSettings } from '../types';
import { TaskStepType, LogLevel } from '../types';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
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

// --- IPC Handler for fetching documentation ---
ipcMain.handle('get-doc', async (event, docName: string) => {
  try {
    const isPackaged = app.isPackaged;
    // Define the base path to the 'docs' directory based on environment
    const docsBasePath = isPackaged
      // Fix: `process.resourcesPath` is an Electron-specific property not available in the default Node.js `process` type.
      ? path.join((process as any).resourcesPath, 'docs') // In production, it's in the resources folder
      : path.join(__dirname, 'docs');             // In dev, it's in the dist/docs folder
    
    const filePath = path.join(docsBasePath, docName);
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    console.error(`Failed to read doc: ${docName}`, error);
    return `# Error\n\nCould not load document: ${docName}.`;
  }
});

// --- IPC Handler for reading package.json scripts ---
ipcMain.handle('get-package-scripts', async (event, repoPath: string): Promise<string[]> => {
  if (!repoPath) return [];

  const packageJsonPath = path.join(repoPath, 'package.json');
  try {
    const fileContent = await fs.readFile(packageJsonPath, 'utf-8');
    const packageJson = JSON.parse(fileContent);
    if (packageJson && typeof packageJson.scripts === 'object') {
      return Object.keys(packageJson.scripts);
    }
    return [];
  } catch (error) {
    // Log the error but don't bother the user. This is an enhancement, not critical.
    console.warn(`Could not read or parse package.json at ${packageJsonPath}:`, error);
    return [];
  }
});

// --- IPC Handler for getting app version ---
ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});


// --- IPC Handler for running real task steps ---
ipcMain.on('run-task-step', (event, { repo, step, settings }: { repo: Repository; step: TaskStep; settings: GlobalSettings; }) => {
    const sendLog = (message: string, level: LogLevel) => {
        mainWindow?.webContents.send('task-log', { message, level });
    };
    const sendEnd = (exitCode: number) => {
        mainWindow?.webContents.send('task-step-end', exitCode);
    };

    let command: string;
    let args: string[];

    switch(step.type) {
        case TaskStepType.GitPull:
            command = 'git';
            args = ['pull'];
            break;
        case TaskStepType.InstallDeps:
            command = settings.defaultPackageManager;
            args = ['install'];
            break;
        case TaskStepType.RunCommand:
            if (!step.command) {
                sendLog('Skipping empty command.', LogLevel.Warn);
                sendEnd(0);
                return;
            }
            // Simple command parsing. This is not robust for complex shell syntax.
            const parts = step.command.split(' ');
            command = parts[0];
            args = parts.slice(1);
            break;
        default:
            sendLog(`Unknown step type: ${step.type}`, LogLevel.Error);
            sendEnd(1);
            return;
    }

    sendLog(`$ ${command} ${args.join(' ')}`, LogLevel.Command);
    
    const child = spawn(command, args, {
        cwd: repo.localPath,
        shell: true, // Use shell to handle path resolution etc.
    });

    child.stdout.on('data', (data) => {
        sendLog(data.toString(), LogLevel.Info);
    });

    child.stderr.on('data', (data) => {
        // Some tools (like npm) log progress to stderr, so we treat it as info for now.
        // A more robust solution would be to check exit code.
        sendLog(data.toString(), LogLevel.Info);
    });

    child.on('error', (err) => {
        sendLog(`Spawn error: ${err.message}`, LogLevel.Error);
    });

    child.on('close', (code) => {
        if (code !== 0) {
            sendLog(`Command exited with code ${code}`, LogLevel.Error);
        } else {
            sendLog('Step completed successfully.', LogLevel.Success);
        }
        sendEnd(code ?? 1);
    });
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