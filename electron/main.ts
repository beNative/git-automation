import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { autoUpdater, type UpdateDownloadedEvent } from 'electron-updater';
import path, { dirname } from 'path';
import fs from 'fs/promises';
import os, { platform } from 'os';
import { spawn, exec, execFile } from 'child_process';
import type { ChildProcess } from 'child_process';
import type { Repository, Task, TaskStep, TaskVariable, GlobalSettings, ProjectSuggestion, LocalPathState, DetailedStatus, VcsFileStatus, Commit, BranchInfo, DebugLogEntry, VcsType, PythonCapabilities, ProjectInfo, DelphiCapabilities, DelphiProject, NodejsCapabilities, LazarusCapabilities, LazarusProject, Category, AppDataContextState, ReleaseInfo, DockerCapabilities, CommitDiffFile, GoCapabilities, RustCapabilities, MavenCapabilities, DotnetCapabilities } from '../types';
import { TaskStepType, LogLevel, VcsType as VcsTypeEnum } from '../types';
import fsSync from 'fs';
import JSZip from 'jszip';
import { createDefaultKeyboardShortcutSettings, mergeKeyboardShortcutSettings } from '../keyboardShortcuts';
import {
  detectArchFromFileName,
  determineDownloadedUpdateArch,
  extractCandidateNamesFromUpdateInfo,
  filterNamesByArch,
  getFileNameFromUrlLike,
  normalizeNameForComparison,
  type FileValidationResult,
  type UpdaterArch,
} from './autoUpdateHelpers';


declare const require: (id: string) => any;
declare const __dirname: string;
declare class Buffer {
    toString(encoding?: string): string;
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// --- App Data Path Configuration ---
// User data is stored in the standard OS-specific location, which is persistent across updates.
const userDataPath = app.getPath('userData');

// --- One-time Migration for Pre-0.2.2 Settings ---
const migrateSettingsIfNeeded = async () => {
  // This is for users updating from v0.2.1 or older, where settings.json was stored next to the executable.
  if (!app.isPackaged) return; // Migration only needed for packaged apps.

  const oldSettingsPath = path.join(path.dirname(app.getPath('exe')), 'settings.json');
  const newSettingsPath = path.join(userDataPath, 'settings.json');

  try {
    // If the new settings file already exists, migration is complete or not needed.
    await fs.access(newSettingsPath);
    return;
  } catch (e) {
    // New file doesn't exist, proceed to check for the old one.
  }

  try {
    // Check if the old settings file exists.
    await fs.access(oldSettingsPath);
    
    // If it exists, copy it to the new location.
    await fs.mkdir(userDataPath, { recursive: true });
    await fs.copyFile(oldSettingsPath, newSettingsPath);
    console.log(`[Migration] Successfully migrated settings from ${oldSettingsPath} to ${newSettingsPath}`);
  } catch (e) {
    // This is expected for new installations where the old file doesn't exist.
    // console.log('[Migration] No old settings file found to migrate.');
  }
};


let mainWindow: BrowserWindow | null = null;
let logStream: fsSync.WriteStream | null = null;
const taskLogStreams = new Map<string, fsSync.WriteStream>();
const runningProcesses = new Map<string, ChildProcess>();
const cancelledExecutions = new Set<string>();

type DownloadedUpdateValidation = {
  version: string;
  filePath: string | null;
  expectedFileName?: string;
  validated: boolean;
  error?: string;
};

let lastDownloadedUpdateValidation: DownloadedUpdateValidation | null = null;

// --- Main Process Logger ---
type LogLevelString = 'debug' | 'info' | 'warn' | 'error';
const mainLogger = {
  log: (level: LogLevelString, message: string, data?: any) => {
    // 1. Send to renderer for the debug panel UI
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('log-to-renderer', { level, message, data });
    }
    // 2. Write to debug log file if active
    if (logStream) {
      const dataStr = data ? `\n\tData: ${JSON.stringify(data, null, 2).replace(/\n/g, '\n\t')}` : '';
      logStream.write(`[${new Date().toISOString()}][${level.toUpperCase()}] ${message}${dataStr}\n`);
    }
  },
  debug: (message: string, data?: any) => { mainLogger.log('debug', message, data) },
  info: (message: string, data?: any) => { mainLogger.log('info', message, data) },
  warn: (message: string, data?: any) => { mainLogger.log('warn', message, data) },
  error: (message: string, data?: any) => { mainLogger.log('error', message, data) },
};

const getLogFilePath = () => {
  const now = new Date();
  const timestamp = now.toISOString().replace(/:/g, '-').replace(/\..+/, '');
  const logDir = path.join(userDataPath, 'logs');
  return path.join(logDir, `git-automation-dashboard-log-${timestamp}.log`);
};

const settingsPath = path.join(userDataPath, 'settings.json');
let globalSettingsCache: GlobalSettings | null = null;

const DEFAULTS: GlobalSettings = {
    defaultBuildCommand: 'npm run build',
    notifications: true,
    simulationMode: true,
    theme: 'dark',
    iconSet: 'heroicons',
    debugLogging: true,
    allowPrerelease: true,
    autoUpdateChecksEnabled: true,
    autoCheckForUpdates: false,
    autoCheckIntervalSeconds: 300,
    autoInstallUpdates: 'manual',
    openLinksIn: 'default',
    githubPat: '',
    gitExecutablePath: '',
    svnExecutablePath: '',
    zoomFactor: 1,
    saveTaskLogs: true,
    taskLogPath: '',
    keyboardShortcuts: createDefaultKeyboardShortcutSettings(),
};

async function readSettings(): Promise<GlobalSettings> {
    if (globalSettingsCache) {
        return globalSettingsCache;
    }
    try {
        const data = await fs.readFile(settingsPath, 'utf-8');
        const parsedData = JSON.parse(data);
        if (parsedData && parsedData.globalSettings) {
            const settings = { ...DEFAULTS, ...parsedData.globalSettings };
            settings.keyboardShortcuts = mergeKeyboardShortcutSettings(parsedData.globalSettings.keyboardShortcuts ?? settings.keyboardShortcuts);
            globalSettingsCache = settings;
            return settings;
        }
    } catch (error) {
        // File not found or invalid, return defaults.
    }
    const defaults = { ...DEFAULTS, keyboardShortcuts: createDefaultKeyboardShortcutSettings() };
    globalSettingsCache = defaults;
    return defaults;
}

const UPDATE_REPO_OWNER = 'beNative';
const UPDATE_REPO_NAME = 'git-automation';
const GITHUB_API_BASE = `https://api.github.com/repos/${UPDATE_REPO_OWNER}/${UPDATE_REPO_NAME}`;
const releaseAssetNameCache = new Map<string, string[]>();

const buildGitHubApiHeaders = async (): Promise<Record<string, string>> => {
  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'GitAutomationDashboard-Updater',
  };
  try {
    const settings = await readSettings();
    if (settings.githubPat) {
      headers['Authorization'] = `token ${settings.githubPat}`;
      mainLogger.debug('[AutoUpdate] Prepared GitHub headers with authentication token.');
    }
  } catch (error) {
    mainLogger.warn('[AutoUpdate] Unable to read settings while preparing GitHub headers.', error);
  }
  return headers;
};

const fetchJsonFromGitHub = async (url: string, headers: Record<string, string>): Promise<any | null> => {
  const startedAt = Date.now();
  try {
    const response = await fetch(url, { headers });
    const durationMs = Date.now() - startedAt;
    if (response.status === 404) {
      mainLogger.info('[AutoUpdate] GitHub resource not found.', { url, durationMs });
      return null;
    }
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`GitHub API error ${response.status}: ${body}`);
    }
    const payload = await response.json();
    mainLogger.debug('[AutoUpdate] GitHub request completed.', {
      url,
      durationMs,
      remainingRateLimit: response.headers.get('x-ratelimit-remaining'),
    });
    return payload;
  } catch (error: any) {
    mainLogger.warn('[AutoUpdate] Failed to fetch GitHub data.', {
      url,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? { message: error.message, stack: error.stack } : { message: String(error) },
    });
    return null;
  }
};

const fetchReleaseByTag = async (tag: string, headers: Record<string, string>) => {
  const url = `${GITHUB_API_BASE}/releases/tags/${encodeURIComponent(tag)}`;
  return await fetchJsonFromGitHub(url, headers);
};

const filterAssetNamesByExtension = (assets: any[], extension: string): string[] => {
  if (!Array.isArray(assets)) {
    return [];
  }
  const normalizedExt = extension.toLowerCase();
  return assets
    .map(asset => typeof asset?.name === 'string' ? asset.name.trim() : '')
    .filter((name): name is string => Boolean(name) && (normalizedExt ? path.extname(name).toLowerCase() === normalizedExt : true));
};

const fetchOfficialReleaseAssetNames = async (version: string, extension: string): Promise<string[]> => {
  const cacheKey = `${version}|${extension}`;
  const cached = releaseAssetNameCache.get(cacheKey);
  if (cached) {
    mainLogger.debug('[AutoUpdate] Using cached official release asset names.', {
      version,
      extension,
      names: cached,
    });
    return cached;
  }

  mainLogger.debug('[AutoUpdate] Fetching official release asset names from GitHub.', {
    version,
    extension,
  });

  const headers = await buildGitHubApiHeaders();
  const candidateTags = new Set<string>();
  candidateTags.add(version);
  candidateTags.add(version.startsWith('v') ? version.replace(/^v/, '') : `v${version}`);

  for (const tag of candidateTags) {
    const release = await fetchReleaseByTag(tag, headers);
    if (release?.assets) {
      const names = filterAssetNamesByExtension(release.assets, extension);
      mainLogger.debug('[AutoUpdate] Found release assets for tag.', {
        tag,
        extension,
        names,
      });
      releaseAssetNameCache.set(cacheKey, names);
      if (names.length > 0) {
        return names;
      }
    }
  }

  const releasesList = await fetchJsonFromGitHub(`${GITHUB_API_BASE}/releases?per_page=30`, headers);
  if (Array.isArray(releasesList)) {
    for (const release of releasesList) {
      if (typeof release?.tag_name === 'string' && candidateTags.has(release.tag_name)) {
        const names = filterAssetNamesByExtension(release.assets, extension);
        mainLogger.debug('[AutoUpdate] Matched release from recent releases listing.', {
          tag: release.tag_name,
          extension,
          names,
        });
        releaseAssetNameCache.set(cacheKey, names);
        return names;
      }
    }
  }

  mainLogger.warn('[AutoUpdate] Unable to determine official release asset names from GitHub listing.', {
    version,
    extension,
  });
  releaseAssetNameCache.set(cacheKey, []);
  return [];
};

const safeRenameDownloadedUpdate = async (currentPath: string, desiredPath: string): Promise<void> => {
  if (currentPath === desiredPath) {
    return;
  }
  try {
    await fs.unlink(desiredPath);
  } catch (error: any) {
    if (error?.code !== 'ENOENT') {
      throw error;
    }
  }
  await fs.rename(currentPath, desiredPath);
  mainLogger.info('[AutoUpdate] Renamed downloaded update to align with official filename.', {
    from: path.basename(currentPath),
    to: path.basename(desiredPath),
    directory: path.dirname(desiredPath),
  });
};

const updateCachedDownloadedUpdateMetadata = async (expectedFileName: string, directory: string): Promise<void> => {
  const updateInfoPath = path.join(directory, 'update-info.json');
  try {
    const raw = await fs.readFile(updateInfoPath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      parsed.fileName = expectedFileName;
      await fs.writeFile(updateInfoPath, JSON.stringify(parsed, null, 2));
      mainLogger.debug('[AutoUpdate] Updated cached update metadata with expected filename.', {
        updateInfoPath,
        expectedFileName,
      });
    }
  } catch (error: any) {
    if (error?.code !== 'ENOENT') {
      mainLogger.warn('[AutoUpdate] Unable to update cached update metadata with corrected filename.', error instanceof Error ? error : { message: String(error) });
    }
  }
};

