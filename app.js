// Mini Compress — Standalone (client-only)
// Requiere browser-image-compression, JSZip y FileSaver cargados desde CDN (ver index.html).

const inputEl = document.getElementById('fileInput');
const dropzone = document.getElementById('dropzone');
const fileList = document.getElementById('fileList');
const formatSel = document.getElementById('formatSelect');
const qRange = document.getElementById('qualityRange');
const qVal = document.getElementById('qualityVal');
const zipBtn = document.getElementById('downloadZip');

const modal = document.getElementById('errorModal');
const modalBody = document.getElementById('err-body');
const modalClose = document.getElementById('err-close');

qRange.addEventListener('input', () => qVal.textContent = qRange.value);

// State
let totalFiles = 0;
let finished = 0;
let results = []; // {name, blob, originalSize, outputSize}

// Utility
const prettyBytes = (num) => {
  if (num < 1024) return `${num} B`;
  const units = ['KB','MB','GB'];
  let i = -1;
  do { num = num/1024; i++; } while (num >= 1024 && i < units.length-1);
  return `${num.toFixed(1)} ${units[i]}`;
};

function openError(message) {
  modalBody.textContent = String(message || 'Error desconocido');
  modal.classList.remove('hidden');
}
modalClose.addEventListener('click', () => modal.classList.add('hidden'));

// Progress row factory
function makeRow(file) {
  const row = document.createElement('div');
  row.className = 'row';
  row.innerHTML = `
    <div class="name">${file.name}</div>
    <div class="size">${prettyBytes(file.size)}</div>
    <div class="progressbar"><div class="progress"></div></div>
    <div class="actions">
      <span class="badge">⚠️ Error</span>
    </div>
  `;
  fileList.appendChild(row);
  return row;
}

// Progress animator → goes smoothly up to 95%
function startProgress(progressEl) {
  let value = 0;
  const id = setInterval(() => {
    value = Math.min(value + Math.random()*10, 95);
    progressEl.style.width = `${value}%`;
  }, 180);
  return { id, set100: () => { clearInterval(id); progressEl.style.width = '100%'; } };
}

// Client-side compression (no server)
async function compressClientSide(file) {
  // Map UI format to library options
  const outFmt = formatSel.value; // 'webp'|'jpeg'|'png'
  const quality = parseInt(qRange.value, 10) || 80;

  const opts = {
    maxWidthOrHeight: 6000,
    initialQuality: Math.max(0.4, Math.min(0.95, quality/100)),
    fileType: outFmt === 'jpeg' ? 'image/jpeg' : (outFmt === 'png' ? 'image/png' : 'image/webp'),
    // Use Web Worker if available
    useWebWorker: true,
    alwaysKeepResolution: true
  };
  // library is global: imageCompression
  const outFile = await imageCompression(file, opts);
  // Wrap to Blob
  return new Blob([await outFile.arrayBuffer()], { type: outFile.type });
}

// Per-file workflow
async function handleFile(file) {
  const row = makeRow(file);
  const progressEl = row.querySelector('.progressbar > .progress');
  const { id, set100 } = startProgress(progressEl);
  const badge = row.querySelector('.badge');
  const actions = row.querySelector('.actions');

  try {
    // Timeout wrapper (60s) for heavy images on weak devices
    const blob = await Promise.race([
      compressClientSide(file),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Tiempo de espera agotado durante la compresión en el navegador')), 60000))
    ]);

    set100();
    progressEl.classList.add('progress--done');

    const outName = (() => {
      const base = file.name.replace(/\.[^.]+$/, '');
      const ext = formatSel.value === 'jpeg' ? 'jpg' : (formatSel.value);
      return `${base}.${ext}`;
    })();

    results.push({ name: outName, blob, originalSize: file.size, outputSize: blob.size });

    // Download button
    const a = document.createElement('a');
    a.className = 'btn download';
    a.textContent = 'Descargar';
    a.href = URL.createObjectURL(blob);
    a.download = outName;
    actions.appendChild(a);

    // Update size column to show out
    const sizeCell = row.querySelector('.size');
    sizeCell.textContent = `${prettyBytes(file.size)} → ${prettyBytes(blob.size)}`;

  } catch (err) {
    clearInterval(id);
    progressEl.classList.add('progress--error');
    set100();
    badge.style.display = 'inline-block';

    // Error button
    const ebtn = document.createElement('button');
    ebtn.className = 'btn';
    ebtn.textContent = 'Ver error';
    ebtn.addEventListener('click', () => openError(err && err.message || 'Error desconocido'));
    actions.appendChild(ebtn);
  } finally {
    finished++;
    if (finished === totalFiles && results.length) {
      zipBtn.classList.remove('hidden');
    }
  }
}

// Handle multiple
async function handleFiles(files) {
  results = [];
  totalFiles = files.length;
  finished = 0;
  fileList.innerHTML = '';
  zipBtn.classList.add('hidden');

  for (const f of files) {
    // Basic file type guard
    if (!/^image\//i.test(f.type)) {
      const row = makeRow(f);
      const progressEl = row.querySelector('.progressbar > .progress');
      progressEl.classList.add('progress--error');
      progressEl.style.width = '100%';
      const badge = row.querySelector('.badge');
      const actions = row.querySelector('.actions');
      badge.style.display = 'inline-block';
      const ebtn = document.createElement('button');
      ebtn.className = 'btn';
      ebtn.textContent = 'Ver error';
      ebtn.addEventListener('click', () => openError('Formato no soportado. Subí una imagen.'));
      actions.appendChild(ebtn);
      finished++;
      continue;
    }
    handleFile(f);
  }
}

// ZIP all
zipBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  if (!results.length) return;
  const zip = new JSZip();
  results.forEach(r => zip.file(r.name, r.blob));
  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, 'imagenes_comprimidas.zip');
});

// Input
inputEl.addEventListener('change', (e) => {
  const files = Array.from(e.target.files || []);
  if (files.length) handleFiles(files);
});

// Drag & Drop
['dragenter','dragover'].forEach(evt => {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault(); e.stopPropagation();
    dropzone.classList.add('dragover');
  });
});
['dragleave','drop'].forEach(evt => {
  dropzone.addEventListener(evt, (e) => {
    e.preventDefault(); e.stopPropagation();
    dropzone.classList.remove('dragover');
  });
});
dropzone.addEventListener('drop', (e) => {
  const files = Array.from(e.dataTransfer?.files || []);
  if (files.length) handleFiles(files);
});
