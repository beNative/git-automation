// FIX: Add .ts extension to satisfy module resolution
import { RepoStatus, BuildHealth } from "./types.ts";

export const STATUS_COLORS: Record<RepoStatus, string> = {
  [RepoStatus.Idle]: 'bg-gray-500',
  [RepoStatus.Syncing]: 'bg-blue-500 animate-pulse',
  [RepoStatus.Building]: 'bg-indigo-500 animate-pulse',
  [RepoStatus.Deploying]: 'bg-purple-500 animate-pulse',
  [RepoStatus.Success]: 'bg-green-600',
  [RepoStatus.Failed]: 'bg-red-500',
};

export const BUILD_HEALTH_COLORS: Record<BuildHealth, string> = {
  [BuildHealth.Healthy]: 'text-green-600 dark:text-green-500',
  [BuildHealth.Failing]: 'text-red-600 dark:text-red-500',
  [BuildHealth.Unknown]: 'text-gray-400',
};