const ensureDownloadedFileMatchesOfficialRelease = async (info: UpdateDownloadedEvent): Promise<FileValidationResult> => {
  if (!info.downloadedFile) {
    return { success: false, error: 'Auto-updater did not provide a downloaded file path.', downloadedName: '', officialNames: [] };
  }

  const downloadedPath = info.downloadedFile;
  const downloadedName = path.basename(downloadedPath);
  const downloadedExt = path.extname(downloadedName).toLowerCase();

  mainLogger.info('[AutoUpdate] Validating downloaded update filename.', {
    version: info.version,
    downloadedPath,
    downloadedName,
    downloadedExt,
  });

  let officialNames: string[] = [];
  try {
    officialNames = await fetchOfficialReleaseAssetNames(info.version, downloadedExt);
  } catch (error: any) {
    mainLogger.warn('[AutoUpdate] Failed to retrieve official release filenames from GitHub.', error instanceof Error ? error : { message: String(error) });
  }

  if (officialNames.length > 0) {
    mainLogger.debug('[AutoUpdate] Official release filenames retrieved from GitHub.', {
      version: info.version,
      extension: downloadedExt,
      officialNames,
    });
  }

  if (officialNames.length === 0) {
    officialNames = extractCandidateNamesFromUpdateInfo(info, downloadedExt);
    mainLogger.debug('[AutoUpdate] Candidate filenames extracted from update metadata.', {
      version: info.version,
      extension: downloadedExt,
      candidates: officialNames,
    });
  }

  if (officialNames.length === 0) {
    mainLogger.error('[AutoUpdate] No official filenames available for validation.', {
      version: info.version,
      downloadedName,
      extension: downloadedExt,
    });
    return { success: false, error: 'No official release filenames available for comparison.', downloadedName, officialNames: [] };
  }

  const { arch: inferredArch, sources: archSources } = determineDownloadedUpdateArch(info, downloadedName);
  const candidateNames = filterNamesByArch(officialNames, inferredArch);
  mainLogger.debug('[AutoUpdate] Candidate filenames considered for validation.', {
    inferredArch,
    candidateNames,
    available: officialNames,
  });
  if (inferredArch) {
    mainLogger.info('[AutoUpdate] Inferred update architecture.', {
      version: info.version,
      inferredArch,
      evidence: archSources,
      candidateCount: candidateNames.length,
    });
  } else {
    mainLogger.info('[AutoUpdate] Unable to infer update architecture from metadata.', {
      version: info.version,
      availableCandidates: officialNames.length,
    });
  }

  if (candidateNames.includes(downloadedName)) {
    mainLogger.info('[AutoUpdate] Downloaded filename already matches official release asset.', {
      downloadedName,
    });
    return { success: true, filePath: downloadedPath, expectedName: downloadedName, officialNames: candidateNames };
  }

  const caseInsensitiveMatch = candidateNames.find(name => name.toLowerCase() === downloadedName.toLowerCase());
  if (caseInsensitiveMatch) {
    mainLogger.info('[AutoUpdate] Downloaded filename matches an official asset ignoring case.', {
      downloadedName,
      expectedName: caseInsensitiveMatch,
    });
    return { success: true, filePath: downloadedPath, expectedName: caseInsensitiveMatch, officialNames: candidateNames };
  }

  const normalizedDownloaded = normalizeNameForComparison(downloadedName);
  const normalizedMatch = candidateNames.find(name => normalizeNameForComparison(name) === normalizedDownloaded);
  if (normalizedMatch) {
    mainLogger.info('[AutoUpdate] Downloaded filename matches official asset after normalization.', {
      downloadedName,
      expectedName: normalizedMatch,
    });
    return { success: true, filePath: downloadedPath, expectedName: normalizedMatch, officialNames: candidateNames };
  }

  const expectedName = candidateNames[0];
  const expectedPath = path.join(path.dirname(downloadedPath), expectedName);
  try {
    await safeRenameDownloadedUpdate(downloadedPath, expectedPath);
    await updateCachedDownloadedUpdateMetadata(expectedName, path.dirname(expectedPath));
    const helper = (autoUpdater as any)?.downloadedUpdateHelper;
    if (helper && typeof helper === 'object') {
      helper._file = expectedPath;
      if (helper._downloadedFileInfo) {
        helper._downloadedFileInfo.fileName = expectedName;
      }
    }
    mainLogger.info('[AutoUpdate] Downloaded update renamed to expected filename.', {
      previousName: downloadedName,
      expectedName,
      helperAdjusted: Boolean(helper),
      normalizedAttempted: Boolean(normalizedMatch),
    });
    return { success: true, filePath: expectedPath, expectedName, renamed: true, officialNames: candidateNames };
  } catch (error: any) {
    mainLogger.error('[AutoUpdate] Failed to align downloaded filename with official asset.', {
      version: info.version,
      downloadedName,
      expectedName,
      error: error instanceof Error ? { message: error.message, stack: error.stack } : { message: String(error) },
    });
    return { success: false, error: error?.message || String(error), downloadedName, officialNames: candidateNames };
  }
};

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
    frame: false,
    titleBarStyle: 'hidden',
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'assets/icon.ico'),
  });

  // Load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  
  // Add listeners to notify renderer of maximize status
  mainWindow.on('maximize', () => {
    mainWindow?.webContents.send('window-maximized-status', true);
  });
  mainWindow.on('unmaximize', () => {
    mainWindow?.webContents.send('window-maximized-status', false);
  });


  // Open the DevTools if not in production
  if (process.env.NODE_ENV !== 'production') {
    mainWindow.webContents.openDevTools();
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', async () => {
  // Run migration before anything else that might access settings.
  await migrateSettingsIfNeeded();
  
  // Ensure logs directory exists before creating a window or log file
  const logDir = path.join(userDataPath, 'logs');
  fs.mkdir(logDir, { recursive: true }).catch(err => {
      mainLogger.error("Could not create logs directory.", err);
  });
  createWindow();
  
  const settings = await readSettings();

  // --- Auto-updater logic ---
  if (app.isPackaged) {
    const allowPrerelease = settings.allowPrerelease ?? true;
    mainLogger.info('[AutoUpdate] Configuring auto-updater.', {
      allowPrerelease,
    });
    autoUpdater.allowPrerelease = allowPrerelease;
    autoUpdater.autoInstallOnAppQuit = false;
    autoUpdater.autoDownload = true;
    autoUpdater.disableDifferentialDownload = true;
    autoUpdater.logger = {
      info: (message?: any, ...details: any[]) => mainLogger.info('[ElectronUpdater] ' + String(message ?? ''), details.length ? { details } : undefined),
      warn: (message?: any, ...details: any[]) => mainLogger.warn('[ElectronUpdater] ' + String(message ?? ''), details.length ? { details } : undefined),
      error: (message?: any, ...details: any[]) => mainLogger.error('[ElectronUpdater] ' + String(message ?? ''), details.length ? { details } : undefined),
      debug: (message?: any, ...details: any[]) => mainLogger.debug('[ElectronUpdater] ' + String(message ?? ''), details.length ? { details } : undefined),
    } as any;
    mainLogger.info('[AutoUpdate] Auto-updater flags configured.', {
      autoInstallOnAppQuit: autoUpdater.autoInstallOnAppQuit,
      autoDownload: autoUpdater.autoDownload,
      disableDifferentialDownload: autoUpdater.disableDifferentialDownload,
    });

    autoUpdater.on('checking-for-update', () => {
        mainLogger.info('[AutoUpdate] Checking for update.');
        mainWindow?.webContents.send('update-status-change', { status: 'checking', message: 'Checking for updates...' });
    });
    autoUpdater.on('update-available', (info) => {
        lastDownloadedUpdateValidation = null;
        mainLogger.info('[AutoUpdate] Update available.', {
            version: info.version,
            files: Array.isArray(info.files) ? info.files.map(file => ({
                url: typeof file?.url === 'string' ? getFileNameFromUrlLike(file.url) : undefined,
                sha512: (file as any)?.sha512,
                size: (file as any)?.size,
              })) : undefined,
        });
        mainWindow?.webContents.send('update-status-change', { status: 'available', message: `Update v${info.version} available. Downloading...`, version: info.version });
    });
    autoUpdater.on('update-not-available', (info) => {
        mainLogger.info('[AutoUpdate] No update available.', {
            version: info?.version,
            downloadedFile: (info as any)?.downloadedFile,
        });
    });
    autoUpdater.on('error', (err) => {
        lastDownloadedUpdateValidation = null;
        mainLogger.error('[AutoUpdate] Error from auto-updater.', {
            message: err?.message,
            stack: err?.stack,
            name: err?.name,
            code: (err as any)?.code,
            details: (err as any)?.body || (err as any)?.data,
        });
        mainWindow?.webContents.send('update-status-change', { status: 'error', message: `Error in auto-updater: ${err.message}` });
    });
    autoUpdater.on('download-progress', (progressObj) => {
        mainLogger.debug('[AutoUpdate] Download progress update.', {
          percent: Number.isFinite(progressObj.percent) ? Number(progressObj.percent.toFixed(2)) : progressObj.percent,
          transferred: (progressObj as any)?.transferred,
          total: (progressObj as any)?.total,
          bytesPerSecond: (progressObj as any)?.bytesPerSecond,
        });
    });
    autoUpdater.on('update-downloaded', (info) => {
        mainLogger.info('[AutoUpdate] Update downloaded event received. Validating filename.', {
            version: info.version,
            downloadedFile: info.downloadedFile,
            files: Array.isArray(info.files) ? info.files.map(file => ({
              url: typeof file?.url === 'string' ? getFileNameFromUrlLike(file.url) : undefined,
              sha512: (file as any)?.sha512,
              size: (file as any)?.size,
            })) : undefined,
        });
        void (async () => {
            try {
                const validationResult = await ensureDownloadedFileMatchesOfficialRelease(info);
                if (!validationResult.success) {
                    lastDownloadedUpdateValidation = { version: info.version, filePath: info.downloadedFile ?? null, validated: false, error: validationResult.error };
                    mainLogger.error('Downloaded update failed filename validation.', {
                        version: info.version,
                        downloadedName: validationResult.downloadedName,
                        officialNames: validationResult.officialNames,
                        error: validationResult.error,
                    });
                    mainWindow?.webContents.send('update-status-change', { status: 'error', message: `Downloaded update failed validation: ${validationResult.error}` });
                    return;
                }

                if (validationResult.filePath !== info.downloadedFile) {
                    info.downloadedFile = validationResult.filePath;
                }

                lastDownloadedUpdateValidation = {
                    version: info.version,
                    filePath: validationResult.filePath,
                    expectedFileName: validationResult.expectedName,
                    validated: true,
                };

                mainLogger.info('[AutoUpdate] Update validated and ready to install.', {
                    version: info.version,
                    filePath: validationResult.filePath,
                    alignedWithOfficialName: validationResult.renamed === true,
                });

                const messageSuffix = validationResult.renamed ? ' and aligned with official filename' : '';
                mainWindow?.webContents.send('update-status-change', {
                    status: 'downloaded',
                    message: `Update v${info.version} downloaded${messageSuffix}. Restart to install.`,
                    version: info.version,
                });
            } catch (error: any) {
                const message = error?.message || String(error);
                lastDownloadedUpdateValidation = { version: info.version, filePath: info.downloadedFile ?? null, validated: false, error: message };
                mainLogger.error('Error while validating downloaded update file.', error);
                mainWindow?.webContents.send('update-status-change', { status: 'error', message: `Failed to validate downloaded update: ${message}` });
            }
        })();
    });

    // Check for updates
    if (!settings.autoUpdateChecksEnabled) {
      mainLogger.info('[AutoUpdate] Automatic update checks are disabled. Skipping initial check.');
    } else {
      mainLogger.info('[AutoUpdate] Triggering checkForUpdatesAndNotify.');
      autoUpdater.checkForUpdatesAndNotify()
        .then(result => {
          if (!result) {
            mainLogger.info('[AutoUpdate] checkForUpdatesAndNotify completed without update info.');
            return;
          }
          mainLogger.info('[AutoUpdate] checkForUpdatesAndNotify resolved.', {
            updateInfo: result.updateInfo ? {
              version: result.updateInfo.version,
              files: Array.isArray(result.updateInfo.files) ? result.updateInfo.files.map(file => ({
                url: typeof file?.url === 'string' ? getFileNameFromUrlLike(file.url) : undefined,
                sha512: (file as any)?.sha512,
                size: (file as any)?.size,
              })) : undefined,
            } : undefined,
            downloadPromise: Boolean(result.downloadPromise),
          });
        })
        .catch(error => {
          mainLogger.error('[AutoUpdate] checkForUpdatesAndNotify rejected.', {
            message: error?.message,
            stack: error?.stack,
            name: error?.name,
          });
          mainWindow?.webContents.send('update-status-change', { status: 'error', message: `Failed to check for updates: ${error?.message || error}` });
        });
    }
  } else {
    mainLogger.info('[AutoUpdate] App is not packaged; skipping auto-updater.');
  }
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (logStream) {
    logStream.write(`--- Log session ended by app quit at ${new Date().toISOString()} ---\n`);
    logStream.end();
    logStream = null;
  }
  taskLogStreams.forEach(stream => stream.end());
  taskLogStreams.clear();
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

// --- IPC handlers for window controls ---
ipcMain.on('window-close', () => {
  mainWindow?.close();
});
ipcMain.on('window-minimize', () => {
  mainWindow?.minimize();
});
ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});


// --- IPC Handler for fetching app version ---
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

// --- IPC handler to trigger restart & update ---
ipcMain.on('restart-and-install-update', () => {
  if (!lastDownloadedUpdateValidation?.validated) {
    const errorMessage = lastDownloadedUpdateValidation?.error || 'Update filename validation has not completed successfully.';
    mainLogger.error('Preventing installation because the downloaded update failed filename validation.', {
      version: lastDownloadedUpdateValidation?.version,
      error: errorMessage,
    });
    mainWindow?.webContents.send('update-status-change', { status: 'error', message: `Cannot install update: ${errorMessage}` });
    return;
  }

  mainLogger.info('Proceeding with quitAndInstall after successful filename validation.', {
    version: lastDownloadedUpdateValidation.version,
    filePath: lastDownloadedUpdateValidation.filePath,
    expectedFileName: lastDownloadedUpdateValidation.expectedFileName,
  });
  autoUpdater.quitAndInstall();
});


// --- IPC Handlers for Settings ---
ipcMain.handle('get-all-data', async (): Promise<AppDataContextState> => {
  try {
    const data = await fs.readFile(settingsPath, 'utf-8');
    const parsedData = JSON.parse(data);

    // --- Migration for uncategorizedOrder ---
    if (!parsedData.uncategorizedOrder) {
      mainLogger.info('[Migration] uncategorizedOrder not found. Computing it now.');
      const allRepoIds = new Set((parsedData.repositories || []).map((r: Repository) => r.id));
      const categorizedRepoIds = new Set((parsedData.categories || []).flatMap((c: Category) => c.repositoryIds));
      const uncategorizedIds = [...allRepoIds].filter(id => !categorizedRepoIds.has(id));
      parsedData.uncategorizedOrder = uncategorizedIds;
    }
    // --- End Migration ---

    // Ensure githubPat exists
    if (parsedData.globalSettings && typeof parsedData.globalSettings.githubPat === 'undefined') {
      parsedData.globalSettings.githubPat = '';
    }

    return parsedData;
  } catch (error: any) {
    // If file doesn't exist or is invalid, return empty structure
    if (error.code === 'ENOENT') {
      return { globalSettings: DEFAULTS, repositories: [], categories: [], uncategorizedOrder: [] };
    }
    mainLogger.error("Failed to read settings file:", error);
    return { globalSettings: DEFAULTS, repositories: [], categories: [], uncategorizedOrder: [] };
  }
});

ipcMain.on('save-all-data', async (event, data: AppDataContextState) => {
    try {
        await fs.mkdir(userDataPath, { recursive: true });
        await fs.writeFile(settingsPath, JSON.stringify(data, null, 2));
        const previousSettings = globalSettingsCache;
        globalSettingsCache = data.globalSettings; // Invalidate cache

        if (
          app.isPackaged &&
          data.globalSettings?.autoUpdateChecksEnabled &&
          !(previousSettings?.autoUpdateChecksEnabled)
        ) {
          mainLogger.info('[AutoUpdate] Automatic update checks were re-enabled from settings. Triggering immediate check.');
          autoUpdater.checkForUpdatesAndNotify().catch(error => {
            mainLogger.error('[AutoUpdate] Failed to trigger update check after re-enabling setting.', {
              message: error?.message,
              stack: error?.stack,
            });
            mainWindow?.webContents.send('update-status-change', { status: 'error', message: `Failed to check for updates: ${error?.message || error}` });
          });
        }
    } catch (error) {
        mainLogger.error("Failed to save settings file:", error);
    }
});

ipcMain.handle('get-raw-settings-json', async () => {
  try {
    const data = await fs.readFile(settingsPath, 'utf-8');
    return data;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // If file doesn't exist, return a prettified empty structure.
      return JSON.stringify({ globalSettings: DEFAULTS, repositories: [], categories: [], uncategorizedOrder: [] }, null, 2);
    }
    mainLogger.error("Failed to read settings file:", error);
    throw error; // Let the renderer handle the error
  }
});

ipcMain.handle('show-settings-file', () => {
  shell.showItemInFolder(settingsPath);
});

// --- IPC handler for securely getting PAT ---
ipcMain.handle('get-github-pat', async () => {
  const settings = await readSettings();
  return settings.githubPat;
});


// --- IPC Handler for fetching documentation ---
ipcMain.handle('get-doc', async (event, docName: string) => {
  try {
    const isPackaged = app.isPackaged;
    // Define the base path to the 'docs' directory based on environment
    const docsBasePath = isPackaged
      ? path.join((process as any).resourcesPath, 'docs') // In production, it's in the resources folder
      : path.join(__dirname, 'docs');             // In dev, it's in the dist/docs folder
    
    const filePath = path.join(docsBasePath, docName);
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    mainLogger.error(`Failed to read doc: ${docName}`, error);
    return `# Error\n\nCould not load document: ${docName}.`;
  }
});

// --- Helper function for recursive file search ---
const findFilesByMatcherRecursive = async (
  dir: string,
  matcher: (entry: fsSync.Dirent) => boolean,
  repoRoot: string,
  depth = 0,
  maxDepth = 3 // Limit search depth
): Promise<string[]> => {
  let results: string[] = [];
  try {
    if (depth > maxDepth) return [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== '.svn' && !entry.name.startsWith('.')) {
          results = results.concat(await findFilesByMatcherRecursive(fullPath, matcher, repoRoot, depth + 1, maxDepth));
        }
      } else if (matcher(entry)) {
        results.push(path.relative(repoRoot, fullPath).replace(/\\/g, '/')); // Normalize paths
      }
    }
  } catch (err) {
    // Ignore errors for directories that can't be read
  }
  return results;
};

const findFilesByExtensionRecursive = async (
  dir: string,
  ext: string,
  repoRoot: string,
  depth = 0,
  maxDepth = 3 // Limit search depth to avoid performance issues
): Promise<string[]> => {
  return findFilesByMatcherRecursive(dir, (entry) => entry.name.toLowerCase().endsWith(ext), repoRoot, depth, maxDepth);
};

// --- Helper function for finding files by patterns like "jest.config" ---
const findFileByPattern = async (
    dir: string,
    patterns: string[],
    repoRoot: string,
    depth = 0,
    maxDepth = 2
): Promise<string[]> => {
    return findFilesByMatcherRecursive(dir, (entry) => patterns.some(p => entry.name.startsWith(p)), repoRoot, depth, maxDepth);
};


// --- Helper for checking file existence ---
const fileExists = async (basePath: string, ...fileParts: string[]) => {
    try {
        await fs.access(path.join(basePath, ...fileParts));
        return true;
    } catch {
        return false;
    }
};

// --- Simple TOML parsing helpers ---
const getTomlValue = (content: string, key: string): string | null => {
    const regex = new RegExp(`^\\s*${key}\\s*=\\s*["']([^"']+)["']`, 'm');
    const match = content.match(regex);
    return match ? match[1] : null;
};
const getTomlSection = (content: string, sectionName: string): string | null => {
    const regex = new RegExp(`\\[${sectionName.replace('.', '\\.')}\\]([\\s\\S]*?)(?=\\n\\[|$)`);
    const match = content.match(regex);
    return match ? match[1] : null;
};

// --- Simple XML parsing helper ---
const getXmlAttribute = (content: string, elementName: string, attributeName: string): string[] => {
    const results: string[] = [];
    const regex = new RegExp(`<${elementName}[^>]*?${attributeName}="([^"]*)"`, 'g');
    let match;
    while ((match = regex.exec(content)) !== null) {
        results.push(match[1]);
    }
    return results;
}

const getXmlTagValues = (content: string, tagName: string): string[] => {
    const results: string[] = [];
    const regex = new RegExp(`<${tagName}>([\\s\\S]*?)<\/${tagName}>`, 'gi');
    let match;
    while ((match = regex.exec(content)) !== null) {
        results.push(match[1].trim());
    }
    return results;
};

const getFirstXmlTagValue = (content: string, tagName: string, beforeIndex?: number): string | null => {
    const regex = new RegExp(`<${tagName}>([\\s\\S]*?)<\/${tagName}>`, 'gi');
    let match;
    while ((match = regex.exec(content)) !== null) {
        if (beforeIndex === undefined || match.index < beforeIndex) {
            return match[1].trim();
        }
    }
    return null;
};

