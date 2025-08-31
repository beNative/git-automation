import { LogLevel } from '../types';

type LogCallback = (repoId: string, message: string, level: LogLevel) => void;

const simulateDelay = (ms: number) => new Promise(res => setTimeout(res, ms));

const randomFail = (chance: number, message: string) => {
  if (Math.random() < chance) {
    throw new Error(message);
  }
};

const simulateClone = async (repoId: string, log: LogCallback) => {
    log(repoId, 'Checking for local directory...', LogLevel.Info);
    await simulateDelay(500);
    if(Math.random() > 0.8) { // Simulate new repo
        log(repoId, `git clone <remote_url>`, LogLevel.Command);
        await simulateDelay(2000);
        log(repoId, 'Repository cloned successfully.', LogLevel.Success);
    } else {
        log(repoId, 'Local directory found. Skipping clone.', LogLevel.Info);
    }
};

const simulatePull = async (repoId: string, log: LogCallback) => {
  log(repoId, `git pull`, LogLevel.Command);
  await simulateDelay(1500);
  randomFail(0.1, 'Merge conflict detected. Please resolve conflicts manually.');
  log(repoId, 'Successfully pulled latest changes.', LogLevel.Success);
};

const simulateInstall = async (repoId: string, pm: 'npm' | 'yarn', log: LogCallback): Promise<boolean> => {
    log(repoId, 'Checking for package.json changes...', LogLevel.Info);
    await simulateDelay(500);
    if (Math.random() > 0.5) {
        log(repoId, 'package.json has changed. Installing dependencies...', LogLevel.Warn);
        const command = pm === 'npm' ? 'npm install' : 'yarn install';
        log(repoId, command, LogLevel.Command);
        await simulateDelay(3000);
        randomFail(0.1, 'Dependency installation failed. Check package-lock.json.');
        log(repoId, 'Dependencies installed successfully.', LogLevel.Success);
        return true;
    }
    log(repoId, 'No changes in package.json. Skipping install.', LogLevel.Info);
    return false;
};

const simulateRunCommand = async (repoId: string, command: string, log: LogCallback) => {
    log(repoId, command, LogLevel.Command);
    await simulateDelay(4000 + Math.random() * 2000); // variable delay
    randomFail(0.15, `Command '${command}' failed with exit code 1.`);
    log(repoId, `Command '${command}' completed successfully.`, LogLevel.Success);
};

export const automationService = {
  simulateClone,
  simulatePull,
  simulateInstall,
  simulateRunCommand,
};
