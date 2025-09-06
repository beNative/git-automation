import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import path, { dirname } from 'path';
import fs from 'fs/promises';
import os, { platform } from 'os';
import { spawn, exec, execFile } from 'child_process';
import type { Repository, TaskStep, GlobalSettings, ProjectSuggestion, LocalPathState, DetailedStatus, VcsFileStatus, Commit, BranchInfo, DebugLogEntry, VcsType, PythonCapabilities, ProjectInfo, DelphiCapabilities, DelphiProject, NodejsCapabilities, LazarusCapabilities, LazarusProject } from '../types';
import { TaskStepType, LogLevel, VcsType as VcsTypeEnum } from '../types';
import fsSync from 'fs';


declare const require: (id: string) => any;
declare const __dirname: string;
declare class Buffer {
    toString(encoding?: string): string;
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

// --- Portable App Data Path ---
const getAppDataPath = () => {
  // For portable app behavior, store data next to the executable in production.
  // In development, continue using the default userData path to avoid cluttering the project root.
  return app.isPackaged ? path.dirname(app.getPath('exe')) : app.getPath('userData');
};

let mainWindow: BrowserWindow | null = null;
let logStream: fsSync.WriteStream | null = null;

const getLogFilePath = () => {
  const now = new Date();
  const timestamp = now.toISOString().replace(/:/g, '-').replace(/\..+/, '');
  const logDir = path.join(getAppDataPath(), 'logs');
  return path.join(logDir, `git-automation-dashboard-log-${timestamp}.log`);
};

const settingsPath = path.join(getAppDataPath(), 'settings.json');

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
  // Ensure logs directory exists before creating a window or log file
  const logDir = path.join(getAppDataPath(), 'logs');
  fs.mkdir(logDir, { recursive: true }).catch(err => {
      console.error("Could not create logs directory.", err);
  });
  createWindow();
});

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (logStream) {
    logStream.write(`--- Log session ended by app quit at ${new Date().toISOString()} ---\n`);
    logStream.end();
    logStream = null;
  }
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

// --- IPC Handler for fetching app version ---
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});


// --- IPC Handlers for Settings ---
ipcMain.handle('get-all-data', async () => {
  try {
    const data = await fs.readFile(settingsPath, 'utf-8');
    return JSON.parse(data);
  } catch (error: any) {
    // If file doesn't exist or is invalid, return empty structure
    if (error.code === 'ENOENT') {
      return { globalSettings: null, repositories: [] };
    }
    console.error("Failed to read settings file:", error);
    return { globalSettings: null, repositories: [] };
  }
});

ipcMain.on('save-all-data', async (event, data: { globalSettings: GlobalSettings, repositories: Repository[] }) => {
    try {
        await fs.writeFile(settingsPath, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error("Failed to save settings file:", error);
    }
});

ipcMain.handle('get-raw-settings-json', async () => {
  try {
    const data = await fs.readFile(settingsPath, 'utf-8');
    return data;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // If file doesn't exist, return a prettified empty structure.
      return JSON.stringify({ globalSettings: null, repositories: [] }, null, 2);
    }
    console.error("Failed to read settings file:", error);
    throw error; // Let the renderer handle the error
  }
});

ipcMain.handle('show-settings-file', () => {
  shell.showItemInFolder(settingsPath);
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
    console.error(`Failed to read doc: ${docName}`, error);
    return `# Error\n\nCould not load document: ${docName}.`;
  }
});

// --- Helper function for recursive file search ---
const findFilesByExtensionRecursive = async (
  dir: string,
  ext: string,
  repoRoot: string,
  depth = 0,
  maxDepth = 3 // Limit search depth to avoid performance issues
): Promise<string[]> => {
  let results: string[] = [];
  try {
    if (depth > maxDepth) return [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        // Avoid heavy/irrelevant directories
        if (entry.name !== 'node_modules' && entry.name !== '.git' && entry.name !== '.svn' && !entry.name.startsWith('.')) {
          results = results.concat(await findFilesByExtensionRecursive(fullPath, ext, repoRoot, depth + 1, maxDepth));
        }
      } else if (entry.name.toLowerCase().endsWith(ext)) {
        results.push(path.relative(repoRoot, fullPath));
      }
    }
  } catch (err) {
    // Ignore errors for directories that can't be read (e.g., permissions)
  }
  return results;
};