const getProjectInfo = async (repoPath: string): Promise<ProjectInfo> => {
    if (!repoPath) return { tags: [], files: { dproj: [], goMod: [], goWork: [], cargoToml: [], pomXml: [], csproj: [], sln: [] } };

    const tagsSet = new Set<string>();
    const info: ProjectInfo = {
        tags: [],
        files: { dproj: [], goMod: [], goWork: [], cargoToml: [], pomXml: [], csproj: [], sln: [] },
    };

    try {
        // VCS Type
        if (await fileExists(repoPath, '.git')) tagsSet.add('git');
        if (await fileExists(repoPath, '.svn')) tagsSet.add('svn');

        // --- Docker Detection ---
        const dockerfiles = await findFilesByMatcherRecursive(repoPath, (e) => e.isFile() && e.name.toLowerCase().includes('dockerfile'), repoPath);
        const composeFiles = await findFilesByMatcherRecursive(repoPath, (e) => e.isFile() && e.name.toLowerCase().startsWith('docker-compose') && (e.name.endsWith('.yml') || e.name.endsWith('.yaml')), repoPath);

        if (dockerfiles.length > 0 || composeFiles.length > 0) {
            tagsSet.add('docker');
            info.docker = {
                dockerfiles,
                composeFiles,
            };
        }

        // --- Lazarus/FPC Project Detection ---
        let isLazarusProject = false;
        const lazarusCaps: LazarusCapabilities = {
            projects: [],
            packages: [],
            make: { hasMakefileFpc: false, hasFpmake: false },
            tests: { hasFpcUnit: false },
        };
        lazarusCaps.packages = await findFilesByExtensionRecursive(repoPath, '.lpk', repoPath);
        lazarusCaps.make.hasMakefileFpc = await fileExists(repoPath, 'Makefile.fpc');
        lazarusCaps.make.hasFpmake = await fileExists(repoPath, 'fpmake.pp');
        const lpiFiles = await findFilesByExtensionRecursive(repoPath, '.lpi', repoPath);

        if (lpiFiles.length > 0 || lazarusCaps.packages.length > 0 || lazarusCaps.make.hasFpmake || lazarusCaps.make.hasMakefileFpc) {
            isLazarusProject = true;
        }

        for (const lpi of lpiFiles) {
            try {
                const content = await fs.readFile(path.join(repoPath, lpi), 'utf-8');
                const project: LazarusProject = {
                    path: lpi,
                    modes: getXmlAttribute(content, 'Mode', 'Name'),
                    cpus: [...new Set(getXmlAttribute(content, 'TargetCPU', 'Value'))],
                    oses: [...new Set(getXmlAttribute(content, 'TargetOS', 'Value'))],
                    widgetsets: [...new Set(getXmlAttribute(content, 'WidgetSet', 'Name'))],
                };
                if (content.toLowerCase().includes('fpcunit')) {
                    lazarusCaps.tests.hasFpcUnit = true;
                }
                lazarusCaps.projects.push(project);
            } catch (e) { mainLogger.error(`Could not parse Lazarus project: ${lpi}`, e); }
        }
        
        if (isLazarusProject) {
            tagsSet.add('lazarus');
            info.lazarus = lazarusCaps;
        }
        
        // --- Delphi Project Detection ---
        let isDelphiProject = false;
        const delphiCaps: DelphiCapabilities = {
            projects: [],
            groups: [],
            packaging: { innoSetup: [], nsis: [] },
            hasDUnitX: false,
            packageManagers: { boss: false },
        };

        const dprojFiles = await findFilesByExtensionRecursive(repoPath, '.dproj', repoPath);
        info.files.dproj = dprojFiles;
        delphiCaps.groups = await findFilesByExtensionRecursive(repoPath, '.groupproj', repoPath);

        if (dprojFiles.length > 0 || delphiCaps.groups.length > 0) {
            isDelphiProject = true;
        }

        for (const dproj of dprojFiles) {
            try {
                const content = await fs.readFile(path.join(repoPath, dproj), 'utf-8');
                const project: DelphiProject = {
                    path: dproj,
                    platforms: [],
                    configs: [],
                    hasDeployment: /<DeployManager>/.test(content),
                    hasVersionInfo: /<VersionInfo/.test(content),
                };
                
                const platformsMatch = content.match(/<Platforms.*?>([\s\S]*?)<\/Platforms>/);
                if (platformsMatch) {
                    const platformRegex = /<Platform value="([^"]+)">/g;
                    let match;
                    while ((match = platformRegex.exec(platformsMatch[1])) !== null) {
                        project.platforms.push(match[1]);
                    }
                }

                const configsMatch = content.match(/<Configurations>([\s\S]*?)<\/Configurations>/);
                if (configsMatch) {
                    const configRegex = /<Config value="([^"]+)">/g;
                    let match;
                    while ((match = configRegex.exec(configsMatch[1])) !== null) {
                        project.configs.push(match[1]);
                    }
                }
                
                if (dproj.toLowerCase().includes('test')) {
                    delphiCaps.hasDUnitX = true;
                }

                delphiCaps.projects.push(project);
            } catch (e) { mainLogger.error(`Could not parse Delphi project: ${dproj}`, e); }
        }

        delphiCaps.packaging.innoSetup = await findFilesByExtensionRecursive(repoPath, '.iss', repoPath);
        delphiCaps.packaging.nsis = await findFilesByExtensionRecursive(repoPath, '.nsi', repoPath);
        delphiCaps.packageManagers.boss = await fileExists(repoPath, 'boss.json');
        
        if (isDelphiProject) {
            tagsSet.add('delphi');
            info.delphi = delphiCaps;
        }


        // --- Go Project Detection ---
        const goModFiles = await findFilesByMatcherRecursive(repoPath, (entry) => entry.isFile() && entry.name === 'go.mod', repoPath);
        const goWorkFiles = await findFilesByMatcherRecursive(repoPath, (entry) => entry.isFile() && entry.name === 'go.work', repoPath);
        const goTestFiles = await findFilesByMatcherRecursive(repoPath, (entry) => entry.isFile() && entry.name.endsWith('_test.go'), repoPath);

        if (goModFiles.length > 0 || goWorkFiles.length > 0) {
            tagsSet.add('go');
            info.files.goMod = goModFiles;
            info.files.goWork = goWorkFiles;
            const modules: GoCapabilities['modules'] = [];
            let hasGoSum = false;

            for (const goMod of goModFiles) {
                try {
                    const fullPath = path.join(repoPath, goMod);
                    const content = await fs.readFile(fullPath, 'utf-8');
                    const moduleMatch = content.match(/^module\s+([^\s]+)$/m);
                    const goVersionMatch = content.match(/^go\s+([^\s]+)$/m);
                    const toolchainMatch = content.match(/^toolchain\s+([^\s]+)$/m);
                    const modDir = path.dirname(fullPath);
                    if (await fileExists(modDir, 'go.sum')) hasGoSum = true;
                    modules.push({
                        path: goMod,
                        module: moduleMatch ? moduleMatch[1] : null,
                        goVersion: goVersionMatch ? goVersionMatch[1] : null,
                        toolchain: toolchainMatch ? toolchainMatch[1] : null,
                    });
                } catch (e) { mainLogger.error(`Could not parse go.mod: ${goMod}`, e); }
            }

            info.go = {
                modules,
                hasGoWork: goWorkFiles.length > 0,
                hasGoSum,
                hasTests: goTestFiles.length > 0,
            };
        }

        // --- Rust Project Detection ---
        const cargoTomlFiles = await findFilesByMatcherRecursive(repoPath, (entry) => entry.isFile() && entry.name === 'Cargo.toml', repoPath);
        if (cargoTomlFiles.length > 0) {
            tagsSet.add('rust');
            info.files.cargoToml = cargoTomlFiles;
            const packages: RustCapabilities['packages'] = [];
            let hasLockfile = false;
            let hasWorkspace = false;
            const workspaceMembers = new Set<string>();

            for (const cargoFile of cargoTomlFiles) {
                try {
                    const fullPath = path.join(repoPath, cargoFile);
                    const content = await fs.readFile(fullPath, 'utf-8');
                    const packageSection = getTomlSection(content, 'package');
                    const workspaceSection = getTomlSection(content, 'workspace');
                    const lockPath = path.join(path.dirname(fullPath), 'Cargo.lock');
                    try {
                        await fs.access(lockPath);
                        hasLockfile = true;
                    } catch { /* ignore */ }

                    const isWorkspace = Boolean(workspaceSection);
                    if (isWorkspace) {
                        hasWorkspace = true;
                        const membersMatch = workspaceSection?.match(/members\s*=\s*\[([^\]]*)\]/);
                        if (membersMatch) {
                            membersMatch[1].split(',').map(m => m.replace(/["']/g, '').trim()).filter(Boolean).forEach(m => workspaceMembers.add(m));
                        }
                    }

                    packages.push({
                        path: cargoFile,
                        name: packageSection ? getTomlValue(packageSection, 'name') : null,
                        edition: packageSection ? getTomlValue(packageSection, 'edition') : null,
                        rustVersion: packageSection ? getTomlValue(packageSection, 'rust-version') : null,
                        isWorkspace,
                    });
                } catch (e) { mainLogger.error(`Could not parse Cargo.toml: ${cargoFile}`, e); }
            }

            const rustTestFiles = await findFilesByMatcherRecursive(repoPath, (entry) => entry.isFile() && entry.name.endsWith('_test.rs'), repoPath);

            info.rust = {
                packages,
                hasLockfile,
                hasWorkspace,
                workspaceMembers: Array.from(workspaceMembers),
                hasTests: rustTestFiles.length > 0,
            };
        }

        // --- Java/Maven Project Detection ---
        const pomFiles = await findFilesByMatcherRecursive(repoPath, (entry) => entry.isFile() && entry.name.toLowerCase() === 'pom.xml', repoPath);
        if (pomFiles.length > 0) {
            tagsSet.add('java');
            tagsSet.add('maven');
            info.files.pomXml = pomFiles;
            const projects: MavenCapabilities['projects'] = [];

            for (const pomFile of pomFiles) {
                try {
                    const fullPath = path.join(repoPath, pomFile);
                    const content = await fs.readFile(fullPath, 'utf-8');
                    const dependenciesIndex = content.indexOf('<dependencies>');
                    const beforeIndex = dependenciesIndex === -1 ? undefined : dependenciesIndex;
                    const groupId = getFirstXmlTagValue(content, 'groupId', beforeIndex);
                    const artifactId = getFirstXmlTagValue(content, 'artifactId', beforeIndex);
                    const packaging = getFirstXmlTagValue(content, 'packaging', beforeIndex);
                    const javaVersion = getFirstXmlTagValue(content, 'maven.compiler.source') || getFirstXmlTagValue(content, 'java.version');
                    projects.push({
                        path: pomFile,
                        groupId,
                        artifactId,
                        packaging,
                        javaVersion,
                    });
                } catch (e) { mainLogger.error(`Could not parse pom.xml: ${pomFile}`, e); }
            }

            const hasWrapper = await fileExists(repoPath, 'mvnw') || await fileExists(repoPath, 'mvnw.cmd');

            info.maven = {
                projects,
                hasWrapper,
            };
        }

        // --- .NET Project Detection ---
        const csprojFiles = await findFilesByExtensionRecursive(repoPath, '.csproj', repoPath);
        const slnFiles = await findFilesByExtensionRecursive(repoPath, '.sln', repoPath);
        if (csprojFiles.length > 0 || slnFiles.length > 0) {
            tagsSet.add('dotnet');
            info.files.csproj = csprojFiles;
            info.files.sln = slnFiles;
            const projects: DotnetCapabilities['projects'] = [];

            for (const csproj of csprojFiles) {
                try {
                    const fullPath = path.join(repoPath, csproj);
                    const content = await fs.readFile(fullPath, 'utf-8');
                    const targetFrameworks = new Set<string>();
                    getXmlTagValues(content, 'TargetFramework').forEach(v => v.split(';').map(x => x.trim()).filter(Boolean).forEach(x => targetFrameworks.add(x)));
                    getXmlTagValues(content, 'TargetFrameworks').forEach(v => v.split(';').map(x => x.trim()).filter(Boolean).forEach(x => targetFrameworks.add(x)));
                    const outputType = getFirstXmlTagValue(content, 'OutputType');
                    const sdkMatch = content.match(/<Project[^>]*Sdk="([^"]+)"/i);
                    projects.push({
                        path: csproj,
                        targetFrameworks: Array.from(targetFrameworks),
                        outputType: outputType ?? null,
                        sdk: sdkMatch ? sdkMatch[1] : null,
                    });
                } catch (e) { mainLogger.error(`Could not parse csproj: ${csproj}`, e); }
            }

            info.dotnet = {
                projects,
                hasSolution: slnFiles.length > 0,
            };
        }


        // --- Python Project Detection ---
        let isPythonProject = false;
        const pyCapabilities: PythonCapabilities = {
            requestedPythonVersion: null,
            envManager: 'unknown',
            buildBackend: 'unknown',
            testFramework: 'unknown',
            linters: [],
            formatters: [],
            typeCheckers: [],
            hasPrecommit: false,
        };
        
        let pyprojectTomlContent: string | null = null;
        if (await fileExists(repoPath, 'pyproject.toml')) {
            isPythonProject = true;
            pyprojectTomlContent = await fs.readFile(path.join(repoPath, 'pyproject.toml'), 'utf-8');
        }

        // Detect Env Manager
        if (await fileExists(repoPath, 'poetry.lock') && pyprojectTomlContent?.includes('[tool.poetry]')) {
            pyCapabilities.envManager = 'poetry'; isPythonProject = true;
        } else if (await fileExists(repoPath, 'pdm.lock') && pyprojectTomlContent?.includes('[tool.pdm]')) {
            pyCapabilities.envManager = 'pdm'; isPythonProject = true;
        } else if (await fileExists(repoPath, 'Pipfile.lock')) {
            pyCapabilities.envManager = 'pipenv'; isPythonProject = true;
        } else if (await fileExists(repoPath, 'environment.yml')) {
            pyCapabilities.envManager = 'conda'; isPythonProject = true;
        } else if (await fileExists(repoPath, 'requirements.txt')) {
            pyCapabilities.envManager = 'pip'; isPythonProject = true;
        }
        
        if (await fileExists(repoPath, '.python-version')) {
             pyCapabilities.requestedPythonVersion = (await fs.readFile(path.join(repoPath, '.python-version'), 'utf-8')).trim();
        }

        if (pyprojectTomlContent) {
            // Detect build backend
            const buildSystemSection = getTomlSection(pyprojectTomlContent, 'build-system');
            if (buildSystemSection) {
                const backend = getTomlValue(buildSystemSection, 'build-backend');
                if (backend?.includes('setuptools')) pyCapabilities.buildBackend = 'setuptools';
                else if (backend?.includes('hatchling')) pyCapabilities.buildBackend = 'hatch';
                else if (backend?.includes('poetry.core.masonry.api')) pyCapabilities.buildBackend = 'poetry';
                else if (backend?.includes('flit_core.buildapi')) pyCapabilities.buildBackend = 'flit';
                else if (backend?.includes('pdm.backend')) pyCapabilities.buildBackend = 'pdm';
                else if (backend?.includes('mesonpy')) pyCapabilities.buildBackend = 'mesonpy';
            } else {
                if (pyCapabilities.envManager === 'poetry') pyCapabilities.buildBackend = 'poetry';
                if (pyCapabilities.envManager === 'pdm') pyCapabilities.buildBackend = 'pdm';
            }
            
            // Detect tools from pyproject.toml
            if (getTomlSection(pyprojectTomlContent, 'tool.ruff')) pyCapabilities.linters.push('ruff');
            if (getTomlSection(pyprojectTomlContent, 'tool.black')) pyCapabilities.formatters.push('black');
            if (getTomlSection(pyprojectTomlContent, 'tool.isort')) pyCapabilities.formatters.push('isort');
            if (getTomlSection(pyprojectTomlContent, 'tool.mypy')) pyCapabilities.typeCheckers.push('mypy');
            if (getTomlSection(pyprojectTomlContent, 'tool.pytest.ini_options')) pyCapabilities.testFramework = 'pytest';
        }

        // Detect tools from standalone files
        if (await fileExists(repoPath, 'pytest.ini') && pyCapabilities.testFramework === 'unknown') pyCapabilities.testFramework = 'pytest';
        if (await fileExists(repoPath, 'tox.ini') && pyCapabilities.testFramework === 'unknown') pyCapabilities.testFramework = 'tox';
        if (await fileExists(repoPath, 'noxfile.py') && pyCapabilities.testFramework === 'unknown') pyCapabilities.testFramework = 'nox';
        if (await fileExists(repoPath, '.pre-commit-config.yaml')) pyCapabilities.hasPrecommit = true;
        if (await fileExists(repoPath, 'pylintrc')) pyCapabilities.linters.push('pylint');

        if (isPythonProject) {
            tagsSet.add('python');
            info.python = pyCapabilities;
        }

        // --- Node.js Project Detection ---
        let isNodeProject = false;
        const nodejsCaps: NodejsCapabilities = {
            engine: null,
            declaredManager: null,
            packageManagers: { pnpm: false, yarn: false, npm: false, bun: false },
            typescript: false,
            testFrameworks: [],
            linters: [],
            bundlers: [],
            monorepo: { workspaces: false, turbo: false, nx: false, yarnBerryPnp: false },
        };

        if (await fileExists(repoPath, 'package.json')) {
            isNodeProject = true;
            try {
                const pkgContent = await fs.readFile(path.join(repoPath, 'package.json'), 'utf-8');
                const pkg = JSON.parse(pkgContent);
                if (pkg.engines?.node) nodejsCaps.engine = pkg.engines.node;
                if (pkg.packageManager) nodejsCaps.declaredManager = pkg.packageManager;
                if (pkg.workspaces) nodejsCaps.monorepo.workspaces = true;
            } catch (e) { mainLogger.error('Could not parse package.json', e); }
        }

        // Check lockfiles
        if (await fileExists(repoPath, 'pnpm-lock.yaml')) { nodejsCaps.packageManagers.pnpm = true; isNodeProject = true; }
        if (await fileExists(repoPath, 'yarn.lock')) { nodejsCaps.packageManagers.yarn = true; isNodeProject = true; }
        if (await fileExists(repoPath, 'package-lock.json')) { nodejsCaps.packageManagers.npm = true; isNodeProject = true; }
        if (await fileExists(repoPath, 'bun.lockb')) { nodejsCaps.packageManagers.bun = true; isNodeProject = true; }

        // Check tooling configs
        if (await fileExists(repoPath, 'tsconfig.json')) nodejsCaps.typescript = true;
        if ((await findFileByPattern(repoPath, ['eslint.config.', '.eslintrc'], repoPath)).length > 0) nodejsCaps.linters.push('eslint');
        if ((await findFileByPattern(repoPath, ['.prettierrc'], repoPath)).length > 0) nodejsCaps.linters.push('prettier');

        // Test frameworks
        if ((await findFileByPattern(repoPath, ['jest.config.'], repoPath)).length > 0) nodejsCaps.testFrameworks.push('jest');
        if ((await findFileByPattern(repoPath, ['vitest.config.'], repoPath)).length > 0) nodejsCaps.testFrameworks.push('vitest');
        if ((await findFileByPattern(repoPath, ['playwright.config.'], repoPath)).length > 0) nodejsCaps.testFrameworks.push('playwright');
        if ((await findFileByPattern(repoPath, ['cypress.config.'], repoPath)).length > 0) nodejsCaps.testFrameworks.push('cypress');

        // Bundlers
        if ((await findFileByPattern(repoPath, ['vite.config.'], repoPath)).length > 0) nodejsCaps.bundlers.push('vite');
        if ((await findFileByPattern(repoPath, ['webpack.config.'], repoPath)).length > 0) nodejsCaps.bundlers.push('webpack');
        if ((await findFileByPattern(repoPath, ['rollup.config.'], repoPath)).length > 0) nodejsCaps.bundlers.push('rollup');
        if ((await findFileByPattern(repoPath, ['tsup.config.'], repoPath)).length > 0) nodejsCaps.bundlers.push('tsup');
        if (await fileExists(repoPath, '.swcrc')) nodejsCaps.bundlers.push('swc');

        // Monorepo managers
        if (await fileExists(repoPath, 'turbo.json')) nodejsCaps.monorepo.turbo = true;
        if (await fileExists(repoPath, 'nx.json')) nodejsCaps.monorepo.nx = true;
        if (await fileExists(repoPath, '.pnp.cjs')) nodejsCaps.monorepo.yarnBerryPnp = true;
        
        if (isNodeProject) {
            tagsSet.add('nodejs');
            info.nodejs = nodejsCaps;
        }

    } catch (error) {
        mainLogger.error(`Error getting project info for ${repoPath}:`, error);
    }
    
    info.tags = Array.from(tagsSet);
    return info;
};

