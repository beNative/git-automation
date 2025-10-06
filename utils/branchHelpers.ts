import { VcsType, type BranchInfo } from '../types';

type MainBranchScope = 'local' | 'remote';

const trimTrailingSlash = (value: string): string => value.replace(/\/$/, '');

const normalizeSvnBranch = (branch: string): string => {
  const trimmed = trimTrailingSlash(branch.trim());
  return trimmed.replace(/^\^?\/+/, '');
};

export const normalizeBranchForComparison = (branch: string, vcs: VcsType): string => {
  if (!branch) {
    return branch;
  }
  if (vcs === VcsType.Svn) {
    return normalizeSvnBranch(branch);
  }
  return trimTrailingSlash(branch.trim());
};

export const getDisplayBranchName = (branch: string, vcs: VcsType): string => {
  if (!branch) {
    return branch;
  }
  const normalized = normalizeBranchForComparison(branch, vcs);
  return normalized;
};

export const getRemoteBranchesToOffer = (branchInfo: BranchInfo, vcs: VcsType): string[] => {
  if (vcs === VcsType.Git) {
    return branchInfo.remote.filter(rBranch => {
      const localEquivalent = rBranch.split('/').slice(1).join('/');
      return !branchInfo.local.includes(localEquivalent);
    });
  }

  const localSet = new Set(branchInfo.local.map(branch => normalizeBranchForComparison(branch, VcsType.Svn)));
  return branchInfo.remote.filter(branch => {
    const normalized = normalizeBranchForComparison(branch, VcsType.Svn);
    return !localSet.has(normalized);
  });
};

const isSvnTrunk = (branch: string): boolean => {
  const normalized = normalizeBranchForComparison(branch, VcsType.Svn).toLowerCase();
  return normalized === 'trunk' || normalized.endsWith('/trunk');
};

export interface MainBranchDetails {
  target: string;
  scope: MainBranchScope;
}

export const getMainBranchDetails = (branchInfo: BranchInfo, vcs: VcsType): MainBranchDetails | null => {
  if (vcs === VcsType.Git) {
    if (branchInfo.local.includes('main')) {
      return { target: 'main', scope: 'local' };
    }
    const remoteMain = branchInfo.remote.find(branch => branch.split('/').slice(-1)[0] === 'main');
    if (remoteMain) {
      return { target: remoteMain, scope: 'remote' };
    }
    return null;
  }

  const localTrunk = branchInfo.local.find(isSvnTrunk);
  if (localTrunk) {
    return { target: localTrunk, scope: 'local' };
  }
  const remoteTrunk = branchInfo.remote.find(isSvnTrunk);
  if (remoteTrunk) {
    return { target: remoteTrunk, scope: 'remote' };
  }
  return null;
};