// --- Helper function for finding files by patterns like "jest.config" ---
const findFileByPattern = async (
    dir: string,
    patterns: string[],
    repoRoot: string,
    depth = 0,
    maxDepth = 2
): Promise<string[]> => {
    let results: string[] = [];
    if (depth > maxDepth) return [];
    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
                    results = results.concat(await findFileByPattern(fullPath, patterns, repoRoot, depth + 1, maxDepth));
                }
            } else if (patterns.some(p => entry.name.startsWith(p))) {
                results.push(path.relative(repoRoot, fullPath));
            }
        }
    } catch (err) {}
    return results;
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

// FIX: Extracted project info logic into a reusable function to fix type errors and allow direct calls from other handlers.
const getProjectInfo = async (repoPath: string): Promise<ProjectInfo> => {
    if (!repoPath) return { tags: [], files: {}, python: undefined, delphi: undefined, nodejs: undefined };

    const tagsSet = new Set<string>();
    const info: ProjectInfo = {
        tags: [],
        files: { dproj: [] },
        python: undefined,
        delphi: undefined,
        nodejs: undefined,
        lazarus: undefined,
    };

    try {
        // VCS Type
        if (await fileExists(repoPath, '.git')) tagsSet.add('git');
        if (await fileExists(repoPath, '.svn')) tagsSet.add('svn');

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
            } catch (e) { console.error(`Could not parse Lazarus project: ${lpi}`, e); }
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
            } catch (e) { console.error(`Could not parse Delphi project: ${dproj}`, e); }
        }

        delphiCaps.packaging.innoSetup = await findFilesByExtensionRecursive(repoPath, '.iss', repoPath);
        delphiCaps.packaging.nsis = await findFilesByExtensionRecursive(repoPath, '.nsi', repoPath);
        delphiCaps.packageManagers.boss = await fileExists(repoPath, 'boss.json');
        
        if (isDelphiProject) {
            tagsSet.add('delphi');
            info.delphi = delphiCaps;
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
            } catch (e) { console.error('Could not parse package.json', e); }
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
        console.error(`Error getting project info for ${repoPath}:`, error);
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