// --- IPC handler for intelligent project analysis ---
ipcMain.handle('get-project-info', async (event, repoPath: string): Promise<ProjectInfo> => {
    return getProjectInfo(repoPath);
});


// --- IPC Handler for project configuration suggestions ---
ipcMain.handle('get-project-suggestions', async (event, { repoPath, repoName }: { repoPath: string; repoName: string }): Promise<ProjectSuggestion[]> => {
  if (!repoPath) return [];

  const suggestions: ProjectSuggestion[] = [];
  const addSuggestion = (suggestion: Omit<ProjectSuggestion, 'group'>, group: string) => {
    suggestions.push({ ...suggestion, group });
  };
  
  // 1. Delphi (MSBuild) - PRIORITIZED
  try {
      const dprojFiles = await findFilesByExtensionRecursive(repoPath, '.dproj', repoPath);
      // Suggest for the first found project file
      if (dprojFiles.length > 0) {
        const dprojFile = dprojFiles[0];
        addSuggestion({ label: 'Build Delphi project (Release)', value: `msbuild "${dprojFile}" /t:Build /p:Configuration=Release` }, 'Detected Delphi/MSBuild');
        addSuggestion({ label: 'Clean Delphi project (Release)', value: `msbuild "${dprojFile}" /t:Clean /p:Configuration=Release` }, 'Detected Delphi/MSBuild');
        addSuggestion({ label: 'Build Delphi project (Debug)', value: `msbuild "${dprojFile}" /t:Build /p:Configuration=Debug` }, 'Detected Delphi/MSBuild');
      }
  } catch(e) { /* ignore */ }


  // 2. package.json scripts
  if (await fileExists(repoPath, 'package.json')) {
      try {
        const pkg = JSON.parse(await fs.readFile(path.join(repoPath, 'package.json'), 'utf-8'));
        addSuggestion({ label: 'npm install', value: 'npm install'}, 'Detected NPM Scripts');
        addSuggestion({ label: 'yarn install', value: 'yarn install'}, 'Detected Yarn Scripts');

        if (pkg && pkg.scripts && typeof pkg.scripts === 'object') {
          for (const scriptName of Object.keys(pkg.scripts)) {
            addSuggestion({ label: `npm run ${scriptName}`, value: `npm run ${scriptName}` }, 'Detected NPM Scripts');
            addSuggestion({ label: `yarn ${scriptName}`, value: `yarn ${scriptName}` }, 'Detected Yarn Scripts');
          }
        }
      } catch (e) { /* ignore */ }
  }

  // ... (Other suggestions remain unchanged)
  
  return suggestions;
});

// --- Promise-based command executor ---
const execAsync = (command: string, options: { cwd: string }): Promise<{ stdout: string, stderr: string }> => {
  return new Promise((resolve, reject) => {
    exec(command, options, (error, stdout, stderr) => {
      if (error) {
        // For git log, even if there's an error (e.g. empty repo), we might get stderr but no actual error object.
        // We reject only on a true error object.
        return reject(error);
      }
      resolve({ stdout, stderr });
    });
  });
};

const execFileAsync = (file: string, args: string[], options: { cwd: string }): Promise<{ stdout: string, stderr: string }> => {
    return new Promise((resolve, reject) => {
        execFile(file, args, options, (error, stdout, stderr) => {
            if (error) {
                return reject(error);
            }
            resolve({ stdout, stderr });
        });
    });
};

// --- Helper for resolving executable paths ---
const getExecutableCommand = (vcsType: VcsType, settings: GlobalSettings, quoted = true): string => {
    let path: string | undefined;
    if (vcsType === VcsTypeEnum.Git) {
        path = settings.gitExecutablePath;
    } else if (vcsType === VcsTypeEnum.Svn) {
        path = settings.svnExecutablePath;
    }

    if (path) {
        return quoted ? `"${path}"` : path;
    }
    return vcsType; // Fallback to 'git' or 'svn'
};


const parseSvnStatusOutput = (stdout: string): { untrackedFiles: string[]; changedFiles: string[] } => {
    const untrackedFiles: string[] = [];
    const changedFiles: string[] = [];
    const statusLineRegex = /^[ACDIMRX?!~LKO\*><!PSTB\+ ]{1,7}/;

    stdout.split(/\r?\n/).forEach(rawLine => {
        if (!rawLine.trim()) {
            return;
        }

        if (/^(Performing status on external item|Status against revision)/i.test(rawLine)) {
            return;
        }

        const statusPrefix = rawLine.slice(0, 7);
        if (!statusLineRegex.test(statusPrefix)) {
            return;
        }

        const filePath = rawLine.slice(7).trim();
        if (!filePath) {
            return;
        }

        const compactStatus = statusPrefix.replace(/\s+/g, '');
        const primaryStatus = compactStatus[0] ?? ' ';
        const propertyStatusDirty = statusPrefix[1] && statusPrefix[1] !== ' ';

        if (primaryStatus === '?') {
            untrackedFiles.push(filePath);
            return;
        }

        if (primaryStatus && primaryStatus !== 'X') {
            changedFiles.push(filePath);
            return;
        }

        if (propertyStatusDirty) {
            changedFiles.push(filePath);
        }
    });

    return { untrackedFiles, changedFiles };
};

// --- IPC handler for checking git/svn status ---
ipcMain.handle('check-vcs-status', async (event, repo: Repository): Promise<{ isDirty: boolean; output: string; untrackedFiles: string[]; changedFiles: string[] }> => {
    const settings = await readSettings();
    const command = repo.vcs === VcsTypeEnum.Git
      ? `${getExecutableCommand(repo.vcs, settings)} status --porcelain`
      : `${getExecutableCommand(repo.vcs, settings)} status`;

    if (repo.vcs === VcsTypeEnum.Svn) {
        return new Promise((resolve) => {
            exec(command, { cwd: repo.localPath }, (error, stdout, stderr) => {
                if (error) {
                    resolve({ isDirty: false, output: stderr, untrackedFiles: [], changedFiles: [] });
                    return;
                }

                const output = stdout.trim();
                const { untrackedFiles, changedFiles } = parseSvnStatusOutput(stdout);
                const isDirty = untrackedFiles.length > 0 || changedFiles.length > 0;
                resolve({ isDirty, output, untrackedFiles, changedFiles });
            });
        });
    }

    // Git-specific logic
    return new Promise((resolve) => {
        exec(command, { cwd: repo.localPath }, (error, stdout, stderr) => {
            if (error) {
                resolve({ isDirty: false, output: stderr, untrackedFiles: [], changedFiles: [] });
                return;
            }
            const output = stdout.trim();
            const isDirty = output.length > 0;
            const untrackedFiles: string[] = [];
            const changedFiles: string[] = [];
            if (isDirty) {
                output.split('\n').forEach(line => {
                    const trimmedLine = line.trim();
                    if (trimmedLine.startsWith('?? ')) {
                        untrackedFiles.push(trimmedLine.substring(3));
                    } else if (trimmedLine) {
                        changedFiles.push(trimmedLine);
                    }
                });
            }
            resolve({ isDirty, output, untrackedFiles, changedFiles });
        });
    });
});

// --- IPC handler for adding files to .gitignore, committing, and pushing ---
ipcMain.handle('ignore-files-and-push', async (event, { repo, filesToIgnore }: { repo: Repository, filesToIgnore: string[] }): Promise<{ success: boolean; error?: string }> => {
    if (repo.vcs !== VcsTypeEnum.Git) {
        return { success: false, error: 'This feature is only available for Git repositories.' };
    }
    try {
        const settings = await readSettings();
        const gitCmd = getExecutableCommand(VcsTypeEnum.Git, settings);
        const gitignorePath = path.join(repo.localPath, '.gitignore');
        
        // Ensure .gitignore exists
        try {
            await fs.access(gitignorePath);
        } catch {
            await fs.writeFile(gitignorePath, '', 'utf-8');
        }

        const contentToAppend = '\n# Added by Git Automation Dashboard\n' + filesToIgnore.join('\n') + '\n';
        await fs.appendFile(gitignorePath, contentToAppend, 'utf-8');
        
        await execAsync(`${gitCmd} add .gitignore`, { cwd: repo.localPath });
        await execAsync(`${gitCmd} commit -m "chore: Update .gitignore"`, { cwd: repo.localPath });
        await execAsync(`${gitCmd} push`, { cwd: repo.localPath });
        
        return { success: true };
    } catch (e: any) {
        mainLogger.error('Failed to ignore files and push:', e);
        return { success: false, error: e.stderr || e.message || 'An unknown error occurred.' };
    }
});


// --- IPC handler for checking local path ---
ipcMain.handle('check-local-path', async (event, localPath: string): Promise<LocalPathState> => {
    if (!localPath || localPath.trim() === '') {
        return 'missing';
    }
    try {
        await fs.access(localPath);
        // Path exists, now check if it's a repo
        try {
            const gitStat = await fs.stat(path.join(localPath, '.git'));
            if (gitStat.isDirectory()) return 'valid';
        } catch (e) { /* not a git repo, check svn */ }
        
        try {
            const svnStat = await fs.stat(path.join(localPath, '.svn'));
            if (svnStat.isDirectory()) return 'valid';
        } catch (e) { /* not an svn repo */ }

        return 'not_a_repo';
    } catch (error) {
        return 'missing';
    }
});

// --- IPC handler for discovering remote URL ---
ipcMain.handle('discover-remote-url', async (event, { localPath, vcs }: { localPath: string, vcs: VcsType }): Promise<{ url: string | null; error?: string }> => {
    try {
      const settings = await readSettings();
      // Verify the path exists and is a repository of the specified type
      try {
        await fs.access(localPath);
        if (vcs === VcsTypeEnum.Git) {
          await fs.stat(path.join(localPath, '.git'));
        } else if (vcs === VcsTypeEnum.Svn) {
          await fs.stat(path.join(localPath, '.svn'));
        } else {
          return { url: null, error: `Unsupported VCS type: ${vcs}` };
        }
      } catch (e) {
        return { url: null, error: `The path is not a valid ${vcs} repository.` };
      }
  
      const cmd = getExecutableCommand(vcs, settings);
      if (vcs === VcsTypeEnum.Git) {
        const { stdout } = await execAsync(`${cmd} config --get remote.origin.url`, { cwd: localPath });
        const url = stdout.trim();
        if (!url) {
          return { url: null, error: 'Could not find remote "origin" URL.' };
        }
        return { url };
      } else if (vcs === VcsTypeEnum.Svn) {
        const { stdout } = await execAsync(`${cmd} info --show-item url`, { cwd: localPath });
        const url = stdout.trim();
        if (!url) {
          return { url: null, error: 'Could not determine repository URL from SVN info.' };
        }
        return { url };
      } else {
        return { url: null, error: `Unsupported VCS type: ${vcs}` };
      }
    } catch (e: any) {
      mainLogger.error(`Error discovering remote URL for ${localPath}:`, e);
      return { url: null, error: e.stderr || e.message || 'An unknown error occurred.' };
    }
  });

// --- IPC handler for showing directory picker ---
ipcMain.handle('show-directory-picker', async () => {
  if (!mainWindow) return { canceled: true, filePaths: [] };
  return await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select a parent directory for the repository'
  });
});

// --- IPC handler for showing file picker ---
ipcMain.handle('show-file-picker', async () => {
  if (!mainWindow) return { canceled: true, filePaths: [] };
  return await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    title: 'Select Executable File'
  });
});

// --- IPC handlers for executable paths ---
ipcMain.handle('test-executable-path', async (event, { path: execPath, vcsType }: { path: string; vcsType: 'git' | 'svn' }): Promise<{ success: boolean; version?: string; error?: string }> => {
  if (!execPath) return { success: false, error: 'No path provided.' };
  const args = vcsType === 'git' ? ['--version'] : ['--version', '--quiet'];
  try {
    const { stdout } = await execFileAsync(execPath, args, { cwd: os.homedir() });
    return { success: true, version: stdout.trim() };
  } catch (e: any) {
    return { success: false, error: e.message || 'Execution failed' };
  }
});

ipcMain.handle('autodetect-executable-path', async (event, vcsType: 'git' | 'svn'): Promise<string | null> => {
    const command = vcsType;
    const checkCommand = os.platform() === 'win32' ? `where ${command}` : `which ${command}`;
    try {
        const { stdout } = await execAsync(checkCommand, { cwd: os.homedir() });
        return stdout.split(/[\r\n]/)[0].trim();
    } catch (e) {
        mainLogger.warn(`Could not autodetect ${command}: not found in PATH.`);
        return null;
    }
});


// --- IPC handler for path joining ---
ipcMain.handle('path-join', async (event, ...args: string[]) => {
  return path.join(...args);
});

