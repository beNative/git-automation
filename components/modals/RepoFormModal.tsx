import React, { useState, useEffect } from 'react';
import type { Repository } from '../../types';
import { RepoStatus, BuildHealth } from '../../types';
import { XIcon } from '../icons/XIcon';

interface RepoFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (repository: Repository) => void;
  repository: Repository | null;
}

const RepoFormModal: React.FC<RepoFormModalProps> = ({ isOpen, onClose, onSave, repository }) => {
  const [formData, setFormData] = useState<Omit<Repository, 'id' | 'status' | 'lastUpdated' | 'buildHealth'>>({
    name: '',
    remoteUrl: '',
    localPath: '',
    branch: 'main',
    authType: 'none',
    authToken: '',
    sshKeyPath: '',
  });

  useEffect(() => {
    if (repository) {
      setFormData({
        name: repository.name,
        remoteUrl: repository.remoteUrl,
        localPath: repository.localPath,
        branch: repository.branch,
        authType: repository.authType,
        authToken: repository.authToken || '',
        sshKeyPath: repository.sshKeyPath || '',
      });
    } else {
      setFormData({
        name: '',
        remoteUrl: '',
        localPath: '',
        branch: 'main',
        authType: 'none',
        authToken: '',
        sshKeyPath: '',
      });
    }
  }, [repository, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const repoToSave: Repository = {
      ...(repository || { 
        id: '', // Will be set in App.tsx for new repos
        status: RepoStatus.Idle,
        lastUpdated: null,
        buildHealth: BuildHealth.Unknown,
      }),
      ...formData,
    };
    onSave(repoToSave);
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center bg-black bg-opacity-75 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4">
        <form onSubmit={handleSubmit}>
          <header className="flex items-center justify-between p-4 border-b border-gray-700">
            <h2 className="text-xl font-semibold text-gray-100">
              {repository ? 'Edit Repository' : 'Add New Repository'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
            >
              <XIcon className="h-6 w-6" />
            </button>
          </header>

          <main className="p-6 space-y-4">
            <p className="text-sm text-yellow-400 bg-yellow-900/50 p-3 rounded-md">
              <strong>Security Warning:</strong> Credentials are stored in plaintext in local storage. This is for demonstration purposes only. Do not use real credentials.
            </p>
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300">Repository Name</label>
              <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} required className="mt-1 block w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"/>
            </div>
            <div>
              <label htmlFor="remoteUrl" className="block text-sm font-medium text-gray-300">Remote URL</label>
              <input type="url" name="remoteUrl" id="remoteUrl" value={formData.remoteUrl} onChange={handleChange} required className="mt-1 block w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"/>
            </div>
            <div>
              <label htmlFor="localPath" className="block text-sm font-medium text-gray-300">Local Clone Path (Conceptual)</label>
              <input type="text" name="localPath" id="localPath" value={formData.localPath} onChange={handleChange} required className="mt-1 block w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"/>
            </div>
            <div>
              <label htmlFor="branch" className="block text-sm font-medium text-gray-300">Branch</label>
              <input type="text" name="branch" id="branch" value={formData.branch} onChange={handleChange} required className="mt-1 block w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"/>
            </div>
             <div>
              <label htmlFor="authType" className="block text-sm font-medium text-gray-300">Authentication</label>
              <select name="authType" id="authType" value={formData.authType} onChange={handleChange} className="mt-1 block w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500">
                <option value="none">None</option>
                <option value="ssh">SSH Key Path</option>
                <option value="token">HTTPS Token</option>
              </select>
            </div>
            {formData.authType === 'ssh' && (
               <div>
                <label htmlFor="sshKeyPath" className="block text-sm font-medium text-gray-300">SSH Key Path</label>
                <input type="text" name="sshKeyPath" id="sshKeyPath" value={formData.sshKeyPath} onChange={handleChange} placeholder="e.g., ~/.ssh/id_rsa" className="mt-1 block w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"/>
              </div>
            )}
            {formData.authType === 'token' && (
               <div>
                <label htmlFor="authToken" className="block text-sm font-medium text-gray-300">HTTPS Token</label>
                <input type="password" name="authToken" id="authToken" value={formData.authToken} onChange={handleChange} placeholder="Enter your personal access token" className="mt-1 block w-full bg-gray-900 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-cyan-500 focus:border-cyan-500"/>
              </div>
            )}
          </main>

          <footer className="flex justify-end p-4 bg-gray-800/50 border-t border-gray-700 space-x-3">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-cyan-600 text-white rounded-md hover:bg-cyan-700 transition-colors">Save Repository</button>
          </footer>
        </form>
      </div>
    </div>
  );
};

export default RepoFormModal;
