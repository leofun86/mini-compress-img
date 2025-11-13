/* 
  imgCompress – Standalone v2
  (c) 2025 Multi 86 – módulo propio sin dependencias externas
  Funciones principales: carga, compresión (canvas), descarga y vínculo con el modal Before/After.
*/

const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

const state = {
  file: null,
  originalURL: null,
  compressedURL: null,
  compressedBlob: null,
  originalBlob: null,
};

const UI = {
  fileInput: $('#fileInput'),
  btnCompress: $('#btnCompress'),
  progressBar: $('#progressBar'),
  progressText: $('#progressText'),
  thumbOriginal: $('#thumbOriginal'),
  thumbCompressed: $('#thumbCompressed'),
  sizes: $('#sizes'),
  result: $('#result'),
  btnDownload: $('#btnDownload'),
  btnPreview: $('#btnPreview'),
  quality: $('#quality'),
  maxWidth: $('#maxWidth'),
  maxHeight: $('#maxHeight'),
  format: $('#format'),
};

function setProgress(pct, text){
  UI.progressBar.style.width = `${pct}%`;
  UI.progressText.textContent = text || `${pct|0}%`;
}

function revoke(url){
  try{ if(url) URL.revokeObjectURL(url); }catch(e){}
}

function resetResult(){
  revoke(state.originalURL);
  revoke(state.compressedURL);
  state.originalURL = state.compressedURL = null;
  state.compressedBlob = state.originalBlob = null;
  UI.thumbOriginal.removeAttribute('src');
  UI.thumbCompressed.removeAttribute('src');
  UI.btnDownload.disabled = true;
  UI.btnPreview.disabled = true;
  UI.sizes.textContent = '';
  UI.result.classList.add('hidden');
  setProgress(0,'Listo para comprimir');
}

UI.fileInput.addEventListener('change', () => {
  resetResult();
  const f = UI.fileInput.files[0];
  if(!f){ return; }
  state.file = f;
  state.originalBlob = f;
  state.originalURL = URL.createObjectURL(f);
  UI.thumbOriginal.src = state.originalURL;
  UI.result.classList.remove('hidden');
  setProgress(5,'Imagen cargada');
});

async function compressViaCanvas(file, {maxW=1920,maxH=1920,quality=0.8,type='image/jpeg'}={}){
  setProgress(10,'Preparando compresión…');
  const bmp = await createImageBitmap(file);
  const scale = Math.min(maxW / bmp.width, maxH / bmp.height, 1);
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = Object.assign(document.createElement('canvas'), { width: w, height: h });
  const ctx = canvas.getContext('2d', {alpha:false});
  ctx.drawImage(bmp, 0, 0, w, h);
  setProgress(70,'Codificando…');

  const blob = await new Promise(res => canvas.toBlob(res, type, quality));
  if(!blob){ throw new Error('Error generando Blob'); }
  setProgress(95,'Finalizando…');
  return blob;
}

UI.btnCompress.addEventListener('click', async () => {
  if(!state.file){ alert('Seleccioná una imagen primero.'); return; }
  try{
    UI.btnCompress.disabled = true;
    setProgress(2,'Iniciando…');
    const opts = {
      maxW: parseInt(UI.maxWidth.value,10)||1920,
      maxH: parseInt(UI.maxHeight.value,10)||1920,
      quality: parseFloat(UI.quality.value)||0.8,
      type: UI.format.value || 'image/jpeg'
    };
    const blob = await compressViaCanvas(state.file, opts);
    state.compressedBlob = blob;
    revoke(state.compressedURL);
    state.compressedURL = URL.createObjectURL(blob);
    UI.thumbCompressed.src = state.compressedURL;

    const kb = (n)=> (n/1024).toFixed(1)+' KB';
    UI.sizes.textContent = `Tamaño original: ${kb(state.file.size)} · Comprimida: ${kb(blob.size)} · Ahorro: ${(100 - (blob.size/state.file.size*100)).toFixed(1)}%`;

    setProgress(100,'Completado');
    UI.btnDownload.disabled = false;
    UI.btnPreview.disabled = false;
  }catch(err){
    console.error(err);
    setProgress(0, 'Error: ' + err.message);
    alert('Ocurrió un error al comprimir la imagen.');
  }finally{
    UI.btnCompress.disabled = false;
  }
});

UI.btnDownload.addEventListener('click', () => {
  if(!state.compressedBlob){ return; }
  const a = document.createElement('a');
  a.download = (state.file?.name || 'imagen') + (UI.format.value==='image/png'?'.png':UI.format.value==='image/webp'?'.webp':'.jpg');
  a.href = state.compressedURL;
  document.body.appendChild(a);
  a.click();
  a.remove();
});

// Before/After modal integration (namespace imgCompress)
const imgCompress = window.imgCompress || (window.imgCompress = {});

imgCompress.openBeforeAfter = () => {
  if(!state.originalURL || !state.compressedURL){ return; }
  window.imgCompressBeforeAfter.open({
    beforeSrc: state.originalURL,
    afterSrc: state.compressedURL
  });
};

UI.btnPreview.addEventListener('click', imgCompress.openBeforeAfter);