// --- IPC handler for opening local path ---
ipcMain.handle('open-local-path', async (event, localPath: string) => {
  try {
    await shell.openPath(localPath);
    return { success: true };
  } catch (error: any) {
    mainLogger.error(`Failed to open path: ${localPath}`, error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('open-weblink', async (event, url: string): Promise<{ success: boolean; error?: string, warning?: string }> => {
    try {
        const settings = await readSettings();
        const browser = settings.openLinksIn || 'default';

        if (browser === 'default') {
            await shell.openExternal(url);
            return { success: true };
        }

        const currentPlatform = os.platform();
        let command: string | null = null;
        let args: string[] = [url];

        if (currentPlatform === 'win32') {
            command = 'start';
            args.unshift(browser); // `start chrome "url"`
        } else if (currentPlatform === 'darwin') { // macOS
            command = 'open';
            const browserApp = browser === 'chrome' ? 'Google Chrome' : 'Firefox';
            args.unshift(browserApp);
            args.unshift('-a'); // `open -a "Google Chrome" "url"`
        } else { // Linux
            command = browser === 'chrome' ? 'google-chrome' : 'firefox';
        }

        if (command) {
            const child = spawn(command, args, { detached: true, shell: true });
            child.on('error', (err) => {
                mainLogger.error(`Failed to open link in ${browser}, falling back to default. Error:`, err);
                shell.openExternal(url);
            });
            child.unref();
            return { success: true };
        } else {
            // Fallback for unsupported platforms or configs
            await shell.openExternal(url);
            return { success: true };
        }
    } catch (error: any) {
        mainLogger.error('Failed to open weblink:', error);
        try {
            await shell.openExternal(url);
            return { success: true, warning: 'Preferred browser failed, opened in default.' };
        } catch (fallbackError: any) {
            return { success: false, error: fallbackError.message };
        }
    }
});


// --- IPC handler for opening a terminal ---
ipcMain.handle('open-terminal', async (event, localPath: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const currentPlatform = os.platform();

    // Find Python virtual environment activation script
    const venvPaths = currentPlatform === 'win32'
      ? ['venv\\Scripts\\activate.bat', '.venv\\Scripts\\activate.bat']
      : ['venv/bin/activate', '.venv/bin/activate'];

    let venvActivationCmd = '';
    for (const p of venvPaths) {
      try {
        const fullVenvPath = path.join(localPath, p);
        await fs.access(fullVenvPath); // Throws if it doesn't exist
        if (currentPlatform === 'win32') {
          venvActivationCmd = ` && "${fullVenvPath}"`;
        } else {
          // For bash/zsh etc., we need to source it in a new interactive shell
          venvActivationCmd = ` && source "${fullVenvPath}" && exec $SHELL`;
        }
        break; // Stop after finding the first one
      } catch (e) { /* File not found, continue checking */ }
    }

    if (currentPlatform === 'win32') {
      const command = `start cmd.exe /K "cd /d "${localPath}"${venvActivationCmd}"`;
      exec(command);
      return { success: true };
    } else if (currentPlatform === 'darwin') { // macOS
      const cdCmd = `cd "${localPath}"`;
      const script = venvActivationCmd ? `${cdCmd}${venvActivationCmd}` : cdCmd;
      const escapedScript = script.replace(/"/g, '\\"');
      const command = `tell application "Terminal" to do script "${escapedScript}" activate`;
      exec(`osascript -e '${command}'`);
      return { success: true };
    } else { // Linux
      const cdCmd = `cd "${localPath}"`;
      const finalShellCommand = `${cdCmd}${venvActivationCmd || ' && exec $SHELL'}`;
      
      const tryTerminal = (cmd: string, args: string[]) => {
        return new Promise<void>((resolve, reject) => {
          const term = spawn(cmd, args, { detached: true, stdio: 'ignore' });
          term.on('error', reject);
          term.unref();
          // Assume success if spawn doesn't throw synchronously or emit an immediate error.
          resolve();
        });
      };

      try {
        await tryTerminal('x-terminal-emulator', ['-e', `bash -c "${finalShellCommand}"`]);
        return { success: true };
      } catch (e) {
        mainLogger.warn("x-terminal-emulator failed, trying gnome-terminal", e);
        try {
          await tryTerminal('gnome-terminal', [`--`, 'bash', `-c`, finalShellCommand]);
          return { success: true };
        } catch (e2) {
          mainLogger.error("gnome-terminal also failed", e2);
          return { success: false, error: "Could not find a supported terminal. Tried 'x-terminal-emulator' and 'gnome-terminal'." };
        }
      }
    }
  } catch (error: any) {
    mainLogger.error('Failed to prepare terminal command:', error);
    return { success: false, error: error.message };
  }
});

// --- Helper function to check if a file is executable ---
const isExecutable = async (filePath: string) => {
  if (platform() === 'win32') {
    return /\.(exe|bat|cmd)$/i.test(filePath);
  }
  try {
    const stats = await fs.stat(filePath);
    // Check if user, group, or others have execute permission bit set and it's a file
    return (stats.mode & 0o111) !== 0 && stats.isFile();
  } catch {
    return false;
  }
};

// --- Recursive helper to find executables in a directory ---
const findExecutables = async (dir: string, repoRoot: string, depth = 0, maxDepth = 2): Promise<string[]> => {
  if (depth > maxDepth) return [];
  
  let results: string[] = [];
  try {
    const files = await fs.readdir(dir, { withFileTypes: true });

    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      if (file.isDirectory()) {
        results = results.concat(await findExecutables(fullPath, repoRoot, depth + 1, maxDepth));
      } else if (file.isFile() && await isExecutable(fullPath)) {
        results.push(path.relative(repoRoot, fullPath));
      }
    }
  } catch (e) {
    // Ignore errors for directories that don't exist, e.g. permission denied
  }
  return results;
};


// --- IPC handler for detecting executables ---
ipcMain.handle('detect-executables', async (event, repoPath: string): Promise<string[]> => {
  if (!repoPath) return [];

  const searchDirs = ['dist', 'release', 'build', 'out', 'bin'];
  let allExecutables: string[] = [];
  
  for (const dir of searchDirs) {
    const fullSearchPath = path.join(repoPath, dir);
    const executables = await findExecutables(fullSearchPath, repoPath);
    allExecutables = allExecutables.concat(executables);
  }

  // Use a Set to remove duplicates that might arise from symlinks, etc.
  return [...new Set(allExecutables)];
});

// --- Helper for processing stream output line-by-line ---
const createLineLogger = (
  executionId: string,
  level: LogLevel,
  sender: (channel: string, ...args: any[]) => void
) => {
  let buffer = '';
  const process = (chunk: Buffer) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (let line of lines) {
      // If line ends with \r (from \r\n), strip it
      if (line.endsWith('\r')) {
        line = line.slice(0, -1);
      }

      // Handle embedded \r for progress bars. We only want the content
      // after the last carriage return in a given line.
      const lastCrIndex = line.lastIndexOf('\r');
      if (lastCrIndex !== -1) {
        line = line.substring(lastCrIndex + 1);
      }
      
      line = line.trim();
      if (line) {
        sender('task-log', { executionId, message: line, level });
      }
    }
  };
  const flush = () => {
    // Process any remaining data in the buffer
    let line = buffer;
    if (line) {
        // Also apply the same logic on the final flush
        if (line.endsWith('\r')) {
            line = line.slice(0, -1);
        }
        const lastCrIndex = line.lastIndexOf('\r');
        if (lastCrIndex !== -1) {
            line = line.substring(lastCrIndex + 1);
        }
        line = line.trim();
        if(line) {
            sender('task-log', { executionId, message: line, level });
        }
    }
    buffer = '';
  };
  return { process, flush };
};

const sanitizeFilename = (name: string): string => {
    return name.replace(/[^a-z0-9_.-]/gi, '_').substring(0, 100);
};

const registerChildProcess = (executionId: string, child: ChildProcess) => {
    runningProcesses.set(executionId, child);
    const cleanup = () => {
        if (runningProcesses.get(executionId) === child) {
            runningProcesses.delete(executionId);
        }
    };
    child.once('close', cleanup);
    child.once('exit', cleanup);
    child.once('error', cleanup);
};

ipcMain.on('cancel-task-execution', (event, { executionId }: { executionId: string }) => {
    const sender = mainWindow?.webContents.send.bind(mainWindow.webContents);
    if (!sender) return;

    const child = runningProcesses.get(executionId);
    if (!child) {
        sender('task-log', { executionId, message: 'No running process found for cancellation request.', level: LogLevel.Warn });
        sender('task-step-end', { executionId, exitCode: 0, cancelled: true });
        return;
    }

    cancelledExecutions.add(executionId);
    sender('task-log', { executionId, message: 'Cancellation requested. Attempting to terminate running process...', level: LogLevel.Warn });

    const terminationSent = child.kill('SIGTERM');
    if (terminationSent) {
        sender('task-log', { executionId, message: 'Termination signal sent to process.', level: LogLevel.Info });
        return;
    }

    const pid = child.pid;
    if (!pid) {
        cancelledExecutions.delete(executionId);
        sender('task-log', { executionId, message: 'Unable to terminate process: missing PID.', level: LogLevel.Error });
        return;
    }

    if (os.platform() === 'win32') {
        exec(`taskkill /PID ${pid} /T /F`, (error) => {
            if (error) {
                cancelledExecutions.delete(executionId);
                mainLogger.error('Failed to force terminate process', { executionId, error: error.message });
                sender('task-log', { executionId, message: `Failed to terminate process: ${error.message}`, level: LogLevel.Error });
            } else {
                sender('task-log', { executionId, message: 'Force termination command sent to process tree.', level: LogLevel.Info });
            }
        });
    } else {
        try {
            const hardKillSent = child.kill('SIGKILL');
            if (!hardKillSent) {
                throw new Error('Unable to deliver SIGKILL to process.');
            }
            sender('task-log', { executionId, message: 'Force termination signal sent to process.', level: LogLevel.Info });
        } catch (killError: any) {
            cancelledExecutions.delete(executionId);
            mainLogger.error('Failed to force terminate process', { executionId, error: killError.message });
            sender('task-log', { executionId, message: `Failed to terminate process: ${killError.message}`, level: LogLevel.Error });
        }
    }
});


// --- IPC handler for cloning a repo ---
ipcMain.on('clone-repository', async (event, { repo, executionId }: { repo: Repository, executionId: string }) => {
    const sender = mainWindow?.webContents.send.bind(mainWindow.webContents);
    if (!sender) return;

    const settings = await readSettings();
    
    // --- Task Log File Setup ---
    if (settings.saveTaskLogs) {
        try {
            const repoName = sanitizeFilename(repo.name);
            const taskName = sanitizeFilename(repo.vcs === VcsTypeEnum.Git ? 'Clone' : 'Checkout');
            const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
            const logFilename = `${timestamp}_${repoName}_${taskName}.log`;
            
            const logDir = settings.taskLogPath || path.join(userDataPath, 'task-logs');
            await fs.mkdir(logDir, { recursive: true });
            const logPath = path.join(logDir, logFilename);
            
            const stream = fsSync.createWriteStream(logPath, { flags: 'a' });
            taskLogStreams.set(executionId, stream);
            stream.write(`--- Task Log: ${repo.name} -> ${taskName} ---\n`);
            stream.write(`--- Started at: ${new Date().toISOString()} ---\n\n`);
        } catch (e) {
            mainLogger.error('Failed to create task log file.', e);
        }
    }

    const sendLog = (message: string, level: LogLevel) => {
        sender('task-log', { executionId, message, level });
    };
    const sendEnd = (exitCode: number, options: { cancelled?: boolean } = {}) => {
        sender('task-step-end', { executionId, exitCode, ...options });
    };

    let command: string;
    let args: string[];
    let verb = '';

    if (repo.vcs === VcsTypeEnum.Git) {
        verb = 'Clone';
        command = getExecutableCommand(repo.vcs, settings, false);
        args = ['clone', repo.remoteUrl, repo.localPath];
    } else if (repo.vcs === VcsTypeEnum.Svn) {
        verb = 'Checkout';
        command = getExecutableCommand(repo.vcs, settings, false);
        args = ['checkout', repo.remoteUrl, repo.localPath];
    } else {
        sendLog(`Cloning/Checking out is not supported for this VCS type: '${(repo as Repository).vcs}'.`, LogLevel.Error);
        sendEnd(1);
        return;
    }
    
    sendLog(`$ ${command} ${args.join(' ')}`, LogLevel.Command);
    
    const parentDir = dirname(repo.localPath);

    fs.mkdir(parentDir, { recursive: true }).then(() => {
        const child = spawn(command, args, {
            cwd: parentDir,
            shell: os.platform() === 'win32',
        });
        registerChildProcess(executionId, child);

        const stdoutLogger = createLineLogger(executionId, LogLevel.Info, sender);
        const stderrLogger = createLineLogger(executionId, LogLevel.Info, sender);

        child.stdout.on('data', stdoutLogger.process);
        child.stderr.on('data', stderrLogger.process);
        child.on('error', (err) => sendLog(`Spawn error: ${err.message}`, LogLevel.Error));
        child.on('close', (code) => {
            stdoutLogger.flush();
            stderrLogger.flush();
            if (cancelledExecutions.has(executionId)) {
                cancelledExecutions.delete(executionId);
                sendLog(`${verb || 'Clone'} command was cancelled by user.`, LogLevel.Warn);
                sendEnd(0, { cancelled: true });
                return;
            }
            if (code !== 0) {
                sendLog(`${verb} command exited with code ${code}`, LogLevel.Error);
            } else {
                sendLog('Repository cloned/checked out successfully.', LogLevel.Success);
            }
            sendEnd(code ?? 1);
        });
    }).catch(err => {
        sendLog(`Failed to create parent directory '${parentDir}': ${err.message}`, LogLevel.Error);
        sendEnd(1);
    });
});

// --- IPC handler for launching an application (manual command) ---
ipcMain.handle('launch-application', async (event, { repo, command }: { repo: Repository, command: string }): Promise<{ success: boolean; output: string }> => {
    if (!command) {
        return { success: false, output: 'No launch command provided.' };
    }

    return new Promise((resolve) => {
        exec(command, { cwd: repo.localPath }, (error, stdout, stderr) => {
            if (error) {
                resolve({ success: false, output: stderr || error.message });
                return;
            }
            resolve({ success: true, output: stdout });
        });
    });
});

// --- IPC handler for launching a detected executable ---
ipcMain.handle('launch-executable', async (event, { repoPath, executablePath }: { repoPath: string, executablePath: string }): Promise<{ success: boolean; output: string }> => {
    const fullPath = path.join(repoPath, executablePath);
    
    return new Promise((resolve) => {
        execFile(fullPath, { cwd: repoPath }, (error, stdout, stderr) => {
            if (error) {
                resolve({ success: false, output: stderr || error.message });
                return;
            }
            resolve({ success: true, output: stdout });
        });
    });
});

// --- Python command helpers ---
const getPythonCommandParts = async (repoPath: string): Promise<{ executable: string, isVenv: boolean }> => {
    const isWin = os.platform() === 'win32';
    const venvPyPath = path.join(repoPath, isWin ? '.venv' : '', isWin ? 'Scripts' : 'bin', 'python');
    
    try {
        await fs.access(venvPyPath);
        return { executable: venvPyPath, isVenv: true };
    } catch (e) {
        return { executable: isWin ? 'py' : 'python3', isVenv: false };
    }
};

const substituteVariables = (command: string, variables: TaskVariable[] = []): string => {
  if (!command || !variables || variables.length === 0) {
    return command;
  }
  let result = command;
  for (const variable of variables) {
    if (variable.key) {
      const regex = new RegExp(`\\$\\{${variable.key.trim()}\\}`, 'g');
      result = result.replace(regex, variable.value);
    }
  }
  result = result.replace(/\${(.*?)}/g, '');
  return result;
};

// --- Promise-based command executor ---
function executeCommand(cwd: string, fullCommand: string, sender: (channel: string, ...args: any[]) => void, executionId: string, env: { [key: string]: string | undefined }): Promise<number> {
    return new Promise((resolve, reject) => {
        sender('task-log', { executionId, message: `$ ${fullCommand}`, level: LogLevel.Command });

        const child = spawn(fullCommand, [], { cwd, shell: true, env });
        registerChildProcess(executionId, child);

        const stdoutLogger = createLineLogger(executionId, LogLevel.Info, sender);
        const stderrLogger = createLineLogger(executionId, LogLevel.Info, sender);

        child.stdout.on('data', stdoutLogger.process);
        child.stderr.on('data', stderrLogger.process);
        child.on('error', (err) => sender('task-log', { executionId, message: `Spawn error: ${err.message}`, level: LogLevel.Error }));

        child.on('close', (code) => {
            stdoutLogger.flush();
            stderrLogger.flush();
            if (cancelledExecutions.has(executionId)) {
                cancelledExecutions.delete(executionId);
                reject(new Error('cancelled'));
                return;
            }
            if (code !== 0) {
                sender('task-log', { executionId, message: `Command exited with code ${code}`, level: LogLevel.Error });
                reject(code ?? 1);
            } else {
                sender('task-log', { executionId, message: 'Step completed successfully.', level: LogLevel.Success });
                resolve(0);
            }
        });
    });
}


// --- IPC Handler for running real task steps ---
ipcMain.on('run-task-step', async (event, { repo, step, settings, executionId, task }: { repo: Repository; step: TaskStep; settings: GlobalSettings; executionId: string; task: Task }) => {
    const sender = mainWindow?.webContents.send.bind(mainWindow.webContents);
    if (!sender) return;
    
    // --- Task Log File Setup (only on the first step of a task) ---
    const isFirstStep = task.steps.findIndex(s => s.id === step.id) === 0;
    if (isFirstStep && settings.saveTaskLogs) {
        try {
            const repoName = sanitizeFilename(repo.name);
            const taskName = sanitizeFilename(task.name);
            const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
            const logFilename = `${timestamp}_${repoName}_${taskName}.log`;
            
            const logDir = settings.taskLogPath || path.join(userDataPath, 'task-logs');
            await fs.mkdir(logDir, { recursive: true });
            const logPath = path.join(logDir, logFilename);
            
            const stream = fsSync.createWriteStream(logPath, { flags: 'a' });
            taskLogStreams.set(executionId, stream);
            stream.write(`--- Task Log: ${repo.name} -> ${task.name} ---\n`);
            stream.write(`--- Started at: ${new Date().toISOString()} ---\n\n`);
        } catch (e) {
            mainLogger.error('Failed to create task log file.', e);
        }
    }

    const sendLog = (message: string, level: LogLevel) => {
        sender('task-log', { executionId, message, level });
    };
    const sendEnd = (exitCode: number, options: { cancelled?: boolean } = {}) => {
        sender('task-step-end', { executionId, exitCode, ...options });
    };

    try {
        const projectInfo = await getProjectInfo(repo.localPath);
        const gitCmd = getExecutableCommand(VcsTypeEnum.Git, settings);
        const svnCmd = getExecutableCommand(VcsTypeEnum.Svn, settings);
        
        let delphiEnvCmd = 'call rsvars.bat';
        if (step.delphiVersion && os.platform() === 'win32') {
            try {
                const key = `HKCU\\SOFTWARE\\Embarcadero\\BDS\\${step.delphiVersion}`;
                const { stdout } = await execAsync(`reg query "${key}" /v RootDir`, { cwd: os.homedir() });
                const rootDirMatch = stdout.match(/^\s*RootDir\s+REG_SZ\s+(.*)/m);
                if (rootDirMatch && rootDirMatch[1]) {
                    const rsvarsPath = path.join(rootDirMatch[1].trim(), 'bin', 'rsvars.bat');
                    await fs.access(rsvarsPath);
                    delphiEnvCmd = `call "${rsvarsPath}"`;
                    sendLog(`Using Delphi environment for version ${step.delphiVersion}`, LogLevel.Info);
                } else {
                    throw new Error(`RootDir not found or could not be parsed for Delphi version ${step.delphiVersion}`);
                }
            } catch (e: any) {
                const errorMessage = e.stderr || e.message || 'Unknown error';
                sendLog(`Could not set up environment for Delphi version ${step.delphiVersion}. Falling back to default rsvars.bat. Error: ${errorMessage}`, LogLevel.Warn);
            }
        }
        
        // Construct environment for the child process
        const env = { ...process.env };
        if (task.environmentVariables) {
            for (const envVar of task.environmentVariables) {
                if (envVar.key) {
                    // Allow task variables to be substituted into environment variable values
                    env[envVar.key] = substituteVariables(envVar.value, task.variables);
                }
            }
        }

        const run = (cmd: string) => executeCommand(repo.localPath, cmd, sender, executionId, env);
        const rustWorkspaceArgs = projectInfo.rust?.hasWorkspace ? ['--workspace'] : [];
        const mavenCommand = projectInfo.maven?.hasWrapper
            ? (os.platform() === 'win32' ? 'mvnw.cmd' : './mvnw')
            : 'mvn';

        switch(step.type) {
            // Git Steps
            case TaskStepType.GitPull: await run(`${gitCmd} pull`); break;
            case TaskStepType.GitFetch: await run(`${gitCmd} fetch`); break;
            case TaskStepType.GitCheckout:
                if (!step.branch) { sendLog('Skipping checkout: no branch specified.', LogLevel.Warn); sendEnd(0); return; }
                await run(`${gitCmd} checkout ${step.branch}`); break;
            case TaskStepType.GitStash: await run(`${gitCmd} stash`); break;
            // SVN Steps
            case TaskStepType.SvnUpdate: await run(`${svnCmd} update`); break;
            case TaskStepType.SvnSwitch:
                if (!step.branch) { sendLog('Skipping SVN switch: no target specified.', LogLevel.Warn); sendEnd(0); return; }
                await run(`${svnCmd} switch ${step.branch}`); break;
            // Common Steps
            case TaskStepType.RunCommand:
                if (!step.command) { sendLog('Skipping empty command.', LogLevel.Warn); sendEnd(0); return; }
                await run(step.command); break;

            // --- Go Steps ---
            case TaskStepType.GO_MOD_TIDY:
                await run('go mod tidy');
                break;
            case TaskStepType.GO_FMT:
                await run('go fmt ./...');
                break;
            case TaskStepType.GO_TEST:
                await run('go test ./...');
                break;
            case TaskStepType.GO_BUILD:
                await run('go build ./...');
                break;

            // --- Rust Steps ---
            case TaskStepType.RUST_CARGO_FMT:
                await run(['cargo', 'fmt', projectInfo.rust?.hasWorkspace ? '--all' : ''].filter(Boolean).join(' '));
                break;
            case TaskStepType.RUST_CARGO_CLIPPY:
                await run(['cargo', 'clippy', ...rustWorkspaceArgs, '--all-targets', '--all-features', '--', '-D', 'warnings'].join(' '));
                break;
            case TaskStepType.RUST_CARGO_CHECK:
                await run(['cargo', 'check', ...rustWorkspaceArgs, '--all-targets', '--all-features'].join(' '));
                break;
            case TaskStepType.RUST_CARGO_TEST:
                await run(['cargo', 'test', ...rustWorkspaceArgs, '--all-targets', '--all-features'].join(' '));
                break;
            case TaskStepType.RUST_CARGO_BUILD:
                await run(['cargo', 'build', ...rustWorkspaceArgs, '--release', '--all-features'].join(' '));
                break;

            // --- Maven Steps ---
            case TaskStepType.MAVEN_CLEAN:
                await run(`${mavenCommand} -B clean`);
                break;
            case TaskStepType.MAVEN_TEST:
                await run(`${mavenCommand} -B test`);
                break;
            case TaskStepType.MAVEN_PACKAGE:
                await run(`${mavenCommand} -B package`);
                break;

            // --- .NET Steps ---
            case TaskStepType.DOTNET_RESTORE:
                await run('dotnet restore');
                break;
            case TaskStepType.DOTNET_BUILD:
                await run('dotnet build --configuration Release');
                break;
            case TaskStepType.DOTNET_TEST:
                await run('dotnet test --configuration Release --logger "trx"');
                break;

            // --- Lazarus/FPC Steps ---
            case TaskStepType.LAZARUS_BUILD:
                const lpiFile = step.lazarusProjectFile || projectInfo.lazarus?.projects[0]?.path;
                if (!lpiFile) throw new Error('No Lazarus project file (.lpi) found or specified.');
                const lazMode = step.lazarusBuildMode ? `--build-mode=${step.lazarusBuildMode}` : '';
                const lazCpu = step.lazarusCpu ? `--cpu=${step.lazarusCpu}` : '';
                const lazOs = step.lazarusOs ? `--os=${step.lazarusOs}` : '';
                const lazWs = step.lazarusWidgetset ? `--ws=${step.lazarusWidgetset}` : '';
                await run(`lazbuild ${lazMode} ${lazCpu} ${lazOs} ${lazWs} "${lpiFile}"`);
                break;
            case TaskStepType.LAZARUS_BUILD_PACKAGE:
                const lpkFile = step.lazarusPackageFile || projectInfo.lazarus?.packages[0];
                if (!lpkFile) throw new Error('No Lazarus package file (.lpk) found or specified.');
                await run(`lazbuild --build-package "${lpkFile}"`);
                break;
            case TaskStepType.FPC_TEST_FPCUNIT:
                const testProject = step.lazarusProjectFile;
                if (!testProject) throw new Error('No test project specified for FPCUnit step.');
                await run(`lazbuild "${testProject}"`);
                const outputExe = testProject.replace('.lpi', '.exe'); // simple assumption
                const fpcOutputArgs = step.fpcTestOutputFile ? `--format=xml --output="${step.fpcTestOutputFile}"` : '';
                await run(`"${outputExe}" ${fpcOutputArgs}`);
                break;
                
            // --- Delphi Steps ---
            case TaskStepType.DelphiBuild:
                const projectFile = step.delphiProjectFile || projectInfo.delphi?.projects[0]?.path || projectInfo.delphi?.groups[0];
                if (!projectFile) throw new Error('No .dproj or .groupproj file found or specified for build step.');
                const mode = step.delphiBuildMode || 'Build';
                const config = step.delphiConfiguration || 'Release';
                const platform = step.delphiPlatform || 'Win32';
                await run(`${delphiEnvCmd} && msbuild "${projectFile}" /t:${mode} /p:Configuration=${config} /p:Platform=${platform}`);
                break;
            case TaskStepType.DELPHI_BOSS_INSTALL:
                await run(`${delphiEnvCmd} && boss install`);
                break;
            case TaskStepType.DELPHI_PACKAGE_INNO:
                const issFile = step.delphiInstallerScript || projectInfo.delphi?.packaging.innoSetup[0];
                if (!issFile) throw new Error('No Inno Setup script (.iss) file found or specified.');
                const issDefines = (step.delphiInstallerDefines || '').split(';').filter(d => d.trim()).map(d => `/d${d.trim()}`).join(' ');
                await run(`${delphiEnvCmd} && iscc "${issFile}" ${issDefines}`);
                break;
            case TaskStepType.DELPHI_PACKAGE_NSIS:
                const nsiFile = step.delphiInstallerScript || projectInfo.delphi?.packaging.nsis[0];
                if (!nsiFile) throw new Error('No NSIS script (.nsi) file found or specified.');
                const nsiDefines = (step.delphiInstallerDefines || '').split(';').filter(d => d.trim()).map(d => `/D${d.trim()}`).join(' ');
                await run(`${delphiEnvCmd} && makensis ${nsiDefines} "${nsiFile}"`);
                break;
            case TaskStepType.DELPHI_TEST_DUNITX:
                const testExe = step.delphiTestExecutable;
                if (!testExe) throw new Error('Path to DUnitX test executable is not specified.');
                const outputArgs = step.delphiTestOutputFile ? `--format=JUnit --output="${step.delphiTestOutputFile}"` : '';
                await run(`"${testExe}" ${outputArgs}`);
                break;
                
            // --- Python Steps ---
            case TaskStepType.PYTHON_CREATE_VENV:
                const globalPy = os.platform() === 'win32' ? 'py' : 'python3';
                await run(`${globalPy} -m venv .venv`); break;
            case TaskStepType.PYTHON_INSTALL_DEPS:
                const { executable: pyExec } = await getPythonCommandParts(repo.localPath);
                switch(projectInfo.python?.envManager) {
                    case 'poetry': await run('poetry install'); break;
                    case 'pdm': await run('pdm install'); break;
                    case 'pipenv': await run('pipenv sync --dev'); break;
                    case 'conda': await run('conda env update -f environment.yml'); break;
                    default: await run(`${pyExec} -m pip install -r requirements.txt`); break;
                }
                break;
            case TaskStepType.PYTHON_RUN_TESTS:
                 const { executable: testPyExec } = await getPythonCommandParts(repo.localPath);
                 switch(projectInfo.python?.testFramework) {
                    case 'tox': await run('tox'); break;
                    case 'nox': await run('nox'); break;
                    default: await run(`${testPyExec} -m pytest`); break;
                 }
                 break;
            case TaskStepType.PYTHON_RUN_BUILD:
                const { executable: buildPyExec } = await getPythonCommandParts(repo.localPath);
                switch(projectInfo.python?.buildBackend) {
                    case 'poetry': await run('poetry build'); break;
                    case 'pdm': await run('pdm build'); break;
                    case 'hatch': await run('hatch build'); break;
                    default: await run(`${buildPyExec} -m build`); break;
                }
                break;
            case TaskStepType.PYTHON_RUN_LINT:
            case TaskStepType.PYTHON_RUN_FORMAT:
            case TaskStepType.PYTHON_RUN_TYPECHECK:
                 const { executable: toolPyExec } = await getPythonCommandParts(repo.localPath);
                 if (step.type === TaskStepType.PYTHON_RUN_LINT && projectInfo.python?.linters.includes('ruff')) await run(`${toolPyExec} -m ruff check .`);
                 if (step.type === TaskStepType.PYTHON_RUN_LINT && projectInfo.python?.linters.includes('pylint')) await run(`${toolPyExec} -m pylint ./`);
                 if (step.type === TaskStepType.PYTHON_RUN_FORMAT && projectInfo.python?.formatters.includes('black')) await run(`${toolPyExec} -m black .`);
                 if (step.type === TaskStepType.PYTHON_RUN_FORMAT && projectInfo.python?.formatters.includes('isort')) await run(`${toolPyExec} -m isort .`);
                 if (step.type === TaskStepType.PYTHON_RUN_TYPECHECK && projectInfo.python?.typeCheckers.includes('mypy')) await run(`${toolPyExec} -m mypy .`);
                 break;
            
            // --- Node.js Steps ---
            case TaskStepType.NODE_INSTALL_DEPS:
                const nodeCaps = projectInfo.nodejs;
                let pmCommand: string;
                if (nodeCaps?.declaredManager?.startsWith('pnpm')) pmCommand = 'pnpm install --frozen-lockfile';
                else if (nodeCaps?.packageManagers.pnpm) pmCommand = 'pnpm install --frozen-lockfile';
                else if (nodeCaps?.packageManagers.yarn) pmCommand = 'yarn install --immutable';
                else pmCommand = 'npm ci';
                await run(pmCommand);
                break;
            case TaskStepType.NODE_RUN_LINT:
                if (projectInfo.nodejs?.linters.includes('eslint')) await run('npx eslint . --max-warnings=0');
                if (projectInfo.nodejs?.linters.includes('prettier')) await run('npx prettier . --check');
                break;
            case TaskStepType.NODE_RUN_FORMAT:
                if (projectInfo.nodejs?.linters.includes('prettier')) await run('npx prettier . --write');
                if (projectInfo.nodejs?.linters.includes('eslint')) await run('npx eslint . --fix');
                break;
            case TaskStepType.NODE_RUN_TYPECHECK:
                await run('npx tsc --noEmit');
                break;
            case TaskStepType.NODE_RUN_TESTS:
                if (projectInfo.nodejs?.testFrameworks.includes('vitest')) {
                    await run('npx vitest run --reporter=junit --coverage.enabled');
                } else {
                    await run('npx jest --ci --reporters=default --reporters=jest-junit --coverage --coverageReporters=cobertura');
                }
                break;
            case TaskStepType.NODE_RUN_BUILD:
                let buildCommand: string | null = null;
                try {
                    const pkg = JSON.parse(await fs.readFile(path.join(repo.localPath, 'package.json'), 'utf-8'));
                    if (pkg.scripts?.build) {
                        const pm = projectInfo.nodejs?.packageManagers.pnpm ? 'pnpm' : (projectInfo.nodejs?.packageManagers.yarn ? 'yarn' : 'npm');
                        buildCommand = `${pm} run build`;
                    }
                } catch (e) { /* ignore parse error */ }
                
                if (buildCommand) {
                    await run(buildCommand);
                } else {
                    if (projectInfo.nodejs?.bundlers.includes('vite')) await run('npx vite build');
                    else if (projectInfo.nodejs?.bundlers.includes('tsup')) await run('npx tsup');
                    else throw new Error("No 'build' script found in package.json and no known bundler config detected.");
                }
                break;

            // --- Docker Steps ---
            case TaskStepType.DOCKER_BUILD_IMAGE:
                const imageName = step.dockerImageName || `${repo.name.toLowerCase()}:latest`;
                const dockerfile = step.dockerfilePath || 'Dockerfile';
                const buildArgs = step.dockerBuildArgs || '';
                await run(`docker build -t "${imageName}" -f "${dockerfile}" ${buildArgs} .`);
                break;
            case TaskStepType.DOCKER_COMPOSE_UP:
                const composeUpPath = step.dockerComposePath ? `-f "${step.dockerComposePath}"` : '';
                await run(`docker-compose ${composeUpPath} up -d`);
                break;
            case TaskStepType.DOCKER_COMPOSE_DOWN:
                const composeDownPath = step.dockerComposePath ? `-f "${step.dockerComposePath}"` : '';
                await run(`docker-compose ${composeDownPath} down`);
                break;
            case TaskStepType.DOCKER_COMPOSE_BUILD:
                const composeBuildPath = step.dockerComposePath ? `-f "${step.dockerComposePath}"` : '';
                await run(`docker-compose ${composeBuildPath} build`);
                break;
                
            default:
                throw new Error(`Unknown step type: ${step.type}`);
        }

        sendEnd(0);
    } catch (error: any) {
        if (error?.message === 'cancelled') {
            sendLog(`Step '${step.type}' was cancelled by user.`, LogLevel.Warn);
            sendEnd(0, { cancelled: true });
        } else {
            sendLog(`Error during step '${step.type}': ${error.message}`, LogLevel.Error);
            sendEnd(typeof error === 'number' ? error : 1);
        }
    }
});




// =================================================================
// --- NEW IPC Handlers for Deep VCS Integration ---
// =================================================================

// --- Helper to get Delphi versions from Windows Registry ---
const getDelphiVersions = async (): Promise<{ name: string; version: string }[]> => {
  if (os.platform() !== 'win32') {
    return []; // Delphi is Windows-only
  }
  try {
    const { stdout } = await execAsync('reg query "HKCU\\SOFTWARE\\Embarcadero\\BDS"', { cwd: os.homedir() });
    const versionKeys = stdout.match(/HKEY_CURRENT_USER\\SOFTWARE\\Embarcadero\\BDS\\[0-9.]+/g) || [];
    
    if (versionKeys.length === 0) {
      mainLogger.info('[Delphi] No Delphi versions found in registry.');
      return [];
    }

    const versions = await Promise.all(
      versionKeys.map(async key => {
        const versionString = key.split('\\').pop();
        if (!versionString) return null;

        try {
          // 1. Get RootDir (mandatory)
          const { stdout: rootDirStdout } = await execAsync(`reg query "${key}" /v RootDir`, { cwd: os.homedir() });
          const rootDirMatch = rootDirStdout.match(/^\s*RootDir\s+REG_SZ\s+(.*)/m);
          if (!rootDirMatch || !rootDirMatch[1]) {
            mainLogger.warn(`[Delphi] Could not find or parse RootDir for key: ${key}. Skipping this version.`, { stdout: rootDirStdout });
            return null;
          }

          // 2. Get ProductName (optional)
          let productName: string | null = null;
          try {
            const { stdout: productNameStdout } = await execAsync(`reg query "${key}" /v ProductName`, { cwd: os.homedir() });
            const productNameMatch = productNameStdout.match(/^\s*ProductName\s+REG_SZ\s+(.*)/m);
            if (productNameMatch && productNameMatch[1]) {
              productName = productNameMatch[1].trim();
            }
          } catch (productNameError: any) {
            mainLogger.info(`[Delphi] Optional value 'ProductName' not found for key: ${key}. Using default name.`, { error: productNameError.message });
          }

          // 3. Construct name and return
          const name = productName ? `${productName} (${versionString})` : `Delphi ${versionString}`;
          return { name, version: versionString };

        } catch (e: any) {
          // This will now only catch critical errors like failure to read RootDir
          const errorDetails = { 
            message: e.message, 
            stdout: e.stdout, 
            stderr: e.stderr,
            code: e.code,
          };
          mainLogger.warn(`[Delphi] Could not read critical registry details for key: ${key}`, errorDetails);
          return null;
        }
      })
    );
    
    const validVersions = versions.filter((v): v is { name: string; version: string } => v !== null);
    mainLogger.debug('[Delphi] Found Delphi versions', validVersions);
    return validVersions;
  } catch (err: any) {
    mainLogger.info('[Delphi] Could not query registry for Delphi versions. Maybe none are installed.', err);
    return [];
  }
};

ipcMain.handle('get-delphi-versions', getDelphiVersions);


// --- Get Detailed Status ---
ipcMain.handle('get-detailed-vcs-status', async (event, repo: Repository): Promise<DetailedStatus | null> => {
  try {
    const settings = await readSettings();
    const cmd = getExecutableCommand(repo.vcs, settings);

    if (repo.vcs === VcsTypeEnum.Git) {
      try {
        // Fetch updates from all remotes without changing local branches
        await execAsync(`${cmd} remote update`, { cwd: repo.localPath });
      } catch (fetchError: any) {
        // Log the error but continue, as status can still be useful with stale data
        mainLogger.warn(`'git remote update' failed for ${repo.name}. Status may be stale. Error: ${fetchError.stderr || fetchError.message}`);
      }
      const { stdout } = await execAsync(`${cmd} status --porcelain=v2 --branch`, { cwd: repo.localPath });
      const files: VcsFileStatus = { added: 0, modified: 0, deleted: 0, conflicted: 0, untracked: 0, renamed: 0 };
      let branchInfo: DetailedStatus['branchInfo'] = undefined;
      let isDirty = false;

      for (const line of stdout.split('\n')) {
        if (line.startsWith('# branch.ab')) {
          const match = line.match(/\+([0-9]+) -([0-9]+)/);
          if (match) {
            branchInfo = { ...(branchInfo || { ahead:0, behind: 0, tracking: '' }), ahead: parseInt(match[1]), behind: parseInt(match[2]) };
          }
        } else if (line.startsWith('# branch.upstream')) {
          branchInfo = { ...(branchInfo || { ahead:0, behind: 0, tracking: '' }), tracking: line.substring(18) };
        } else if (line.startsWith('1 ')) { // Changed files (staged/unstaged)
          isDirty = true;
          const xy = line.substring(2, 4);
          if (xy[1] === 'A') files.added++;
          if (xy[1] === 'M') files.modified++;
          if (xy[1] === 'D') files.deleted++;
        } else if (line.startsWith('2 ')) { // Renamed files
          isDirty = true;
          files.renamed++;
        } else if (line.startsWith('u ')) { // Unmerged
          isDirty = true;
          files.conflicted++;
        } else if (line.startsWith('? ')) { // Untracked
          isDirty = true;
          files.untracked++;
        }
      }
      return { files, branchInfo, isDirty };
    } else if (repo.vcs === VcsTypeEnum.Svn) {
      const { stdout } = await execAsync(`${cmd} status -u`, { cwd: repo.localPath });
      const files: VcsFileStatus = { added: 0, modified: 0, deleted: 0, conflicted: 0, untracked: 0, renamed: 0 };
      let updatesAvailable = false;
      let isDirty = false;

      const lines = stdout.trim().split('\n').filter(line => line.trim() !== '' && !line.startsWith('Status against revision:'));

      if (lines.length === 0) {
        return { files, isDirty: false, updatesAvailable: false };
      }

      for (const line of lines) {
        const statusChar = line.charAt(0);
        
        if (statusChar !== ' ') {
            isDirty = true;
        }
        
        if (line.length >= 9 && line.charAt(8) === '*') {
            updatesAvailable = true;
        }
        
        if (statusChar === 'A') files.added++;
        else if (statusChar === 'M') files.modified++;
        else if (statusChar === 'D') files.deleted++;
        else if (statusChar === 'C') files.conflicted++;
        else if (statusChar === '?') files.untracked++;
      }
      return { files, isDirty, updatesAvailable };
    }
    return null;
  } catch (error) {
    mainLogger.error(`Error getting detailed status for ${repo.name}:`, error);
    return null;
  }
});


// --- Get Commit History (Git and SVN) ---
ipcMain.handle('get-commit-history', async (event, repo: Repository, skipCount?: number, searchQuery?: string): Promise<Commit[]> => {
    try {
        const settings = await readSettings();

        if (repo.vcs === VcsTypeEnum.Git) {
            const gitCmd = getExecutableCommand(VcsTypeEnum.Git, settings);
            const SEPARATOR = '_||_';
            const format = `%H${SEPARATOR}%h${SEPARATOR}%an${SEPARATOR}%ar${SEPARATOR}%B`;
            const skip = skipCount && Number.isInteger(skipCount) && skipCount > 0 ? `--skip=${skipCount}` : '';
            const search = searchQuery ? `--grep="${searchQuery.replace(/"/g, '\\"')}" -i --all-match` : '';
            const { stdout } = await execAsync(`${gitCmd} log --pretty=format:"${format}" -z -n 100 ${skip} ${search}`, { cwd: repo.localPath });
            
            if (!stdout) return [];
            
            return stdout.split('\0').filter(line => line.trim() !== '').map(line => {
                const parts = line.split(SEPARATOR);
                return {
                    hash: parts[0],
                    shortHash: parts[1],
                    author: parts[2],
                    date: parts[3],
                    message: parts.slice(4).join(SEPARATOR) || '',
                };
            });
        } else if (repo.vcs === VcsTypeEnum.Svn) {
            mainLogger.debug(`[SVN History] Getting history for "${repo.name}"`);
            const svnCmd = getExecutableCommand(VcsTypeEnum.Svn, settings);
            
            mainLogger.debug(`[SVN History] Getting latest revision...`);
            const { stdout: headStdout } = await execAsync(`${svnCmd} info --show-item last-changed-revision`, { cwd: repo.localPath });
            const headRev = parseInt(headStdout.trim(), 10);
            mainLogger.debug(`[SVN History] Latest revision: ${headRev}`);
            
            if (isNaN(headRev)) {
                mainLogger.error('[SVN History] Could not determine latest SVN revision.');
                throw new Error('Could not determine latest SVN revision.');
            }

            const startRev = headRev - (skipCount || 0);
            mainLogger.debug(`[SVN History] Calculated start revision: ${startRev}`, { skipCount: skipCount || 0 });
            if (startRev < 1) {
                mainLogger.debug('[SVN History] Start revision is less than 1, returning empty array.');
                return [];
            }

            const limit = 100;
            const search = searchQuery ? `--search "${searchQuery.replace(/"/g, '\\"')}"` : '';
            const logCommand = `${svnCmd} log --xml -l ${limit} -r ${startRev}:1 ${search}`;
            mainLogger.debug(`[SVN History] Executing log command:`, { command: logCommand });
            const { stdout } = await execAsync(logCommand, { cwd: repo.localPath });

            mainLogger.debug(`[SVN History] Raw XML output received`, { length: stdout.length, xml: stdout });

            if (!stdout) {
                mainLogger.debug('[SVN History] No stdout from svn log command. Returning empty array.');
                return [];
            }

            const commits: Commit[] = [];
            const svnLogRegex = /<logentry\s+revision="(\d+)">\s*<author>([\s\S]*?)<\/author>\s*<date>(.*?)<\/date>\s*<msg>([\s\S]*?)<\/msg>\s*<\/logentry>/g;
            
            let match;
            while ((match = svnLogRegex.exec(stdout)) !== null) {
                const date = new Date(match[3]);
                const formattedDate = isNaN(date.getTime()) ? match[3] : date.toLocaleString();
                
                commits.push({
                    hash: match[1],
                    shortHash: `r${match[1]}`,
                    author: match[2],
                    date: formattedDate,
                    message: match[4].trim(),
                });
            }
            mainLogger.debug(`[SVN History] Parsed ${commits.length} commits.`);
            return commits;
        }
    } catch (e: any) {
        mainLogger.error(`[History] Failed to get commit history for ${repo.name}`, { error: e.message, stderr: e.stderr, search: searchQuery });
        return [];
    }
    return [];
});

ipcMain.handle('get-commit-diff', async (event, repo: Repository, commitHash: string): Promise<CommitDiffFile[]> => {
    try {
        if (!commitHash) {
            return [];
        }

        const settings = await readSettings();

        if (repo.vcs === VcsTypeEnum.Git) {
            const sanitizedHash = commitHash.trim();
            if (!/^[0-9a-fA-F^~:@._\-/]+$/.test(sanitizedHash)) {
                throw new Error('Invalid git commit reference.');
            }

            const gitCmd = getExecutableCommand(VcsTypeEnum.Git, settings);
            const { stdout } = await execAsync(`${gitCmd} show ${sanitizedHash} --patch --pretty=format:`, { cwd: repo.localPath });
            const normalized = stdout.replace(/\r\n/g, '\n');
            const sections = normalized.match(/(^diff --git [\s\S]*?)(?=^diff --git |\Z)/gm);

            if (!sections) {
                return [];
            }

            return sections.map(section => {
                const lines = section.split('\n');
                const header = lines[0] ?? '';
                const filePathMatch = header.replace(/^diff --git /, '').split(' b/');
                const filePath = filePathMatch[1]?.replace(/^"/, '').replace(/"$/, '') ?? header.replace(/^diff --git /, '');
                const isBinary = /Binary files /.test(section) || /GIT binary patch/.test(section);
                return {
                    filePath: filePath.trim(),
                    diff: section.trimEnd(),
                    isBinary,
                } satisfies CommitDiffFile;
            });
        }

        if (repo.vcs === VcsTypeEnum.Svn) {
            const sanitizedRevision = commitHash.trim();
            if (!/^\d+$/.test(sanitizedRevision)) {
                throw new Error('Invalid SVN revision.');
            }

            const svnCmd = getExecutableCommand(VcsTypeEnum.Svn, settings);
            const { stdout } = await execAsync(`${svnCmd} diff -c ${sanitizedRevision}`, { cwd: repo.localPath });
            const normalized = stdout.replace(/\r\n/g, '\n');
            const sections = normalized.split(/^Index: /m).filter(section => section.trim() !== '');

            return sections.map(section => {
                const trimmedSection = section.trimEnd();
                const lines = trimmedSection.split('\n');
                const header = lines[0] ?? '';
                const filePath = header.trim();
                const diffBody = `Index: ${trimmedSection}`;
                const isBinary = /Cannot display: file marked as a binary type/.test(diffBody) || /Binary files/.test(diffBody);
                return {
                    filePath,
                    diff: diffBody,
                    isBinary,
                } satisfies CommitDiffFile;
            });
        }

        return [];
    } catch (error: any) {
        mainLogger.error(`[Commit Diff] Failed to get diff for ${repo.name} at ${commitHash}`, { error: error?.message, stderr: error?.stderr });
        return [];
    }
});


// --- List Branches (Git & SVN) ---
ipcMain.handle('list-branches', async (event, args: { repoPath: string; vcs?: 'git' | 'svn' } | string): Promise<BranchInfo> => {
    const empty: BranchInfo = { local: [], remote: [], current: null };

    let repoPath: string | undefined;
    let providedVcs: VcsTypeEnum | undefined;

    if (typeof args === 'string') {
        repoPath = args;
    } else if (args && typeof args.repoPath === 'string') {
        repoPath = args.repoPath;
        if (args.vcs === 'git') providedVcs = VcsTypeEnum.Git;
        if (args.vcs === 'svn') providedVcs = VcsTypeEnum.Svn;
    }

    if (!repoPath) {
        return empty;
    }

    let repoVcs = providedVcs ?? null;
    if (!repoVcs) {
        if (await fileExists(repoPath, '.git')) {
            repoVcs = VcsTypeEnum.Git;
        } else if (await fileExists(repoPath, '.svn')) {
            repoVcs = VcsTypeEnum.Svn;
        }
    }

    if (!repoVcs) {
        return empty;
    }

    const settings = await readSettings();

    if (repoVcs === VcsTypeEnum.Git) {
        const branches: BranchInfo = { local: [], remote: [], current: null };
        const gitCmd = getExecutableCommand(VcsTypeEnum.Git, settings);

        const parseForEachRef = async (ref: string) => {
            const { stdout } = await execAsync(`${gitCmd} for-each-ref --format="%(refname:short)" --sort=-committerdate ${ref}`, { cwd: repoPath! });
            return stdout
                .split('\n')
                .map(line => line.trim())
                .filter(Boolean);
        };

        try {
            const currentResult = await execAsync(`${gitCmd} branch --show-current`, { cwd: repoPath });
            const current = currentResult.stdout.trim();
            branches.current = current ? current : null;
        } catch (error) {
            branches.current = null;
        }

        let localResolved = false;
        try {
            branches.local = await parseForEachRef('refs/heads');
            localResolved = true;
        } catch (error) {
            mainLogger.warn(`[Branches] Failed to list local branches via for-each-ref`, { error: (error as any)?.message });
        }

        let remoteResolved = false;
        try {
            const remoteBranches = await parseForEachRef('refs/remotes');
            branches.remote = remoteBranches.filter(name => !/\/HEAD$/.test(name));
            remoteResolved = true;
        } catch (error) {
            mainLogger.warn(`[Branches] Failed to list remote branches via for-each-ref`, { error: (error as any)?.message });
        }

        if (!localResolved || !remoteResolved || branches.current === null) {
            try {
                const { stdout } = await execAsync(`${gitCmd} branch -a`, { cwd: repoPath });
                stdout.split('\n').forEach(line => {
                    let parsedLine = line.trim();
                    if (!parsedLine) {
                        return;
                    }

                    const isCurrent = parsedLine.startsWith('* ');
                    if (isCurrent) {
                        parsedLine = parsedLine.substring(2);
                        if (!branches.current) {
                            branches.current = parsedLine;
                        }
                    }

                    if (parsedLine.startsWith('remotes/')) {
                        if (!parsedLine.includes('->')) {
                            const remoteName = parsedLine.substring(8);
                            if (!branches.remote.includes(remoteName)) {
                                branches.remote.push(remoteName);
                            }
                        }
                    } else {
                        if (!branches.local.includes(parsedLine)) {
                            branches.local.push(parsedLine);
                        }
                    }
                });

                if (!localResolved) {
                    branches.local.sort((a, b) => a.localeCompare(b));
                }
                if (!remoteResolved) {
                    branches.remote = branches.remote.filter(name => !name.endsWith('/HEAD'));
                    branches.remote.sort((a, b) => a.localeCompare(b));
                }
            } catch (fallbackError) {
                mainLogger.error(`[Branches] Failed to list branches for ${repoPath}`, { error: (fallbackError as any)?.message });
                return empty;
            }
        }

        return branches;
    }

    // SVN branch listing
    const svnCmd = getExecutableCommand(VcsTypeEnum.Svn, settings);
    const branches: BranchInfo = { local: [], remote: [], current: null };

    const sanitizeRelative = (value: string) => value.replace(/^\^?\/+/, '').replace(/\/$/, '');
    const addRemoteBranch = (set: Set<string>, value: string, root?: string | null) => {
        if (!value) return;
        const trimmed = value.replace(/\/$/, '');
        if (!trimmed) return;
        if (root && trimmed.startsWith(root)) {
            const relative = trimmed.substring(root.length).replace(/^\/+/, '');
            if (relative) {
                set.add(relative);
                return;
            }
        }
        set.add(trimmed);
    };

    let rootUrl: string | null = null;
    let currentUrl: string | null = null;

    try {
        const { stdout } = await execAsync(`${svnCmd} info --show-item relative-url`, { cwd: repoPath });
        const relative = sanitizeRelative(stdout.trim());
        if (relative) {
            branches.current = relative;
            branches.local = [relative];
        }
    } catch (error) {
        mainLogger.debug(`[Branches] Failed to read SVN relative URL for ${repoPath}`, { error: (error as any)?.message });
    }

    try {
        const { stdout } = await execAsync(`${svnCmd} info --show-item repos-root-url`, { cwd: repoPath });
        rootUrl = stdout.trim().replace(/\/$/, '') || null;
    } catch (error) {
        mainLogger.debug(`[Branches] Failed to determine SVN repository root for ${repoPath}`, { error: (error as any)?.message });
    }

    try {
        const { stdout } = await execAsync(`${svnCmd} info --show-item url`, { cwd: repoPath });
        currentUrl = stdout.trim().replace(/\/$/, '') || null;
    } catch (error) {
        mainLogger.debug(`[Branches] Failed to determine SVN current URL for ${repoPath}`, { error: (error as any)?.message });
    }

    if (!rootUrl && currentUrl && branches.current) {
        const normalizedCurrent = branches.current;
        const lowerCurrent = normalizedCurrent.toLowerCase();
        const lowerUrl = currentUrl.toLowerCase();
        const index = lowerUrl.lastIndexOf(lowerCurrent);
        if (index >= 0) {
            rootUrl = currentUrl.substring(0, index).replace(/\/$/, '');
        }
    }

    const normalizedRoot = rootUrl ? rootUrl.replace(/\/$/, '') : null;
    const remoteBranches = new Set<string>();

    const trunkCandidates = new Set<string>();
    if (normalizedRoot) {
        trunkCandidates.add(`${normalizedRoot}/trunk`);
    }
    if (currentUrl) {
        const lowerCurrentUrl = currentUrl.toLowerCase();
        if (lowerCurrentUrl.includes('/branches/')) {
            const prefix = currentUrl.substring(0, lowerCurrentUrl.indexOf('/branches/'));
            trunkCandidates.add(`${prefix}/trunk`);
        }
    }
    trunkCandidates.forEach(candidate => addRemoteBranch(remoteBranches, candidate, normalizedRoot));

    const branchBases = new Set<string>();
    if (currentUrl) {
        const lowerCurrentUrl = currentUrl.toLowerCase();
        const branchesIndex = lowerCurrentUrl.indexOf('/branches/');
        if (branchesIndex >= 0) {
            branchBases.add(`${currentUrl.substring(0, branchesIndex)}/branches`);
        }
        if (lowerCurrentUrl.endsWith('/trunk')) {
            branchBases.add(`${currentUrl.substring(0, currentUrl.length - 5)}branches`);
        }
    }
    if (normalizedRoot) {
        branchBases.add(`${normalizedRoot}/branches`);
    }

    for (const base of branchBases) {
        const normalizedBase = base.replace(/\/$/, '');
        try {
            const { stdout } = await execAsync(`${svnCmd} list ${JSON.stringify(normalizedBase)}`, { cwd: repoPath });
            stdout
                .split('\n')
                .map(line => line.trim())
                .filter(Boolean)
                .forEach(entry => {
                    const name = entry.replace(/\/$/, '');
                    if (!name) return;
                    addRemoteBranch(remoteBranches, `${normalizedBase}/${name}`, normalizedRoot);
                });
        } catch (error) {
            mainLogger.debug(`[Branches] Failed to list SVN branches at ${normalizedBase}`, { error: (error as any)?.message });
        }
    }

    branches.remote = Array.from(remoteBranches).sort((a, b) => a.localeCompare(b));

    if (branches.local.length === 0 && branches.current) {
        branches.local.push(branches.current);
    }

    return branches;
});

const simpleGitCommand = async (repoPath: string, command: string): Promise<{ success: boolean; error?: string }> => {
    try {
        const settings = await readSettings();
        const gitCmd = getExecutableCommand(VcsTypeEnum.Git, settings);
        await execAsync(`${gitCmd} ${command}`, { cwd: repoPath });
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.stderr || e.message };
    }
};

const PROTECTED_BRANCH_IDENTIFIERS = new Set(['main', 'origin', 'origin/main']);

const isProtectedBranch = (
    branchIdentifier: string,
    scope: 'local' | 'remote',
    remoteDetails?: { remoteName: string; branchName: string }
): boolean => {
    const normalized = branchIdentifier.trim().toLowerCase();
    if (PROTECTED_BRANCH_IDENTIFIERS.has(normalized)) {
        return true;
    }

    if (scope === 'remote' && remoteDetails) {
        const remoteNormalized = remoteDetails.remoteName.trim().toLowerCase();
        const branchNormalized = remoteDetails.branchName.trim().toLowerCase();
        const composite = `${remoteNormalized}/${branchNormalized}`;
        if (PROTECTED_BRANCH_IDENTIFIERS.has(composite)) {
            return true;
        }
        if (remoteNormalized === 'origin' && PROTECTED_BRANCH_IDENTIFIERS.has(branchNormalized)) {
            return true;
        }
    }

    return false;
};

ipcMain.handle('checkout-branch', async (event, arg1: any, arg2?: any) => {
    let repoPath: string | undefined;
    let branch: string | undefined;
    let providedVcs: VcsTypeEnum | undefined;

    if (typeof arg1 === 'object' && arg1 !== null) {
        repoPath = arg1.repoPath;
        branch = arg1.branch;
        if (arg1.vcs === 'git') providedVcs = VcsTypeEnum.Git;
        if (arg1.vcs === 'svn') providedVcs = VcsTypeEnum.Svn;
    } else {
        repoPath = arg1;
        if (typeof arg2 === 'string') {
            branch = arg2;
        }
    }

    if (!repoPath || !branch) {
        return { success: false, error: 'Invalid arguments' };
    }

    let repoVcs = providedVcs ?? null;
    if (!repoVcs) {
        if (await fileExists(repoPath, '.git')) {
            repoVcs = VcsTypeEnum.Git;
        } else if (await fileExists(repoPath, '.svn')) {
            repoVcs = VcsTypeEnum.Svn;
        }
    }

    if (repoVcs === VcsTypeEnum.Svn) {
        try {
            const settings = await readSettings();
            const svnCmd = getExecutableCommand(VcsTypeEnum.Svn, settings);

            const sanitize = (value: string) => value.trim().replace(/^\^?\/+/, '').replace(/\/$/, '');
            const original = branch.trim();
            const isUrl = /^https?:\/\//i.test(original);

            let rootUrl: string | null = null;
            let currentUrl: string | null = null;
            let relativeUrl: string | null = null;

            try {
                const { stdout } = await execAsync(`${svnCmd} info --show-item repos-root-url`, { cwd: repoPath });
                rootUrl = stdout.trim().replace(/\/$/, '') || null;
            } catch (error) {
                mainLogger.debug(`[SVN Checkout] Failed to get root URL for ${repoPath}`, { error: (error as any)?.message });
            }

            try {
                const { stdout } = await execAsync(`${svnCmd} info --show-item url`, { cwd: repoPath });
                currentUrl = stdout.trim().replace(/\/$/, '') || null;
            } catch (error) {
                mainLogger.debug(`[SVN Checkout] Failed to get current URL for ${repoPath}`, { error: (error as any)?.message });
            }

            try {
                const { stdout } = await execAsync(`${svnCmd} info --show-item relative-url`, { cwd: repoPath });
                relativeUrl = stdout.trim();
            } catch (error) {
                mainLogger.debug(`[SVN Checkout] Failed to get relative URL for ${repoPath}`, { error: (error as any)?.message });
            }

            if (!rootUrl && currentUrl && relativeUrl) {
                const normalizedRelative = sanitize(relativeUrl);
                const lowerRelative = normalizedRelative.toLowerCase();
                const lowerCurrent = currentUrl.toLowerCase();
                const index = lowerCurrent.lastIndexOf(lowerRelative);
                if (index >= 0) {
                    rootUrl = currentUrl.substring(0, index).replace(/\/$/, '');
                }
            }

            let target = original;
            if (!isUrl) {
                const sanitizedBranch = sanitize(original);
                if (rootUrl) {
                    target = `${rootUrl}/${sanitizedBranch}`;
                } else {
                    target = sanitizedBranch;
                }
            }

            await execAsync(`${svnCmd} switch ${JSON.stringify(target)}`, { cwd: repoPath });
            return { success: true };
        } catch (error: any) {
            return { success: false, error: error.stderr || error.message };
        }
    }

    // Default to git checkout behaviour
    if (!repoVcs || repoVcs === VcsTypeEnum.Git) {
        if (branch.includes('/')) {
            return simpleGitCommand(repoPath, `checkout --track ${branch}`);
        }
        return simpleGitCommand(repoPath, `checkout ${branch}`);
    }

    return { success: false, error: 'Unsupported repository type' };
});
ipcMain.handle('create-branch', (e, repoPath: string, branch: string) => simpleGitCommand(repoPath, `checkout -b ${branch}`));
ipcMain.handle('delete-branch', (e, repoPath: string, branch: string, isRemote: boolean, remoteName?: string) => {
    if (isRemote) {
        const originalTrimmed = branch.trim();
        let targetRemote = remoteName?.trim();
        let branchRef = originalTrimmed;

        if (!targetRemote && branchRef.includes('/')) {
            const segments = branchRef.split('/');
            targetRemote = segments.shift() || targetRemote;
            branchRef = segments.join('/') || branchRef;
        }

        if (!targetRemote) {
            targetRemote = 'origin';
        }

        const remoteDetails = targetRemote ? { remoteName: targetRemote, branchName: branchRef } : undefined;
        const remoteLabelCandidate = targetRemote ? `${targetRemote}/${branchRef}` : undefined;
        const displayLabel = originalTrimmed.includes('/')
            ? originalTrimmed
            : (remoteLabelCandidate && branchRef !== targetRemote ? remoteLabelCandidate : originalTrimmed);

        if (isProtectedBranch(displayLabel, 'remote', remoteDetails)) {
            return { success: false, error: `Branch '${displayLabel}' is protected and cannot be deleted.` };
        }

        return simpleGitCommand(repoPath, `push ${targetRemote} --delete ${branchRef}`);
    }

    const branchName = branch.trim();
    if (isProtectedBranch(branchName, 'local')) {
        return { success: false, error: `Branch '${branchName}' is protected and cannot be deleted.` };
    }

    return simpleGitCommand(repoPath, `branch -d ${branchName}`);
});
ipcMain.handle('merge-branch', (e, repoPath: string, branch: string) => simpleGitCommand(repoPath, `merge ${branch}`));


// --- Log to file handlers ---
ipcMain.on('log-to-file-init', () => {
    const initNewStream = () => {
        const logPath = getLogFilePath();
        logStream = fsSync.createWriteStream(logPath, { flags: 'a' });
        logStream.write(`--- Log session started at ${new Date().toISOString()} ---\n`);
        mainLogger.info(`Logging to file: ${logPath}`);
    };

    if (logStream) {
        logStream.end('--- Previous log session ended ---\n', () => {
            logStream = null;
            initNewStream();
        });
    } else {
        initNewStream();
    }
});

ipcMain.on('log-to-file-close', () => {
    if (logStream) {
        logStream.end(`--- Log session ended at ${new Date().toISOString()} ---\n`, () => {
            logStream = null;
            mainLogger.info('Stopped logging to file.');
        });
    }
});

ipcMain.on('log-to-file-write', (event, log: DebugLogEntry) => {
    if (logStream) {
        const dataStr = log.data ? `\n\tData: ${JSON.stringify(log.data, null, 2).replace(/\n/g, '\n\t')}` : '';
        logStream.write(`[${new Date(log.timestamp).toISOString()}][${log.level}] [Renderer] ${log.message}${dataStr}\n`);
    }
});

// --- Settings Import/Export Handlers ---
ipcMain.handle('export-settings', async (): Promise<{ success: boolean; filePath?: string; error?: string; canceled?: boolean }> => {
  if (!mainWindow) return { success: false, error: 'Main window not available' };
  
  try {
    const data = await fs.readFile(settingsPath, 'utf-8');
    
    const zip = new JSZip();
    zip.file('settings.json', data);
    
    const content = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Settings',
      defaultPath: `git-automation-dashboard-settings-${new Date().toISOString().split('T')[0]}.zip`,
      filters: [{ name: 'Zip Archives', extensions: ['zip'] }]
    });

    if (canceled || !filePath) {
      return { success: false, canceled: true };
    }
    
    await fs.writeFile(filePath, content);
    
    return { success: true, filePath };
  } catch (error: any) {
    mainLogger.error('Failed to export settings:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('import-settings', async (): Promise<{ success: boolean; error?: string; canceled?: boolean }> => {
  if (!mainWindow) return { success: false, error: 'Main window not available' };
  
  try {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      title: 'Import Settings',
      properties: ['openFile'],
      filters: [{ name: 'Settings Files', extensions: ['zip', 'json'] }]
    });
    
    if (canceled || filePaths.length === 0) {
      return { success: false, canceled: true };
    }
    
    const filePath = filePaths[0];
    let settingsContent = '';

    if (filePath.toLowerCase().endsWith('.zip')) {
        const zipData = await fs.readFile(filePath);
        const zip = await JSZip.loadAsync(zipData);
        const settingsFile = zip.file('settings.json');
        
        if (!settingsFile) {
          return { success: false, error: 'The selected zip file does not contain a "settings.json" file.' };
        }
        settingsContent = await settingsFile.async('string');
    } else if (filePath.toLowerCase().endsWith('.json')) {
        settingsContent = await fs.readFile(filePath, 'utf-8');
    } else {
        return { success: false, error: 'Unsupported file type. Please select a .zip or .json file.' };
    }
    
    // Validate JSON before writing
    try {
      const parsed = JSON.parse(settingsContent);
       if (typeof parsed.globalSettings === 'undefined' || typeof parsed.repositories === 'undefined') {
        return { success: false, error: 'The imported settings file is missing required "globalSettings" or "repositories" keys.' };
      }
    } catch (e) {
      return { success: false, error: 'The selected file is not valid JSON.' };
    }
    
    await fs.writeFile(settingsPath, settingsContent, 'utf-8');
    
    return { success: true };
  } catch (error: any) {
    mainLogger.error('Failed to import settings:', error);
    return { success: false, error: error.message };
  }
});

