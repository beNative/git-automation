#!/usr/bin/env node
import { promises as fs } from 'fs';
import path from 'path';
import process from 'process';

const log = (message, data) => {
  if (data) {
    console.log(`[normalize-win32-artifacts] ${message}`, data);
  } else {
    console.log(`[normalize-win32-artifacts] ${message}`);
  }
};

const releaseDir = path.resolve(process.cwd(), 'release');

const exists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch (_error) {
    return false;
  }
};

const updateName = (name) => name.replace(/-ia32-/gi, '-win32-');

const main = async () => {
  const hasReleaseDir = await exists(releaseDir);
  if (!hasReleaseDir) {
    log('No release directory found; skipping normalization.');
    return;
  }

  const entries = await fs.readdir(releaseDir);
  const ia32Executables = entries.filter(name => /-ia32-/i.test(name) && name.endsWith('.exe'));
  if (ia32Executables.length === 0) {
    log('No ia32 Windows executables detected; nothing to normalize.');
    return;
  }

  log('Detected ia32 executables that require normalization.', ia32Executables);

  for (const fileName of ia32Executables) {
    const sourcePath = path.join(releaseDir, fileName);
    const targetName = updateName(fileName);
    if (targetName === fileName) {
      continue;
    }
    const targetPath = path.join(releaseDir, targetName);
    await fs.rename(sourcePath, targetPath);
    log('Renamed executable.', { from: fileName, to: targetName });
  }

  const blockmaps = entries.filter(name => /-ia32-/i.test(name) && name.endsWith('.exe.blockmap'));
  for (const blockmap of blockmaps) {
    const sourcePath = path.join(releaseDir, blockmap);
    const targetName = updateName(blockmap);
    if (targetName === blockmap) {
      continue;
    }
    const targetPath = path.join(releaseDir, targetName);
    await fs.rename(sourcePath, targetPath);
    log('Renamed blockmap.', { from: blockmap, to: targetName });
  }

  const manifestPath = path.join(releaseDir, 'latest.yml');
  const hasManifest = await exists(manifestPath);
  if (!hasManifest) {
    const fallbackManifest = path.join(releaseDir, 'latest-win32.yml');
    if (await exists(fallbackManifest)) {
      log('Found existing latest-win32.yml manifest; normalization already applied.');
      return;
    }
    log('No latest.yml manifest found for ia32 build; cannot update metadata.');
    return;
  }

  const manifestRaw = await fs.readFile(manifestPath, 'utf8');
  const normalizedManifest = manifestRaw.replace(/-ia32-/gi, '-win32-');
  const targetManifestPath = path.join(releaseDir, 'latest-win32.yml');
  await fs.writeFile(targetManifestPath, normalizedManifest, 'utf8');
  log('Wrote normalized manifest.', { path: path.relative(process.cwd(), targetManifestPath) });

  await fs.unlink(manifestPath);
  log('Removed original latest.yml manifest to prevent mismatched metadata.');
};

main().catch(error => {
  console.error('[normalize-win32-artifacts] Failed to normalize win32 artifacts.', error);
  process.exitCode = 1;
});