// --- IPC handler for checking git/svn status ---
ipcMain.handle('check-vcs-status', async (event, repo: Repository): Promise<{ isDirty: boolean; output: string; untrackedFiles: string[]; changedFiles: string[] }> => {
    const command = repo.vcs === VcsTypeEnum.Git ? 'git status --porcelain' : 'svn status';
    
    // This feature is Git-specific. For SVN, return a simplified structure.
    if (repo.vcs !== VcsTypeEnum.Git) {
      return new Promise((resolve) => {
          exec(command, { cwd: repo.localPath }, (error, stdout, stderr) => {
              if (error) {
                  resolve({ isDirty: false, output: stderr, untrackedFiles: [], changedFiles: [] });
                  return;
              }
              const output = stdout.trim();
              const isDirty = output.length > 0;
              resolve({ isDirty, output, untrackedFiles: [], changedFiles: isDirty ? [output] : [] });
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
                    } else {
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
        const gitignorePath = path.join(repo.localPath, '.gitignore');
        
        // Ensure .gitignore exists
        try {
            await fs.access(gitignorePath);
        } catch {
            await fs.writeFile(gitignorePath, '', 'utf-8');
        }

        const contentToAppend = '\n# Added by Git Automation Dashboard\n' + filesToIgnore.join('\n') + '\n';
        await fs.appendFile(gitignorePath, contentToAppend, 'utf-8');
        
        await execAsync('git add .gitignore', { cwd: repo.localPath });
        await execAsync('git commit -m "chore: Update .gitignore"', { cwd: repo.localPath });
        await execAsync('git push', { cwd: repo.localPath });
        
        return { success: true };
    } catch (e: any) {
        console.error('Failed to ignore files and push:', e);
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
  
      if (vcs === VcsTypeEnum.Git) {
        const { stdout } = await execAsync('git config --get remote.origin.url', { cwd: localPath });
        const url = stdout.trim();
        if (!url) {
          return { url: null, error: 'Could not find remote "origin" URL.' };
        }
        return { url };
      } else if (vcs === VcsTypeEnum.Svn) {
        const { stdout } = await execAsync('svn info --show-item url', { cwd: localPath });
        const url = stdout.trim();
        if (!url) {
          return { url: null, error: 'Could not determine repository URL from SVN info.' };
        }
        return { url };
      } else {
        return { url: null, error: `Unsupported VCS type: ${vcs}` };
      }
    } catch (e: any) {
      console.error(`Error discovering remote URL for ${localPath}:`, e);
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
    console.error(`Failed to open path: ${localPath}`, error);
    return { success: false, error: error.message };
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
        console.warn("x-terminal-emulator failed, trying gnome-terminal", e);
        try {
          await tryTerminal('gnome-terminal', [`--`, 'bash', `-c`, finalShellCommand]);
          return { success: true };
        } catch (e2) {
          console.error("gnome-terminal also failed", e2);
          return { success: false, error: "Could not find a supported terminal. Tried 'x-terminal-emulator' and 'gnome-terminal'." };
        }
      }
    }
  } catch (error: any) {
    console.error('Failed to prepare terminal command:', error);
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


// --- IPC handler for cloning a repo ---
ipcMain.on('clone-repository', (event, { repo, executionId }: { repo: Repository, executionId: string }) => {
    const sender = mainWindow?.webContents.send.bind(mainWindow.webContents);
    if (!sender) return;

    const sendLog = (message: string, level: LogLevel) => {
        sender('task-log', { executionId, message, level });
    };
    const sendEnd = (exitCode: number) => {
        sender('task-step-end', { executionId, exitCode });
    };

    let command: string;
    let args: string[];
    let verb = '';

    if (repo.vcs === VcsTypeEnum.Git) {
        verb = 'Clone';
        command = 'git';
        args = ['clone', repo.remoteUrl, repo.localPath];
    } else if (repo.vcs === VcsTypeEnum.Svn) {
        verb = 'Checkout';
        command = 'svn';
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
            shell: true,
        });

        const stdoutLogger = createLineLogger(executionId, LogLevel.Info, sender);
        const stderrLogger = createLineLogger(executionId, LogLevel.Info, sender);

        child.stdout.on('data', stdoutLogger.process);
        child.stderr.on('data', stderrLogger.process);
        child.on('error', (err) => sendLog(`Spawn error: ${err.message}`, LogLevel.Error));
        child.on('close', (code) => {
            stdoutLogger.flush();
            stderrLogger.flush();
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

// --- Promise-based command executor ---
function executeCommand(cwd: string, fullCommand: string, sender: (channel: string, ...args: any[]) => void, executionId: string): Promise<number> {
    return new Promise((resolve, reject) => {
        sender('task-log', { executionId, message: `$ ${fullCommand}`, level: LogLevel.Command });
        
        const child = spawn(fullCommand, [], { cwd, shell: true });

        const stdoutLogger = createLineLogger(executionId, LogLevel.Info, sender);
        const stderrLogger = createLineLogger(executionId, LogLevel.Info, sender);

        child.stdout.on('data', stdoutLogger.process);
        child.stderr.on('data', stderrLogger.process);
        child.on('error', (err) => sender('task-log', { executionId, message: `Spawn error: ${err.message}`, level: LogLevel.Error }));
        
        child.on('close', (code) => {
            stdoutLogger.flush();
            stderrLogger.flush();
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
ipcMain.on('run-task-step', async (event, { repo, step, settings, executionId }: { repo: Repository; step: TaskStep; settings: GlobalSettings; executionId: string; }) => {
    const sender = mainWindow?.webContents.send.bind(mainWindow.webContents);
    if (!sender) return;

    const sendLog = (message: string, level: LogLevel) => {
        sender('task-log', { executionId, message, level });
    };
    const sendEnd = (exitCode: number) => {
        sender('task-step-end', { executionId, exitCode });
    };

    try {
        const projectInfo = await getProjectInfo(repo.localPath);

        const run = (cmd: string) => executeCommand(repo.localPath, cmd, sender, executionId);

        switch(step.type) {
            // Git Steps
            case TaskStepType.GitPull: await run('git pull'); break;
            case TaskStepType.GitFetch: await run('git fetch'); break;
            case TaskStepType.GitCheckout:
                if (!step.branch) { sendLog('Skipping checkout: no branch specified.', LogLevel.Warn); sendEnd(0); return; }
                await run(`git checkout ${step.branch}`); break;
            case TaskStepType.GitStash: await run('git stash'); break;
            // SVN Steps
            case TaskStepType.SvnUpdate: await run('svn update'); break;
            // Common Steps
            case TaskStepType.RunCommand:
                if (!step.command) { sendLog('Skipping empty command.', LogLevel.Warn); sendEnd(0); return; }
                await run(step.command); break;
            
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
                await run(`call rsvars.bat && msbuild "${projectFile}" /t:${mode} /p:Configuration=${config} /p:Platform=${platform}`);
                break;
            case TaskStepType.DELPHI_PACKAGE_INNO:
                const issFile = step.delphiInstallerScript || projectInfo.delphi?.packaging.innoSetup[0];
                if (!issFile) throw new Error('No Inno Setup script (.iss) file found or specified.');
                const issDefines = (step.delphiInstallerDefines || '').split(';').filter(d => d.trim()).map(d => `/d${d.trim()}`).join(' ');
                await run(`call rsvars.bat && iscc "${issFile}" ${issDefines}`);
                break;
            case TaskStepType.DELPHI_PACKAGE_NSIS:
                const nsiFile = step.delphiInstallerScript || projectInfo.delphi?.packaging.nsis[0];
                if (!nsiFile) throw new Error('No NSIS script (.nsi) file found or specified.');
                const nsiDefines = (step.delphiInstallerDefines || '').split(';').filter(d => d.trim()).map(d => `/D${d.trim()}`).join(' ');
                await run(`call rsvars.bat && makensis ${nsiDefines} "${nsiFile}"`);
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
            default:
                throw new Error(`Unknown step type: ${step.type}`);
        }

        sendEnd(0);
    } catch (error: any) {
        sendLog(`Error during step '${step.type}': ${error.message}`, LogLevel.Error);
        sendEnd(typeof error === 'number' ? error : 1);
    }
});




// =================================================================
// --- NEW IPC Handlers for Deep VCS Integration ---
// =================================================================

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

// --- Get Detailed Status ---
ipcMain.handle('get-detailed-vcs-status', async (event, repo: Repository): Promise<DetailedStatus | null> => {
  try {
    if (repo.vcs === VcsTypeEnum.Git) {
      try {
        // Fetch updates from all remotes without changing local branches
        await execAsync('git remote update', { cwd: repo.localPath });
      } catch (fetchError: any) {
        // Log the error but continue, as status can still be useful with stale data
        console.warn(`'git remote update' failed for ${repo.name}. Status may be stale. Error: ${fetchError.stderr || fetchError.message}`);
      }
      const { stdout } = await execAsync('git status --porcelain=v2 --branch', { cwd: repo.localPath });
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
      const { stdout } = await execAsync('svn status -u', { cwd: repo.localPath });
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
    console.error(`Error getting detailed status for ${repo.name}:`, error);
    return null;
  }
});


// --- Get Commit History (Git only) ---
ipcMain.handle('get-commit-history', async (event, repoPath: string, skipCount?: number, searchQuery?: string): Promise<Commit[]> => {
    try {
        const SEPARATOR = '_||_';
        const format = `%H${SEPARATOR}%h${SEPARATOR}%an${SEPARATOR}%ar${SEPARATOR}%B`;
        const skip = skipCount && Number.isInteger(skipCount) && skipCount > 0 ? `--skip=${skipCount}` : '';
        
        // Basic sanitization for the search query to be used with --grep
        const search = searchQuery ? `--grep="${searchQuery.replace(/"/g, '\\"')}" -i --all-match` : '';
        
        // Use -z to separate commits with a NUL character, as messages can contain newlines
        const { stdout } = await execAsync(`git log --pretty=format:"${format}" -z -n 100 ${skip} ${search}`, { cwd: repoPath });
        
        if (!stdout) return [];
        
        // Split by NUL character, and filter out any empty strings that might result from a trailing NUL
        return stdout.split('\0').filter(line => line.trim() !== '').map(line => {
            const parts = line.split(SEPARATOR);
            const hash = parts[0];
            const shortHash = parts[1];
            const author = parts[2];
            const date = parts[3];
            // The rest of the parts form the message.
            const message = parts.slice(4).join(SEPARATOR);
            return { hash, shortHash, author, date, message: message || '' };
        });
    } catch (e: any) {
        console.error(`Failed to get commit history for ${repoPath} (search: "${searchQuery}"):`, e.message);
        // If git log fails (e.g., on an empty repository), it will throw.
        // In this case, we want to return an empty array, not crash the app.
        return [];
    }
});


// --- List Branches (Git only) ---
ipcMain.handle('list-branches', async (event, repoPath: string): Promise<BranchInfo> => {
    try {
        const { stdout } = await execAsync('git branch -a', { cwd: repoPath });
        const branches: BranchInfo = { local: [], remote: [], current: null };
        stdout.split('\n').forEach(line => {
            line = line.trim();
            if (!line) return;
            const isCurrent = line.startsWith('* ');
            const branchName = isCurrent ? line.substring(2) : line;
            if (isCurrent) branches.current = branchName;

            if (branchName.startsWith('remotes/')) {
                 if (!branchName.includes('->')) {
                    branches.remote.push(branchName.substring(8));
                }
            } else {
                branches.local.push(branchName);
            }
        });
        return branches;
    } catch (e) {
        return { local: [], remote: [], current: null };
    }
});

const simpleGitCommand = async (repoPath: string, command: string): Promise<{ success: boolean; error?: string }> => {
    try {
        await execAsync(command, { cwd: repoPath });
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.stderr || e.message };
    }
};

ipcMain.handle('checkout-branch', (e, repoPath: string, branch: string) => {
    // If branch contains '/', it's from the remote list e.g. 'origin/main'
    // If it doesn't, it's from the local list e.g. 'main'
    if (branch.includes('/')) {
        // This is for checking out a new local branch tracking a remote one.
        // `git checkout --track origin/main` creates a local branch 'main' and checks it out.
        return simpleGitCommand(repoPath, `git checkout --track ${branch}`);
    }
    // This is for switching to an existing local branch
    return simpleGitCommand(repoPath, `git checkout ${branch}`);
});
ipcMain.handle('create-branch', (e, repoPath: string, branch: string) => simpleGitCommand(repoPath, `git checkout -b ${branch}`));
ipcMain.handle('delete-branch', (e, repoPath: string, branch: string, isRemote: boolean) => {
    if (isRemote) {
        const remoteName = 'origin'; // This is a simplification
        return simpleGitCommand(repoPath, `git push ${remoteName} --delete ${branch}`);
    } else {
        return simpleGitCommand(repoPath, `git branch -d ${branch}`);
    }
});
ipcMain.handle('merge-branch', (e, repoPath: string, branch: string) => simpleGitCommand(repoPath, `git merge ${branch}`));


// --- Log to file handlers ---
ipcMain.on('log-to-file-init', () => {
    const initNewStream = () => {
        const logPath = getLogFilePath();
        logStream = fsSync.createWriteStream(logPath, { flags: 'a' });
        logStream.write(`--- Log session started at ${new Date().toISOString()} ---\n`);
        console.log(`Logging to file: ${logPath}`);
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
            console.log('Stopped logging to file.');
        });
    }
});

ipcMain.on('log-to-file-write', (event, log: DebugLogEntry) => {
    if (logStream) {
        const dataStr = log.data ? `\n\tData: ${JSON.stringify(log.data, null, 2).replace(/\n/g, '\n\t')}` : '';
        logStream.write(`[${new Date(log.timestamp).toISOString()}][${log.level}] ${log.message}${dataStr}\n`);
    }
});