// --- Task Log IPC Handlers ---
ipcMain.handle('get-task-log-path', async () => {
  const settings = await readSettings();
  return settings.taskLogPath || path.join(userDataPath, 'task-logs');
});

ipcMain.handle('open-task-log-path', async () => {
  const settings = await readSettings();
  const logPath = settings.taskLogPath || path.join(userDataPath, 'task-logs');
  await fs.mkdir(logPath, { recursive: true }); // Ensure it exists before opening
  shell.openPath(logPath);
});

ipcMain.handle('select-task-log-path', async () => {
  if (!mainWindow) return { canceled: true, path: null };
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'Select Directory to Store Task Logs'
  });
  if (result.canceled || result.filePaths.length === 0) {
    return { canceled: true, path: null };
  }
  return { canceled: false, path: result.filePaths[0] };
});


// --- GitHub Release Management ---

// Helper to parse owner/repo from various git URLs
const parseGitHubUrl = (url: string): { owner: string; repo: string } | null => {
    if (!url) return null;
    // HTTPS: https://github.com/owner/repo.git
    let match = url.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
    if (match) {
      return { owner: match[1], repo: match[2] };
    }
    // SSH: git@github.com:owner/repo.git
    match = url.match(/git@github\.com:([^/]+)\/([^/.]+)/);
    if (match) {
      return { owner: match[1], repo: match[2] };
    }
    return null;
  };
  

