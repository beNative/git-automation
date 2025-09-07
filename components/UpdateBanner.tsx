import React from 'react';
import { RocketLaunchIcon } from './icons/RocketLaunchIcon';

interface UpdateBannerProps {
  onInstall: () => void;
}

const UpdateBanner: React.FC<UpdateBannerProps> = ({ onInstall }) => {
  return (
    <div className="bg-blue-600 dark:bg-blue-700 text-white px-4 py-2 flex items-center justify-between shadow-lg animate-fade-in">
      <div className="flex items-center">
        <RocketLaunchIcon className="h-6 w-6 mr-3" />
        <p className="font-semibold">A new version is ready to install.</p>
      </div>
      <button
        onClick={onInstall}
        className="px-4 py-1.5 bg-white text-blue-700 font-bold rounded-md hover:bg-blue-100 transition-colors"
      >
        Restart & Install
      </button>
    </div>
  );
};

export default UpdateBanner;
