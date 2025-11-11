import React from 'react';
import type { AutoInstallMode } from '../types';
import { RocketLaunchIcon } from './icons/RocketLaunchIcon';

interface UpdateBannerProps {
  version?: string;
  message?: string;
  autoInstallMode: AutoInstallMode;
  autoInstallScheduled: boolean;
  onChangeMode: (mode: AutoInstallMode) => void;
  onInstallNow: () => void;
  onInstallLater: () => void;
}

const UpdateBanner: React.FC<UpdateBannerProps> = ({
  version,
  message,
  autoInstallMode,
  autoInstallScheduled,
  onChangeMode,
  onInstallNow,
  onInstallLater,
}) => {
  return (
    <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white px-4 py-5 sm:px-6 shadow-lg">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between" data-automation-id="update-banner">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-white/20 p-2">
              <RocketLaunchIcon className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-white/70">
              <span data-automation-id="banner-label">Update Ready</span>
              {version && (
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold" data-automation-id="banner-version">v{version}</span>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-lg font-semibold" data-automation-id="banner-headline">A new Git Automation Dashboard build is ready to install.</p>
            {message && <p className="text-sm text-white/80" data-automation-id="banner-message">{message}</p>}
          </div>
          <div className="rounded-lg bg-black/25 p-4" data-automation-id="banner-choice">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">Choose how to finish this update</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2" data-automation-id="banner-choice-options">
              <label
                className={`flex items-start gap-3 rounded-md border border-white/20 bg-white/10 p-3 transition ${autoInstallMode === 'auto' ? 'ring-2 ring-white shadow-lg' : 'hover:bg-white/20'}`}
              >
                <input
                  type="radio"
                  name="autoInstallMode"
                  value="auto"
                  checked={autoInstallMode === 'auto'}
                  onChange={() => onChangeMode('auto')}
                  className="mt-1 h-4 w-4 border-white/40 bg-white/10 text-white focus:ring-white"
                  data-automation-id="banner-option-auto"
                />
                <div>
                  <p className="font-semibold">Install automatically after download</p>
                  <p className="text-xs text-white/80">We'll restart for you whenever an update is validated.</p>
                  {autoInstallMode === 'auto' && (
                    <p className="mt-1 text-[11px] font-medium text-emerald-200" data-automation-id="banner-auto-active">
                      {autoInstallScheduled ? 'Auto-install is scheduled. Sit tight!' : 'Auto-install is enabled for future updates.'}
                    </p>
                  )}
                </div>
              </label>
              <label
                className={`flex items-start gap-3 rounded-md border border-white/20 bg-white/10 p-3 transition ${autoInstallMode === 'manual' ? 'ring-2 ring-white shadow-lg' : 'hover:bg-white/20'}`}
              >
                <input
                  type="radio"
                  name="autoInstallMode"
                  value="manual"
                  checked={autoInstallMode === 'manual'}
                  onChange={() => onChangeMode('manual')}
                  className="mt-1 h-4 w-4 border-white/40 bg-white/10 text-white focus:ring-white"
                  data-automation-id="banner-option-manual"
                />
                <div>
                  <p className="font-semibold">I'll install it myself</p>
                  <p className="text-xs text-white/80">Keep working and decide when to restart. We'll remind you until it's done.</p>
                </div>
              </label>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center" data-automation-id="banner-actions">
          <button
            type="button"
            onClick={onInstallNow}
            className="inline-flex items-center justify-center rounded-md bg-white px-5 py-2 text-sm font-semibold text-indigo-700 shadow-lg transition hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-white"
            data-automation-id="banner-install-now"
          >
            Restart &amp; Install Now
          </button>
          <button
            type="button"
            onClick={onInstallLater}
            className="inline-flex items-center justify-center rounded-md border border-white/40 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/60"
            data-automation-id="banner-install-later"
          >
            I'll Install Later
          </button>
          {autoInstallMode === 'manual' && (
            <span className="text-xs text-white/80" data-automation-id="banner-reminder">Use the “Update Ready” controls in the title bar when you're ready.</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpdateBanner;