ipcMain.handle('get-latest-release', async (event, repo: Repository): Promise<ReleaseInfo | null> => {
    const settings = await readSettings();
    if (!settings.githubPat) {
        // Don't throw, just return null so the UI can show a "token needed" message.
        mainLogger.warn(`[GitHub] Cannot fetch releases for ${repo.name}: GitHub PAT not set.`);
        return null;
    }
    
    const ownerRepo = parseGitHubUrl(repo.remoteUrl);
    if (!ownerRepo) {
        mainLogger.warn(`[GitHub] Could not parse owner/repo from URL: ${repo.remoteUrl}`);
        return null;
    }

    const { owner, repo: repoName } = ownerRepo;
    // Fetch a list of releases instead of just the latest one to apply logic.
    // The API sorts by creation date descending, so the first one is the newest.
    const apiUrl = `https://api.github.com/repos/${owner}/${repoName}/releases`;

    try {
        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `token ${settings.githubPat}`,
                'Accept': 'application/vnd.github.v3+json',
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });

        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(`GitHub API error (${response.status}): ${errorBody.message || 'Unknown error'}`);
        }
        
        const allReleases = await response.json();

        if (!allReleases || allReleases.length === 0) {
            mainLogger.info(`[GitHub] No releases found for ${owner}/${repoName}.`);
            return null;
        }

        // Find the latest release to display.
        // We always show the latest release if it's a draft.
        // Otherwise, we respect the 'allowPrerelease' setting.
        const latestRelease = allReleases.find((release: any) => {
            if (release.draft) {
                return true; // Always include drafts if they are visible via API
            }
            if (!settings.allowPrerelease && release.prerelease) {
                return false; // Skip if it's a pre-release and the setting is off
            }
            return true; // It's a full, published release
        });
        
        if (!latestRelease) {
            mainLogger.info(`[GitHub] No releases found for ${owner}/${repoName} that match settings (e.g., allowPrerelease).`);
            return null;
        }

        return {
            id: latestRelease.id,
            tagName: latestRelease.tag_name,
            name: latestRelease.name,
            body: latestRelease.body,
            isDraft: latestRelease.draft,
            isPrerelease: latestRelease.prerelease,
            url: latestRelease.html_url,
            createdAt: latestRelease.created_at,
        };
    } catch (error: any) {
        mainLogger.error(`[GitHub] Failed to fetch latest release for ${owner}/${repoName}:`, error);
        // It's better to return null and let the UI handle it than to crash.
        return null; 
    }
});

