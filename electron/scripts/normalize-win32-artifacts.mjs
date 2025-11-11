#!/usr/bin/env node
import { promises as fsPromises, createReadStream } from 'fs';
import path from 'path';
import process from 'process';
import { createHash } from 'crypto';

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
    await fsPromises.access(filePath);
    return true;
  } catch (_error) {
    return false;
  }
};

const computeSha512 = async (filePath) => {
  const hash = createHash('sha512');
  await new Promise((resolve, reject) => {
    const stream = createReadStream(filePath);
    stream.on('data', chunk => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', resolve);
  });
  return hash.digest('base64');
};

const toBasename = (value) => {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }
  return path.basename(value.trim());
};

const updateManifestFile = async (manifestPath, renameMap, hashMap) => {
  const raw = await fsPromises.readFile(manifestPath, 'utf8');
  const lines = raw.split(/\r?\n/);

  let inFilesSection = false;
  let inPackagesSection = false;
  let currentFileKey = null;
  let currentPackageFileKey = null;
  let rootFileKey = null;

  const replaceWithRename = (value) => {
    const base = toBasename(value);
    if (!base) {
      return value;
    }
    const renamed = renameMap.get(base);
    if (!renamed || renamed === base) {
      return value;
    }
    return value.endsWith(base)
      ? value.slice(0, value.length - base.length) + renamed
      : value.replace(base, renamed);
  };

  const applyHashIfAvailable = (existingLine, key, indentPattern) => {
    if (!key) {
      return existingLine;
    }
    const hash = hashMap.get(key);
    if (!hash) {
      return existingLine;
    }
    return existingLine.replace(indentPattern, `$1${hash}`);
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();

    if (trimmed === 'files:') {
      inFilesSection = true;
      inPackagesSection = false;
      currentFileKey = null;
      continue;
    }
    if (trimmed === 'packages:') {
      inFilesSection = false;
      inPackagesSection = true;
      currentPackageFileKey = null;
      continue;
    }
    if (!line.startsWith(' ')) {
      inFilesSection = trimmed === '' ? inFilesSection : false;
      if (trimmed !== 'packages:') {
        inPackagesSection = false;
      }
    }

    if (inFilesSection) {
      const urlMatch = line.match(/^\s*-\s+url:\s+(.*)$/);
      if (urlMatch) {
        const rawValue = urlMatch[1];
        const updatedValue = replaceWithRename(rawValue);
        if (updatedValue !== rawValue) {
          lines[index] = line.replace(rawValue, updatedValue);
        }
        currentFileKey = toBasename(updatedValue);
        continue;
      }

      const pathMatch = line.match(/^\s+path:\s+(.*)$/);
      if (pathMatch) {
        const rawValue = pathMatch[1];
        const updatedValue = replaceWithRename(rawValue);
        if (updatedValue !== rawValue) {
          lines[index] = line.replace(rawValue, updatedValue);
        }
        currentFileKey = toBasename(updatedValue);
        continue;
      }

      const shaMatch = line.match(/^(\s+sha512:\s+)(.*)$/);
      if (shaMatch) {
        lines[index] = applyHashIfAvailable(line, currentFileKey, /^(\s+sha512:\s+).*/);
        continue;
      }
      continue;
    }

    if (inPackagesSection) {
      const packagePathMatch = line.match(/^\s{4}path:\s+(.*)$/);
      if (packagePathMatch) {
        const rawValue = packagePathMatch[1];
        const updatedValue = replaceWithRename(rawValue);
        if (updatedValue !== rawValue) {
          lines[index] = line.replace(rawValue, updatedValue);
        }
        currentPackageFileKey = toBasename(updatedValue);
        continue;
      }

      const packageShaMatch = line.match(/^(\s{4}sha512:\s+).*/);
      if (packageShaMatch) {
        lines[index] = applyHashIfAvailable(line, currentPackageFileKey, /^(\s{4}sha512:\s+).*/);
        continue;
      }
      continue;
    }

    const rootPathMatch = line.match(/^path:\s+(.*)$/);
    if (rootPathMatch) {
      const rawValue = rootPathMatch[1];
      const updatedValue = replaceWithRename(rawValue);
      if (updatedValue !== rawValue) {
        lines[index] = line.replace(rawValue, updatedValue);
      }
      rootFileKey = toBasename(updatedValue);
      continue;
    }

    const rootShaMatch = line.match(/^(sha512:\s+).*/);
    if (rootShaMatch) {
      lines[index] = applyHashIfAvailable(line, rootFileKey, /^(sha512:\s+).*/);
      continue;
    }
  }

  const updatedContent = lines.join('\n');
  if (updatedContent !== raw) {
    await fsPromises.writeFile(manifestPath, updatedContent, 'utf8');
    log('Updated manifest metadata.', { manifest: path.basename(manifestPath) });
  } else {
    log('Manifest already up to date.', { manifest: path.basename(manifestPath) });
  }
};

