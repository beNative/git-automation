export interface IElectronAPI {
  getDoc: (docName: string) => Promise<string>;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