ipcMain.handle('get-all-releases', async (event, repo: Repository): Promise<ReleaseInfo[] | null> => {
    const settings = await readSettings();
    if (!settings.githubPat) {
        mainLogger.warn(`[GitHub] Cannot fetch releases for ${repo.name}: GitHub PAT not set.`);
        return null;
    }
    const ownerRepo = parseGitHubUrl(repo.remoteUrl);
    if (!ownerRepo) {
        mainLogger.warn(`[GitHub] Could not parse owner/repo from URL: ${repo.remoteUrl}`);
        return null;
    }

    const { owner, repo: repoName } = ownerRepo;
    const apiUrl = `https://api.github.com/repos/${owner}/${repoName}/releases`;

    try {
        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `token ${settings.githubPat}`,
                'Accept': 'application/vnd.github.v3+json',
                'X-GitHub-Api-Version': '2022-11-28'
            }
        });

        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(`GitHub API error (${response.status}): ${errorBody.message || 'Unknown error'}`);
        }
        
        const allReleases = await response.json();
        if (!allReleases) return [];

        return allReleases.map((release: any) => ({
            id: release.id,
            tagName: release.tag_name,
            name: release.name,
            body: release.body,
            isDraft: release.draft,
            isPrerelease: release.prerelease,
            url: release.html_url,
            createdAt: release.created_at,
        }));
    } catch (error: any) {
        mainLogger.error(`[GitHub] Failed to fetch all releases for ${owner}/${repoName}:`, error);
        return null;
    }
});

ipcMain.handle('update-release', async (event, { repo, releaseId, options }: { repo: Repository, releaseId: number, options: Partial<ReleaseInfo> }): Promise<{ success: boolean; error?: string }> => {
    const settings = await readSettings();
    if (!settings.githubPat) return { success: false, error: 'GitHub PAT not set.' };
    
    const ownerRepo = parseGitHubUrl(repo.remoteUrl);
    if (!ownerRepo) return { success: false, error: 'Could not parse owner/repo from URL.' };

    const { owner, repo: repoName } = ownerRepo;
    const apiUrl = `https://api.github.com/repos/${owner}/${repoName}/releases/${releaseId}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${settings.githubPat}`,
                'Accept': 'application/vnd.github.v3+json',
                'X-GitHub-Api-Version': '2022-11-28'
            },
            body: JSON.stringify(options),
        });

        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(`GitHub API error (${response.status}): ${errorBody.message || 'Unknown error'}`);
        }
        return { success: true };
    } catch (error: any) {
        mainLogger.error(`[GitHub] Failed to update release ${releaseId}:`, error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('create-release', async (event, { repo, options }: { repo: Repository, options: { tag_name: string, name: string, body: string, draft: boolean, prerelease: boolean } }): Promise<{ success: boolean; error?: string }> => {
    const settings = await readSettings();
    if (!settings.githubPat) return { success: false, error: 'GitHub PAT not set.' };
    
    const ownerRepo = parseGitHubUrl(repo.remoteUrl);
    if (!ownerRepo) return { success: false, error: 'Could not parse owner/repo from URL.' };

    const { owner, repo: repoName } = ownerRepo;
    const apiUrl = `https://api.github.com/repos/${owner}/${repoName}/releases`;

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': `token ${settings.githubPat}`,
                'Accept': 'application/vnd.github.v3+json',
                'X-GitHub-Api-Version': '2022-11-28'
            },
            body: JSON.stringify(options),
        });

        if (!response.ok) {
            const errorBody = await response.json();
            let errorMessage = errorBody.message || 'Unknown error';
            if (errorBody.errors) {
                errorMessage += ' ' + errorBody.errors.map((e: any) => e.message || e.code).join(', ');
            }
            throw new Error(`GitHub API error (${response.status}): ${errorMessage}`);
        }
        return { success: true };
    } catch (error: any) {
        mainLogger.error(`[GitHub] Failed to create release:`, error);
        return { success: false, error: error.message };
    }
});


ipcMain.handle('delete-release', async (event, { repo, releaseId }: { repo: Repository, releaseId: number }): Promise<{ success: boolean; error?: string }> => {
    const settings = await readSettings();
    if (!settings.githubPat) return { success: false, error: 'GitHub PAT not set.' };
    
    const ownerRepo = parseGitHubUrl(repo.remoteUrl);
    if (!ownerRepo) return { success: false, error: 'Could not parse owner/repo from URL.' };

    const { owner, repo: repoName } = ownerRepo;
    const apiUrl = `https://api.github.com/repos/${owner}/${repoName}/releases/${releaseId}`;

    try {
        const response = await fetch(apiUrl, {
            method: 'DELETE',
            headers: {
                'Authorization': `token ${settings.githubPat}`,
                'Accept': 'application/vnd.github.v3+json',
                'X-GitHub-Api-Version': '2022-11-28'
            },
        });

        if (response.status !== 204) { // 204 No Content is success for DELETE
            const errorBody = await response.json();
            throw new Error(`GitHub API error (${response.status}): ${errorBody.message || 'Unknown error'}`);
        }
        return { success: true };
    } catch (error: any) {
        mainLogger.error(`[GitHub] Failed to delete release ${releaseId}:`, error);
        return { success: false, error: error.message };
    }
});