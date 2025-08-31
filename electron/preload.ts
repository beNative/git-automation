import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getDoc: (docName: string): Promise<string> => ipcRenderer.invoke('get-doc', docName),
});
