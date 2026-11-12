const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopAPI', {
  chooseAudio: () => ipcRenderer.invoke('choose-audio'),
  prepareAudio: (payload) => ipcRenderer.invoke('prepare-audio', payload),
  onProgress: (callback) => ipcRenderer.on('transcription-progress', (_event, data) => callback(data)),
});
