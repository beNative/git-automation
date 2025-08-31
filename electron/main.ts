// Fix: Added a triple-slash directive to reference Node.js types. This resolves errors where TypeScript couldn't find Node.js globals like `require` and `__dirname`.
/// <reference types="node" />

import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { platform } from 'os';
import { autoUpdater } from 'electron-updater';
import { spawn, exec } from 'child_process';
import type { Repository, TaskStep, GlobalSettings, ProjectSuggestion } from '../types';
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

// --- IPC Handler for project configuration suggestions ---
ipcMain.handle('get-project-suggestions', async (event, { repoPath, repoName }: { repoPath: string; repoName: string }): Promise<ProjectSuggestion[]> => {
  if (!repoPath) return [];

  const suggestions: ProjectSuggestion[] = [];
  const addSuggestion = (suggestion: Omit<ProjectSuggestion, 'group'>, group: string) => {
    suggestions.push({ ...suggestion, group });
  };
  
  const fileExists = async (fileName: string) => {
      try {
        await fs.access(path.join(repoPath, fileName));
        return true;
      } catch {
        return false;
      }
  }

  // 1. package.json scripts
  if (await fileExists('package.json')) {
      try {
        const pkg = JSON.parse(await fs.readFile(path.join(repoPath, 'package.json'), 'utf-8'));
        if (pkg && pkg.scripts && typeof pkg.scripts === 'object') {
          for (const scriptName of Object.keys(pkg.scripts)) {
            addSuggestion({ label: `npm run ${scriptName}`, value: `npm run ${scriptName}` }, 'Detected NPM Scripts');
            addSuggestion({ label: `yarn ${scriptName}`, value: `yarn ${scriptName}` }, 'Detected Yarn Scripts');
          }
        }
      } catch (e) { /* ignore */ }
  }

  // 2. Docker
  if (await fileExists('Dockerfile')) {
    const imageName = repoName.toLowerCase().replace(/[^a-z0-9_.-]/g, '-');
    addSuggestion({ label: `Build Docker image '${imageName}'`, value: `docker build -t ${imageName} .` }, 'Detected Docker Commands');
    addSuggestion({ label: `Run Docker image '${imageName}'`, value: `docker run ${imageName}` }, 'Detected Docker Commands');
  }

  // 3. docker-compose.yml
  if (await fileExists('docker-compose.yml')) {
    addSuggestion({ label: `Docker Compose Up`, value: `docker-compose up -d` }, 'Detected Docker Compose');
    addSuggestion({ label: `Docker Compose Down`, value: `docker-compose down` }, 'Detected Docker Compose');
  }

  // 4. Makefile
  if (await fileExists('Makefile')) {
      try {
        const content = await fs.readFile(path.join(repoPath, 'Makefile'), 'utf-8');
        const regex = /^([a-zA-Z0-9/_-]+):/gm;
        let match;
        const targets = new Set<string>();
        while ((match = regex.exec(content)) !== null) {
          const target = match[1];
          if (target && !target.startsWith('.') && target !== 'PHONY') {
            targets.add(target);
          }
        }
        for (const target of targets) {
          addSuggestion({ label: `make ${target}`, value: `make ${target}` }, 'Detected Makefile Targets');
        }
      } catch (e) { /* ignore */ }
  }
  
  // 5. Python
  if (await fileExists('requirements.txt')) {
      addSuggestion({ label: `Install Python dependencies`, value: `pip install -r requirements.txt` }, 'Detected Python Tools');
  }
  if (await fileExists('pytest.ini') || await fileExists('pyproject.toml')) {
      addSuggestion({ label: `Run Python tests`, value: `pytest` }, 'Detected Python Tools');
  }

  // 6. Go
  if (await fileExists('go.mod')) {
      addSuggestion({ label: `Build Go project`, value: `go build ./...` }, 'Detected Go Tools');
      addSuggestion({ label: `Test Go project`, value: `go test ./...` }, 'Detected Go Tools');
  }

  // 7. Java (Maven)
  if (await fileExists('pom.xml')) {
      addSuggestion({ label: `Build with Maven`, value: `mvn clean install` }, 'Detected Java Tools');
  }
  
  // 8. Java (Gradle)
  if (await fileExists('build.gradle') || await fileExists('build.gradle.kts')) {
      const gradlew = await fileExists('gradlew') ? './gradlew' : 'gradle';
      addSuggestion({ label: `Build with Gradle`, value: `${gradlew} build` }, 'Detected Java Tools');
  }

  return suggestions;
});

// --- IPC Handler for suggesting a whole workflow ---
ipcMain.handle('get-project-step-suggestions', async (event, { repoPath, repoName }: { repoPath: string, repoName: string }): Promise<Omit<TaskStep, 'id'>[]> => {
    const suggestions: Omit<TaskStep, 'id'>[] = [];
    const fileExists = async (fileName: string) => {
        try {
            await fs.access(path.join(repoPath, fileName));
            return true;
        } catch { return false; }
    };
    
    // Check for .git directory for git-related steps
    if (await fileExists('.git')) {
        suggestions.push({ type: TaskStepType.GitPull, enabled: true });
    }

    // Check for package manager
    if (await fileExists('package.json')) {
        suggestions.push({ type: TaskStepType.InstallDeps, enabled: true });
        try {
            const pkg = JSON.parse(await fs.readFile(path.join(repoPath, 'package.json'), 'utf-8'));
            if (pkg.scripts?.test) {
                suggestions.push({ type: TaskStepType.RunTests, enabled: true });
            }
            if (pkg.scripts?.build) {
                suggestions.push({ type: TaskStepType.RunCommand, command: 'npm run build', enabled: true });
            }
        } catch (e) { /* ignore malformed json */ }
    }
    
    // Check for Dockerfile
    if (await fileExists('Dockerfile')) {
        const imageName = repoName.toLowerCase().replace(/[^a-z0-9_.-]/g, '-');
        suggestions.push({ type: TaskStepType.RunCommand, command: `docker build -t ${imageName} .`, enabled: true });
    }

    return suggestions;
});

// --- IPC handler for checking git status ---
ipcMain.handle('check-git-status', async (event, repoPath: string): Promise<{ isDirty: boolean; output: string }> => {
    return new Promise((resolve) => {
        exec('git status --porcelain', { cwd: repoPath }, (error, stdout, stderr) => {
            if (error) {
                // If the command fails (e.g., not a git repo), consider it not dirty.
                resolve({ isDirty: false, output: stderr });
                return;
            }
            const isDirty = stdout.trim().length > 0;
            resolve({ isDirty, output: stdout });
        });
    });
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
        case TaskStepType.GitFetch:
            command = 'git';
            args = ['fetch'];
            break;
        case TaskStepType.GitCheckout:
            if (!step.branch) {
                sendLog('Skipping checkout: no branch specified.', LogLevel.Warn);
                sendEnd(0);
                return;
            }
            command = 'git';
            args = ['checkout', step.branch];
            break;
        case TaskStepType.GitStash:
            command = 'git';
            args = ['stash'];
            break;
        case TaskStepType.InstallDeps:
            command = settings.defaultPackageManager;
            args = ['install'];
            break;
        case TaskStepType.RunTests:
            command = settings.defaultPackageManager;
            args = ['test'];
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