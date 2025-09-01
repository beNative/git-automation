import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import path, { dirname } from 'path';
import fs from 'fs/promises';
import os, { platform } from 'os';
import { autoUpdater } from 'electron-updater';
import { spawn, exec, execFile } from 'child_process';
import type { Repository, TaskStep, GlobalSettings, ProjectSuggestion, LocalPathState, UpdateStatus, DetailedStatus, VcsFileStatus, Commit, BranchInfo } from '../types';
import { TaskStepType, LogLevel, VcsType } from '../types';

// Fix: Manually declare Node.js globals to resolve type errors when @types/node is not available.
declare const require: (id: string) => any;
declare const __dirname: string;

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
  mainWindow?.webContents.on('did-finish-load', () => {
    autoUpdater.checkForUpdatesAndNotify();
  });
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

// --- IPC Handler for fetching app version ---
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
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

  // 9. Ruby
  if (await fileExists('Gemfile')) {
      addSuggestion({ label: `Install Ruby gems`, value: `bundle install` }, 'Detected Ruby Tools');
  }
  if (await fileExists('Rakefile')) {
      addSuggestion({ label: `Run Rake tests`, value: `rake test` }, 'Detected Ruby Tools');
  }
  
  // 10. Rust
  if (await fileExists('Cargo.toml')) {
      addSuggestion({ label: `Build Rust project`, value: `cargo build` }, 'Detected Rust Tools');
      addSuggestion({ label: `Test Rust project`, value: `cargo test` }, 'Detected Rust Tools');
      addSuggestion({ label: `Run Rust project`, value: `cargo run` }, 'Detected Rust Tools');
  }
  
  // 11. .NET
  try {
      const files = await fs.readdir(repoPath);
      const hasSln = files.some(f => f.endsWith('.sln'));
      const hasCsproj = files.some(f => f.endsWith('.csproj'));
      if (hasSln || hasCsproj) {
          addSuggestion({ label: `Build .NET project`, value: `dotnet build` }, 'Detected .NET Tools');
          addSuggestion({ label: `Test .NET project`, value: `dotnet test` }, 'Detected .NET Tools');
          addSuggestion({ label: `Run .NET project`, value: `dotnet run` }, 'Detected .NET Tools');
      }
  } catch (e) { /* ignore directory read errors */ }

  // 12. PHP (Composer)
  if (await fileExists('composer.json')) {
      addSuggestion({ label: `Install PHP dependencies`, value: `composer install` }, 'Detected PHP Tools');
      try {
        const composerJson = JSON.parse(await fs.readFile(path.join(repoPath, 'composer.json'), 'utf-8'));
        if (composerJson?.scripts?.test) {
          addSuggestion({ label: `Run Composer tests`, value: `composer test` }, 'Detected PHP Tools');
        }
      } catch (e) { /* ignore json parse errors */ }
  }
  
  // 13. Delphi (MSBuild)
  try {
      const files = await fs.readdir(repoPath);
      const dprojFile = files.find(f => f.endsWith('.dproj'));
      if (dprojFile) {
        addSuggestion({ label: 'Build Delphi project (Release)', value: `msbuild "${dprojFile}" /t:Build /p:Configuration=Release` }, 'Detected Delphi/MSBuild');
        addSuggestion({ label: 'Clean Delphi project (Release)', value: `msbuild "${dprojFile}" /t:Clean /p:Configuration=Release` }, 'Detected Delphi/MSBuild');
        addSuggestion({ label: 'Build Delphi project (Debug)', value: `msbuild "${dprojFile}" /t:Build /p:Configuration=Debug` }, 'Detected Delphi/MSBuild');
      }
  } catch(e) { /* ignore */ }


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
    
    // Check for VCS type
    if (await fileExists('.git')) {
        suggestions.push({ type: TaskStepType.GitPull, enabled: true });
    } else if (await fileExists('.svn')) {
        suggestions.push({ type: TaskStepType.SvnUpdate, enabled: true });
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

    // Check for Delphi project
    try {
        const files = await fs.readdir(repoPath);
        const dprojFile = files.find(f => f.endsWith('.dproj'));
        if (dprojFile) {
            suggestions.push({ type: TaskStepType.RunCommand, command: `msbuild "${dprojFile}" /t:Build /p:Configuration=Release`, enabled: true });
        }
    } catch (e) { /* ignore */ }


    return suggestions;
});

