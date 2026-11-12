const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');

let mainWindow;

function getFfmpegPath() {
  if (app.isPackaged) return path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'ffmpeg-static', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
  return require('ffmpeg-static');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1080,
    height: 760,
    minWidth: 860,
    minHeight: 650,
    backgroundColor: '#f7f8fc',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadFile('index.html');
}

function sendProgress(payload) {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('transcription-progress', payload);
}

function convertToWav(input, output) {
  const ffmpeg = getFfmpegPath();
  return new Promise((resolve, reject) => {
    const process = spawn(ffmpeg, ['-i', input, '-vn', '-ar', '16000', '-ac', '1', '-f', 'wav', output]);
    let error = '';
    process.stderr.on('data', (data) => { error += data.toString(); });
    process.on('error', reject);
    process.on('close', (code) => code === 0 ? resolve() : reject(new Error(error || 'No se pudo leer el audio.')));
  });
}

function readWavSamples(filePath) {
  const buffer = fs.readFileSync(filePath);
  const dataMarker = Buffer.from('data');
  const dataOffset = buffer.indexOf(dataMarker);
  if (dataOffset < 0) throw new Error('Formato WAV no compatible.');
  const start = dataOffset + 8;
  const samples = new Float32Array(Math.floor((buffer.length - start) / 2));
  for (let i = 0; i < samples.length; i += 1) samples[i] = buffer.readInt16LE(start + i * 2) / 32768;
  return samples;
}

async function prepareAudio({ filePath }) {
  if (!fs.existsSync(filePath)) throw new Error('No se encontró el archivo de audio.');

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'voz-a-texto-'));
  const wavPath = path.join(tempDir, 'audio.wav');

  try {
    sendProgress({ status: 'preparing', message: 'Preparando el audio…' });
    await convertToWav(filePath, wavPath);
    return readWavSamples(wavPath);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

ipcMain.handle('choose-audio', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Selecciona un audio',
    properties: ['openFile'],
    filters: [{ name: 'Audio y vídeo', extensions: ['mp3', 'm4a', 'wav', 'mp4', 'mpeg', 'mpga', 'webm', 'ogg', 'flac'] }],
  });
  if (result.canceled || !result.filePaths[0]) return null;
  const selected = result.filePaths[0];
  return { path: selected, name: path.basename(selected), size: fs.statSync(selected).size };
});

ipcMain.handle('prepare-audio', async (_event, payload) => {
  try {
    const audio = await prepareAudio(payload);
    return { ok: true, audio };
  } catch (error) {
    return { ok: false, error: error?.message || 'No se pudo transcribir el audio.' };
  }
});

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
