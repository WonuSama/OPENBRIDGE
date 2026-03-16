const state = {
  currentPath: '',
  selectedFile: null,
  scope: 'workspace',
};

const els = {
  refreshAll: document.getElementById('refreshAll'),
  healthBadge: document.getElementById('healthBadge'),
  totalFiles: document.getElementById('totalFiles'),
  totalDirs: document.getElementById('totalDirs'),
  totalSize: document.getElementById('totalSize'),
  largestList: document.getElementById('largestList'),
  recentList: document.getElementById('recentList'),
  currentPath: document.getElementById('currentPath'),
  scopeSelect: document.getElementById('scopeSelect'),
  goUp: document.getElementById('goUp'),
  treeBody: document.getElementById('treeBody'),
  fileMeta: document.getElementById('fileMeta'),
  fileContent: document.getElementById('fileContent'),
  saveFile: document.getElementById('saveFile'),
};

function fmtBytes(bytes) {
  const v = Number(bytes || 0);
  if (v < 1024) return `${v} B`;
  if (v < 1024 ** 2) return `${(v / 1024).toFixed(1)} KB`;
  if (v < 1024 ** 3) return `${(v / 1024 ** 2).toFixed(1)} MB`;
  return `${(v / 1024 ** 3).toFixed(2)} GB`;
}

function fmtDate(epochSec) {
  if (!epochSec) return '-';
  return new Date(Number(epochSec) * 1000).toLocaleString();
}

async function api(url, options) {
  const r = await fetch(url, options);
  const data = await r.json();
  if (!r.ok) {
    throw new Error(data.error || 'Error API');
  }
  return data;
}

async function loadHealth() {
  try {
    const data = await api('/api/health');
    const up = /Gateway reachable|active/.test(data.output || '');
    els.healthBadge.textContent = up ? 'Conectado' : 'Sin alcance';
    els.healthBadge.className = `badge ${up ? 'ok' : 'err'}`;
  } catch (e) {
    els.healthBadge.textContent = `Error: ${e.message}`;
    els.healthBadge.className = 'badge err';
  }
}

async function loadStats() {
  const stats = await api(`/api/workspace/stats?scope=${encodeURIComponent(state.scope)}`);
  els.totalFiles.textContent = stats.totalFiles;
  els.totalDirs.textContent = stats.totalDirs;
  els.totalSize.textContent = fmtBytes(stats.totalSize);

  els.largestList.innerHTML = stats.largest
    .map((i) => `<li><strong>${i.path}</strong><br>${fmtBytes(i.size)}</li>`)
    .join('') || '<li>Sin datos</li>';

  els.recentList.innerHTML = stats.recent
    .map((i) => `<li><strong>${i.path}</strong><br>${fmtDate(i.mtimeEpoch)}</li>`)
    .join('') || '<li>Sin datos</li>';
}

async function loadTree(path = '') {
  const data = await api(`/api/workspace/tree?scope=${encodeURIComponent(state.scope)}&path=${encodeURIComponent(path)}`);
  state.currentPath = data.currentPath;
  els.currentPath.textContent = '/' + (data.currentPath || '');

  const rows = [];
  if (data.parentPath !== null) {
    rows.push(`<tr data-clickable="true" data-type="up" data-path="${data.parentPath}"><td>..</td><td>Subir</td><td>-</td><td>-</td></tr>`);
  }

  for (const item of data.items) {
    rows.push(`<tr data-clickable="true" data-type="${item.type}" data-path="${item.path}">
      <td>${item.type === 'directory' ? 'DIR' : 'FILE'}</td>
      <td>${item.name}</td>
      <td>${item.type === 'file' ? fmtBytes(item.size) : '-'}</td>
      <td>${fmtDate(item.mtimeEpoch)}</td>
    </tr>`);
  }

  els.treeBody.innerHTML = rows.join('') || '<tr><td colspan="4">Directorio vacio</td></tr>';
}

async function openFile(filePath) {
  const data = await api(`/api/workspace/file?scope=${encodeURIComponent(state.scope)}&path=${encodeURIComponent(filePath)}`);
  state.selectedFile = data.path;
  els.fileMeta.textContent = `${data.path} | ${data.mimeType} | ${fmtBytes(data.size)}`;

  if (!data.isText) {
    els.fileContent.value = 'Archivo binario/no texto. No editable desde dashboard.';
    els.fileContent.disabled = true;
    els.saveFile.disabled = true;
    return;
  }

  els.fileContent.value = data.content;
  els.fileContent.disabled = false;
  els.saveFile.disabled = false;
}

async function saveFile() {
  if (!state.selectedFile) return;
  els.saveFile.disabled = true;
  try {
    await api('/api/workspace/file', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scope: state.scope,
        path: state.selectedFile,
        content: els.fileContent.value,
      }),
    });
    els.fileMeta.textContent = `${state.selectedFile} | guardado OK`;
    await loadTree(state.currentPath);
  } catch (e) {
    els.fileMeta.textContent = `Error al guardar: ${e.message}`;
  } finally {
    els.saveFile.disabled = false;
  }
}

function wireEvents() {
  els.refreshAll.addEventListener('click', async () => {
    await Promise.all([loadHealth(), loadStats(), loadTree(state.currentPath)]);
  });

  els.scopeSelect.addEventListener('change', async () => {
    state.scope = els.scopeSelect.value;
    state.currentPath = '';
    state.selectedFile = null;
    els.fileContent.value = '';
    els.fileMeta.textContent = 'Selecciona un archivo...';
    els.saveFile.disabled = true;
    await Promise.all([loadStats(), loadTree('')]);
  });

  els.goUp.addEventListener('click', async () => {
    if (!state.currentPath) return;
    const parent = state.currentPath.includes('/')
      ? state.currentPath.substring(0, state.currentPath.lastIndexOf('/'))
      : '';
    await loadTree(parent);
  });

  els.treeBody.addEventListener('click', async (event) => {
    const tr = event.target.closest('tr[data-clickable="true"]');
    if (!tr) return;

    const type = tr.dataset.type;
    const rowPath = tr.dataset.path || '';

    if (type === 'directory' || type === 'up') {
      await loadTree(rowPath);
      return;
    }

    if (type === 'file') {
      await openFile(rowPath);
    }
  });

  els.saveFile.addEventListener('click', saveFile);
}

(async function init() {
  wireEvents();
  await Promise.all([loadHealth(), loadStats(), loadTree('')]);
})();