const updateName = (name) => name.replace(/-ia32-/gi, '-win32-');

const main = async () => {
  const hasReleaseDir = await exists(releaseDir);
  if (!hasReleaseDir) {
    log('No release directory found; skipping normalization.');
    return;
  }

  const entries = await fsPromises.readdir(releaseDir);
  const ia32Executables = entries.filter(name => /-ia32-/i.test(name) && name.endsWith('.exe'));
  if (ia32Executables.length === 0) {
    log('No ia32 Windows executables detected; skipping rename but refreshing manifest checksums.');
  } else {
    log('Detected ia32 executables that require normalization.', ia32Executables);
  }

  const renameMap = new Map();

  for (const fileName of ia32Executables) {
    const sourcePath = path.join(releaseDir, fileName);
    const targetName = updateName(fileName);
    if (targetName === fileName) {
      continue;
    }
    const targetPath = path.join(releaseDir, targetName);
    await fsPromises.rename(sourcePath, targetPath);
    log('Renamed executable.', { from: fileName, to: targetName });
    renameMap.set(fileName, targetName);
  }

  const blockmaps = entries.filter(name => /-ia32-/i.test(name) && name.endsWith('.exe.blockmap'));
  for (const blockmap of blockmaps) {
    const sourcePath = path.join(releaseDir, blockmap);
    const targetName = updateName(blockmap);
    if (targetName === blockmap) {
      continue;
    }
    const targetPath = path.join(releaseDir, targetName);
    await fsPromises.rename(sourcePath, targetPath);
    log('Renamed blockmap.', { from: blockmap, to: targetName });
    renameMap.set(blockmap, targetName);
  }

  const manifestPath = path.join(releaseDir, 'latest.yml');
  const fallbackManifest = path.join(releaseDir, 'latest-win32.yml');
  const hasManifest = await exists(manifestPath);
  const hasFallback = await exists(fallbackManifest);

  if (!hasFallback && hasManifest) {
    await fsPromises.copyFile(manifestPath, fallbackManifest);
    log('Seeded latest-win32.yml from latest.yml for normalization.');
  }

  const hashes = new Map();
  const updatedEntries = await fsPromises.readdir(releaseDir);
  for (const entry of updatedEntries) {
    if (/\.exe(\.blockmap)?$/i.test(entry)) {
      const fullPath = path.join(releaseDir, entry);
      hashes.set(entry, await computeSha512(fullPath));
    }
  }

  const manifestsToUpdate = [];
  if (await exists(manifestPath)) {
    manifestsToUpdate.push(manifestPath);
  }
  if (await exists(fallbackManifest)) {
    manifestsToUpdate.push(fallbackManifest);
  }

  if (manifestsToUpdate.length === 0) {
    log('No manifest files found to update; please verify the release output.');
    return;
  }

  for (const manifest of manifestsToUpdate) {
    await updateManifestFile(manifest, renameMap, hashes);
  }
};

main().catch(error => {
  console.error('[normalize-win32-artifacts] Failed to normalize win32 artifacts.', error);
  process.exitCode = 1;
});
