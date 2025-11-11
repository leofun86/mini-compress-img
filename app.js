const uploadInput = document.getElementById("fileInput");
const list = document.querySelector(".file-list");
const zipBtn = document.getElementById("downloadZip");

let processed = 0;
let totalFiles = 0;
let filesDone = [];

const API_URL = "https://mini-compress-img-src.onrender.com/api/compress";
const ZIP_URL = "https://mini-compress-img-src.onrender.com/api/zip";

// 🧩 Fetch con timeout
async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 60000 } = options; // 60s timeout
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(resource, { ...options, signal: controller.signal });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

// 📦 Manejo de errores visual
function showErrorInList(filename, errorMsg) {
  const item = document.createElement("div");
  item.className = "file-item error";
  item.innerHTML = `
    <span class="file-name">${filename}</span>
    <button class="error-btn">Ver error</button>
  `;
  const popup = document.createElement("div");
  popup.className = "error-popup hidden";
  popup.innerHTML = `<div class="error-popup-content"><p>${errorMsg}</p><button>Cerrar</button></div>`;
  document.body.appendChild(popup);

  item.querySelector(".error-btn").addEventListener("click", () => {
    popup.classList.remove("hidden");
  });
  popup.querySelector("button").addEventListener("click", () => {
    popup.classList.add("hidden");
  });
  list.appendChild(item);
}

// 🧩 Procesar archivo individual
async function handleFile(file) {
  const listItem = document.createElement("div");
  listItem.className = "file-item";
  listItem.innerHTML = `
    <span class="file-name">${file.name}</span>
    <div class="progress-bar"><div class="progress"></div></div>
  `;
  list.appendChild(listItem);

  const progressBar = listItem.querySelector(".progress");

  try {
    const form = new FormData();
    form.append("file", file);

    const res = await fetchWithTimeout(API_URL, { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));

    console.log("📦 Respuesta del servidor:", data);

    if (!res.ok || !data.ok) {
      const msg = data.error || `Error inesperado (${res.status})`;
      showErrorInList(file.name, msg);
      return;
    }

    progressBar.style.width = "100%";
    progressBar.classList.add("done");

    // ✅ Guardar el resultado
    filesDone.push(data.filename);

    // Crear botón de descarga individual
    const btn = document.createElement("a");
    btn.href = data.url;
    btn.download = data.filename;
    btn.textContent = "Descargar";
    btn.className = "download-btn";
    listItem.appendChild(btn);

  } catch (err) {
    console.error("❌ Error procesando:", err);
    showErrorInList(file.name, "Fallo la conexión con el servidor o tiempo de espera agotado.");
  } finally {
    processed++;
    if (processed === totalFiles) {
      zipBtn.classList.add("visible");
    }
  }
}

// 🧩 Manejador principal
async function handleFiles(event) {
  const files = event.target.files || [];
  totalFiles = files.length;
  processed = 0;
  filesDone = [];
  list.innerHTML = "";
  zipBtn.classList.remove("visible");

  for (const file of files) {
    handleFile(file);
  }
}

// 🧩 Crear ZIP
async function downloadZip() {
  if (!filesDone.length) return;
  try {
    const res = await fetch(ZIP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files: filesDone })
    });
    const data = await res.json();
    if (data.ok && data.zip) {
      const a = document.createElement("a");
      a.href = data.zip;
      a.download = "imagenes_comprimidas.zip";
      a.click();
    }
  } catch (e) {
    console.error("❌ Error al crear ZIP:", e);
    alert("No se pudo crear el ZIP.");
  }
}

// Eventos
uploadInput.addEventListener("change", handleFiles);
zipBtn.addEventListener("click", downloadZip);
