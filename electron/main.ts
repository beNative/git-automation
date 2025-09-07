import { app, BrowserWindow, ipcMain, shell, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import type { AllData, GlobalSettings, Repository, Task, TaskStep, Commit, BranchInfo, LogEntry, DebugLogEntry } from '../types';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let logStream: fs.WriteStream | null = null;

const isDev = process.env.NODE_ENV !== 'production';

const SETTINGS_PATH = path.join(app.getPath('userData'), 'settings.json');

const DEFAULT_DATA: AllData = {
  globalSettings: {
    theme: 'dark',
    iconSet: 'heroicons',
    openLinksIn: 'default',
    notifications: true,
    simulationMode: false,
    allowPrerelease: false,
    debugLogging: true,
  },
  repositories: [],
  categories: [],
};

// --- Data Persistence ---
const loadData = (): AllData => {
  try {
    if (fs.existsSync(SETTINGS_PATH)) {
      const rawData = fs.readFileSync(SETTINGS_PATH, 'utf-8');
      const parsedData = JSON.parse(rawData);
      // Merge with defaults to ensure new settings are applied
      return {
        ...DEFAULT_DATA,
        ...parsedData,
        globalSettings: {
          ...DEFAULT_DATA.globalSettings,
          ...(parsedData.globalSettings || {}),
        }
      };
    }
  } catch (error) {
    console.error('Error loading settings.json, falling back to defaults:', error);
  }
  return DEFAULT_DATA;
};

const saveData = (data: Partial<AllData>) => {
  try {
    const currentData = loadData();
    const newData = { ...currentData, ...data };
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(newData, null, 2));
  } catch (error) {
    console.error('Error saving settings.json:', error);
  }
};


const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 940,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
    show: false, // Don't show until ready
  });
  
  // Maximize window
  mainWindow.maximize();
  mainWindow.show();

  if (isDev) {
    mainWindow.loadURL('http://localhost:8080');
    mainWindow.webContents.openDevTools();
  } else {
    // and load the index.html of the app.
    mainWindow.loadFile(path.join(__dirname, 'index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

app.on('ready', () => {
  // --- IPC Handlers ---
  ipcMain.handle('get-initial-data', () => loadData());
  ipcMain.handle('get-raw-settings-json', () => {
    const data = loadData();
    return JSON.stringify(data, null, 2);
  });
  ipcMain.handle('save-repositories', (event, repositories: Repository[]) => saveData({ repositories }));
  ipcMain.handle('save-settings', (event, settings: GlobalSettings) => saveData({ globalSettings: settings }));
  ipcMain.handle('save-all-data', (event, allData: AllData) => saveData(allData));
  
  ipcMain.handle('get-app-version', () => app.getVersion());
  ipcMain.handle('install-update', () => {
    // This is a placeholder. Real implementation would use electron-updater.
    console.log("Update installation triggered.");
    app.relaunch();
    app.quit();
  });
  
  // Mock file system and git operations
  ipcMain.handle('get-commit-history', async (event, repoPath, skip, search): Promise<Commit[]> => {
    console.log(`Faking git log for ${repoPath}`);
    return Array.from({ length: 50 }).map((_, i) => ({
      hash: `mockhash${skip + i}${search}`,
      shortHash: `mkh${skip + i}`,
      author: 'Mock User',
      date: new Date().toLocaleDateString(),
      message: `feat: Mock commit message ${skip + i}\n\nThis is a sample body for the commit. Search term: ${search || 'none'}`
    }));
  });
  
  ipcMain.handle('list-branches', async(event, repoPath): Promise<BranchInfo> => {
      return {
        local: ['main', 'develop', 'feature/new-thing'],
        remote: ['origin/main', 'origin/develop'],
        current: 'main'
      }
  });

  // Example of a real operation
  ipcMain.handle('open-local-path', (event, path) => {
    shell.openPath(path).catch(err => console.error(`Failed to open path: ${path}`, err));
  });

  ipcMain.handle('open-terminal', (event, folderPath) => {
    // This command is platform-specific
    const command = process.platform === 'win32' ? `start cmd /K "cd /d ${folderPath}"` : `open -a Terminal "${folderPath}"`;
    exec(command, (error) => {
      if (error) {
        console.error(`exec error: ${error}`);
      }
    });
  });

  ipcMain.handle('open-weblink', (event, url, browser) => {
    // 'browser' handling is a placeholder, shell.openExternal uses the system default.
    shell.openExternal(url);
  });
  
  ipcMain.handle('get-doc', (event, docName) => {
    const docPath = isDev 
      ? path.join(process.cwd(), 'dist', 'docs', docName)
      : path.join(__dirname, 'docs', docName);
    try {
        return fs.readFileSync(docPath, 'utf-8');
    } catch(e) {
        console.error(`Could not read doc: ${docName} from ${docPath}`, e);
        return `Could not load ${docName}.`;
    }
  });
  
  ipcMain.handle('check-local-path', async (event, path): Promise<'valid' | 'missing' | 'not_a_repo'> => {
      if (!fs.existsSync(path)) return 'missing';
      if (fs.existsSync(`${path}/.git`) || fs.existsSync(`${path}/.svn`)) return 'valid';
      return 'not_a_repo';
  });

  // Logging to file
  ipcMain.on('log-to-file-init', () => {
    const logPath = path.join(app.getPath('userData'), `debug-log-${new Date().toISOString().replace(/:/g, '-')}.log`);
    logStream = fs.createWriteStream(logPath, { flags: 'a' });
    logStream.write('--- Log Session Started ---\n');
  });

  ipcMain.on('log-to-file-write', (event, log: DebugLogEntry) => {
    if (logStream) {
      const logString = `[${log.timestamp}] [${log.level}] ${log.message}${log.data ? `\n${JSON.stringify(log.data, null, 2)}` : ''}\n`;
      logStream.write(logString);
    }
  });

  ipcMain.on('log-to-file-close', () => {
    if (logStream) {
      logStream.write('--- Log Session Ended ---\n');
      logStream.end();
      logStream = null;
    }
  });

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