// --- IPC handler for checking git/svn status ---
ipcMain.handle('check-vcs-status', async (event, repo: Repository): Promise<{ isDirty: boolean; output: string }> => {
    const command = repo.vcs === VcsType.Git ? 'git status --porcelain' : 'svn status';
    return new Promise((resolve) => {
        exec(command, { cwd: repo.localPath }, (error, stdout, stderr) => {
            if (error) {
                // If the command fails, consider it not dirty but return the error.
                resolve({ isDirty: false, output: stderr });
                return;
            }
            const isDirty = stdout.trim().length > 0;
            resolve({ isDirty, output: stdout });
        });
    });
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


// --- IPC handler for cloning a repo ---
ipcMain.on('clone-repository', (event, { repo, executionId }: { repo: Repository, executionId: string }) => {
    const sendLog = (message: string, level: LogLevel) => {
        mainWindow?.webContents.send('task-log', { executionId, message, level });
    };
    const sendEnd = (exitCode: number) => {
        mainWindow?.webContents.send('task-step-end', { executionId, exitCode });
    };

    let command: string;
    let args: string[];
    let verb = '';

    if (repo.vcs === VcsType.Git) {
        verb = 'Clone';
        command = 'git';
        args = ['clone', repo.remoteUrl, repo.localPath];
    } else if (repo.vcs === VcsType.Svn) {
        verb = 'Checkout';
        command = 'svn';
        args = ['checkout', repo.remoteUrl, repo.localPath];
    } else {
        // Fix: The type of `repo` is `never` here because all members of the `Repository` union are exhausted.
        // Cast `repo` to access the `vcs` property for logging without a TypeScript error.
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

        child.stdout.on('data', (data) => sendLog(data.toString(), LogLevel.Info));
        child.stderr.on('data', (data) => sendLog(data.toString(), LogLevel.Info));
        child.on('error', (err) => sendLog(`Spawn error: ${err.message}`, LogLevel.Error));
        child.on('close', (code) => {
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

// --- IPC Handler for running real task steps ---
ipcMain.on('run-task-step', (event, { repo, step, settings, executionId }: { repo: Repository; step: TaskStep; settings: GlobalSettings; executionId: string; }) => {
    const sendLog = (message: string, level: LogLevel) => {
        mainWindow?.webContents.send('task-log', { executionId, message, level });
    };
    const sendEnd = (exitCode: number) => {
        mainWindow?.webContents.send('task-step-end', { executionId, exitCode });
    };

    let command: string;
    let args: string[];

    switch(step.type) {
        // Git Steps
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
        // SVN Steps
        case TaskStepType.SvnUpdate:
            command = 'svn';
            args = ['update'];
            break;
        // Common Steps
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
const sendUpdateStatus = (status: UpdateStatus, message?: string) => {
  mainWindow?.webContents.send('update-status-changed', { status, message });
};

autoUpdater.on('checking-for-update', () => {
  sendUpdateStatus('checking');
});

autoUpdater.on('update-available', (info) => {
  sendUpdateStatus('available', `Update to v${info.version} available!`);
  dialog.showMessageBox({
    type: 'info',
    title: 'Update Available',
    message: `A new version (v${info.version}) is available. It will be downloaded in the background.`,
  });
});

autoUpdater.on('update-not-available', () => {
  sendUpdateStatus('up-to-date');
});

autoUpdater.on('update-downloaded', (info) => {
  sendUpdateStatus('available', `v${info.version} ready to install`);
  dialog.showMessageBox({
    type: 'info',
    title: 'Update Ready',
    message: `A new version (v${info.version}) has been downloaded. Restart the application to apply the updates.`,
    buttons: ['Restart Now', 'Later']
  }).then((buttonIndex) => {
    if (buttonIndex.response === 0) {
      autoUpdater.quitAndInstall();
    }
  });
});

autoUpdater.on('error', (err) => {
  sendUpdateStatus('error', 'Update check failed');
  console.error('Error in auto-updater. ' + err);
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
    if (repo.vcs === VcsType.Git) {
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
    } else if (repo.vcs === VcsType.Svn) {
      const { stdout } = await execAsync('svn status', { cwd: repo.localPath });
      const files: VcsFileStatus = { added: 0, modified: 0, deleted: 0, conflicted: 0, untracked: 0, renamed: 0 };
      if (stdout.trim().length === 0) return { files, isDirty: false };

      for (const line of stdout.split('\n')) {
        const status = line.trim().charAt(0);
        if (status === 'A') files.added++;
        else if (status === 'M') files.modified++;
        else if (status === 'D') files.deleted++;
        else if (status === 'C') files.conflicted++;
        else if (status === '?') files.untracked++;
      }
      return { files, isDirty: true };
    }
    return null;
  } catch (error) {
    console.error(`Error getting detailed status for ${repo.name}:`, error);
    return null;
  }
});


// --- Get Commit History (Git only) ---
ipcMain.handle('get-commit-history', async (event, repoPath: string): Promise<Commit[]> => {
    try {
        const SEPARATOR = '_||_';
        const format = `%H${SEPARATOR}%h${SEPARATOR}%an${SEPARATOR}%ar${SEPARATOR}%B`;
        // Use -z to separate commits with a NUL character, as messages can contain newlines
        const { stdout } = await execAsync(`git log --pretty=format:"${format}" -z -n 30`, { cwd: repoPath });
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
    } catch (e) {
        console.error(`Failed to get commit history for ${repoPath}:`, e);
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