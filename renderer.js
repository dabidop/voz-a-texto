const $ = (id) => document.getElementById(id);
let selectedFile = null;
let transcriber = null;
const dropzone = $('dropzone');

function formatSize(bytes) { return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`; }
function showFile(file) {
  selectedFile = file;
  $('dropTitle').textContent = 'Archivo seleccionado';
  $('dropzone').classList.add('selected');
  $('filePreview').classList.remove('hidden');
  $('fileName').textContent = file.name;
  $('fileSize').textContent = formatSize(file.size);
  $('transcribe').disabled = false;
}
function clearFile() {
  selectedFile = null; $('filePreview').classList.add('hidden'); $('dropzone').classList.remove('selected');
  $('dropTitle').textContent = 'Selecciona un archivo de audio'; $('transcribe').disabled = true;
}
dropzone.addEventListener('click', async () => { const file = await window.desktopAPI.chooseAudio(); if (file) showFile(file); });
$('removeFile').addEventListener('click', clearFile);
$('newAudio').addEventListener('click', () => { $('result').classList.add('hidden'); clearFile(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
window.desktopAPI.onProgress((data) => { $('progressText').textContent = data.message; });
$('transcribe').addEventListener('click', async () => {
  if (!selectedFile) return;
  $('error').classList.add('hidden'); $('progress').classList.remove('hidden'); $('transcribe').disabled = true; $('transcribe').classList.add('loading');
  const prepared = await window.desktopAPI.prepareAudio({ filePath: selectedFile.path });
  if (!prepared.ok) { $('progress').classList.add('hidden'); $('error').textContent = prepared.error; $('error').classList.remove('hidden'); $('transcribe').disabled = false; return; }
  let response;
  try {
    $('progressText').textContent = 'Cargando el modelo local (solo la primera vez)…';
    if (!transcriber) {
      // The browser bundle is self-contained; the non-minified web build
      // leaves bare Node module imports that file:// cannot resolve.
      const { pipeline } = await import('./node_modules/@huggingface/transformers/dist/transformers.min.js');
      transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-small', { dtype: 'q8' });
    }
    $('progressText').textContent = 'Transcribiendo localmente…';
    const options = { chunk_length_s: 30, stride_length_s: 5, return_timestamps: true, task: 'transcribe' };
    const languageNames = { es: 'spanish', en: 'english', pt: 'portuguese', fr: 'french' };
    if ($('language').value !== 'auto') options.language = languageNames[$('language').value];
    const result = await transcriber(prepared.audio, options);
    response = { ok: true, text: result.text.trim() };
  } catch (error) {
    response = { ok: false, error: error?.message || 'No se pudo cargar el motor local.' };
  }
  $('progress').classList.add('hidden'); $('transcribe').classList.remove('loading');
  if (!response.ok) { $('error').textContent = response.error; $('error').classList.remove('hidden'); $('transcribe').disabled = false; return; }
  $('output').value = response.text; $('wordCount').textContent = `${response.text.trim() ? response.text.trim().split(/\s+/).length : 0} palabras`; $('result').classList.remove('hidden'); $('result').scrollIntoView({ behavior: 'smooth' });
});
$('copy').addEventListener('click', async () => { await navigator.clipboard.writeText($('output').value); $('copy').textContent = '¡Copiado!'; setTimeout(() => { $('copy').textContent = 'Copiar texto'; }, 1600); });
