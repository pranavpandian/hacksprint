const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('bridgeux', Object.freeze({
  modelStatus: () => ipcRenderer.invoke('bridgeux:model-status'),
  askLocal: request => ipcRenderer.invoke('bridgeux:ask-local', request),
  listScreens: () => ipcRenderer.invoke('bridgeux:list-screens'),
  chooseScreen: id => ipcRenderer.invoke('bridgeux:choose-screen', id),
  captureScreen: id => ipcRenderer.invoke('bridgeux:capture-screen', id),
  inspectScreen: request => ipcRenderer.invoke('bridgeux:inspect-screen', request),
  performApprovedAction: action => ipcRenderer.invoke('bridgeux:perform-action', action),
  startSpeech: () => ipcRenderer.invoke('bridgeux:speech-start'),
  stopSpeech: () => ipcRenderer.invoke('bridgeux:speech-stop'),
  sendSpeechAudio: samples => ipcRenderer.send('bridgeux:speech-audio', samples),
  onSpeechResult: callback => ipcRenderer.on('bridgeux:speech-result', (_event, result) => callback(result)),
  speakText: request => ipcRenderer.invoke('bridgeux:speak-text', request),
  onTtsAudio: callback => ipcRenderer.on('bridgeux:tts-audio', (_event, audio) => callback(audio)),
  gestureModelUrl: () => 'bridgeux://assets/vision/gesture_recognizer.task',
  gestureWasmUrl: () => 'bridgeux://assets/vision/wasm/'
}));
