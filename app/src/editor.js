// Cover Snap Pro — the editor: wires the page controls to the cover engine, keeps an
// undo history, and exports the cover as PNGs. A `?shot=` query hands control to the
// screenshot scenes instead (./shots.js).
import { LAYOUTS, GRADES, SIZES, renderCover, panelRects, defaultPanels, smartPan, layoutGeometry } from './engine.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('preview');
const ctx = canvas.getContext('2d');

const state = {
  layout: 'quad',
  grade: 'sunset',
  size: 'square',
  title: 'Sunset Heist',
  subtitle: 'one last ride',
  badge: 'Launch Week',
  heat: 4,
  grain: true,
  vignette: true,
  halftone: true,
  photos: [],
  panels: [],
};
let selectedPanel = 0;
let showSelection = true;
let history = [];
let future = [];
let fontsReady = false;

// The dashed outline around the selected panel is an editor aid: cover screenshots
// hide it, so the exported cover is what the judge sees.
export function setSelectionVisible(v) {
  showSelection = v;
}

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function loadSamplePhoto(name) {
  const img = await loadImage(`samples/${name}.jpg`);
  return { name, src: `samples/${name}.jpg`, img };
}

function snapshotState() {
  // The export size is a view choice, not content: undo never reverts it.
  return JSON.stringify({
    layout: state.layout,
    grade: state.grade,
    title: state.title,
    subtitle: state.subtitle,
    badge: state.badge,
    heat: state.heat,
    grain: state.grain,
    vignette: state.vignette,
    halftone: state.halftone,
    panels: state.panels,
    photoNames: state.photos.map((p) => p.name),
  });
}

function restoreSnapshot(json) {
  const s = JSON.parse(json);
  Object.assign(state, {
    layout: s.layout,
    grade: s.grade,
    title: s.title,
    subtitle: s.subtitle,
    badge: s.badge,
    heat: s.heat,
    grain: s.grain,
    vignette: s.vignette,
    halftone: s.halftone,
    panels: s.panels,
  });
  // Photos keep their images; only the assignment order is restored by name.
  state.panels.forEach((p) => {
    const idx = state.photos.findIndex((ph) => ph.name === s.photoNames[p.photo]);
    if (idx !== -1) p.photo = idx;
  });
  selectedPanel = Math.min(selectedPanel, state.panels.length - 1);
  syncControls();
  redrawPreview();
}

function pushHistory() {
  history.push(snapshotState());
  if (history.length > 60) history.shift();
  future = [];
  syncUndoButtons();
}

export function undo() {
  if (!history.length) return;
  future.push(snapshotState());
  restoreSnapshot(history.pop());
  syncUndoButtons();
}

export function redo() {
  if (!future.length) return;
  history.push(snapshotState());
  restoreSnapshot(future.pop());
  syncUndoButtons();
}

function syncUndoButtons() {
  $('undoBtn').disabled = history.length === 0;
  $('redoBtn').disabled = future.length === 0;
}

function redrawPreview() {
  const size = SIZES[state.size];
  if (canvas.width !== size.w || canvas.height !== size.h) {
    canvas.width = size.w;
    canvas.height = size.h;
  }
  renderCover(ctx, state, size.w, size.h);
  markSelectedPanel();
}

function markSelectedPanel() {
  if (!showSelection) return;
  const rects = panelRects(state, canvas.width, canvas.height);
  const r = rects[selectedPanel];
  if (!r) return;
  ctx.save();
  ctx.lineWidth = Math.max(3, canvas.width * 0.004);
  ctx.strokeStyle = '#ffd319';
  ctx.setLineDash([18, 10]);
  ctx.strokeRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4);
  ctx.restore();
  const pan = state.panels[selectedPanel];
  if (!pan) return;
  const photo = state.photos[pan.photo];
  $('selectedLabel').textContent = `Panel ${selectedPanel + 1} of ${state.panels.length} — ${photo ? photo.name : 'empty'} · drag to move, scroll to zoom`;
  $('zoomRange').value = String(Math.round(((pan.zoom || 1) - 0.6) / 1.4 * 100));
}

function buildLayoutPicker() {
  const row = $('layoutRow');
  row.innerHTML = '';
  for (const [key, def] of Object.entries(LAYOUTS)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick' + (state.layout === key ? ' active' : '');
    b.textContent = `${def.label} — ${def.blurb}`;
    b.title = def.blurb;
    b.addEventListener('click', () => {
      if (state.layout === key) return;
      pushHistory();
      state.layout = key;
      state.panels = defaultPanels(key, state.photos, canvas.width, canvas.height);
      selectedPanel = 0;
      buildLayoutPicker();
      buildPanelStrip();
      redrawPreview();
    });
    row.appendChild(b);
  }
}

function buildGradePicker() {
  const row = $('gradeRow');
  row.innerHTML = '';
  for (const [key, def] of Object.entries(GRADES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch grade-' + key + (state.grade === key ? ' active' : '');
    b.textContent = def.label;
    b.addEventListener('click', () => {
      if (state.grade === key) return;
      pushHistory();
      state.grade = key;
      buildGradePicker();
      redrawPreview();
    });
    row.appendChild(b);
  }
}

function buildSizePicker() {
  const row = $('sizeRow');
  row.innerHTML = '';
  for (const [key, def] of Object.entries(SIZES)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick' + (state.size === key ? ' active' : '');
    b.textContent = def.label;
    b.addEventListener('click', () => {
      if (state.size === key) return;
      state.size = key;
      buildSizePicker();
      redrawPreview();
    });
    row.appendChild(b);
  }
}

function buildPhotoTray() {
  const tray = $('tray');
  tray.innerHTML = '';
  state.photos.forEach((photo, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'thumb' + (state.panels[selectedPanel] && state.panels[selectedPanel].photo === i ? ' active' : '');
    const img = document.createElement('img');
    img.src = photo.src;
    img.alt = photo.name;
    b.appendChild(img);
    const span = document.createElement('span');
    span.textContent = photo.name;
    b.appendChild(span);
    b.addEventListener('click', () => assignPhotoToPanel(i));
    tray.appendChild(b);
  });
}

function buildPanelStrip() {
  const strip = $('panelStrip');
  strip.innerHTML = '';
  state.panels.forEach((pan, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick' + (i === selectedPanel ? ' active' : '');
    const photo = state.photos[pan.photo];
    b.textContent = `Panel ${i + 1} · ${photo ? photo.name : 'empty'}`;
    b.addEventListener('click', () => {
      selectedPanel = i;
      buildPanelStrip();
      buildPhotoTray();
      redrawPreview();
    });
    strip.appendChild(b);
  });
}

export function selectPanel(i) {
  selectedPanel = Math.max(0, Math.min(i, state.panels.length - 1));
  buildPanelStrip();
  buildPhotoTray();
  redrawPreview();
}

function assignPhotoToPanel(photoIndex) {
  const pan = state.panels[selectedPanel];
  if (!pan || pan.photo === photoIndex) return;
  pushHistory();
  pan.photo = photoIndex;
  buildPhotoTray();
  redrawPreview();
}

function fillAllPanels(photoIndex) {
  pushHistory();
  const geo = layoutGeometry(state.layout, canvas.width, canvas.height);
  const frameAspect = geo.frame.w / geo.frame.h;
  const img = state.photos[photoIndex] && state.photos[photoIndex].img;
  state.panels.forEach((pan, i) => {
    pan.photo = photoIndex;
    if (img) {
      const smart = smartPan(geo.panels[i], img, i, frameAspect);
      pan.px = smart.px;
      pan.py = smart.py;
      pan.zoom = smart.zoom;
    }
  });
  buildPhotoTray();
  redrawPreview();
}

function syncControls() {
  $('titleInput').value = state.title;
  $('subtitleInput').value = state.subtitle;
  $('badgeInput').value = state.badge;
  $('heatInput').value = String(state.heat);
  $('heatVal').textContent = `${state.heat} / 5`;
  $('grainToggle').checked = state.grain;
  $('vignetteToggle').checked = state.vignette;
  $('halftoneToggle').checked = state.halftone;
  buildLayoutPicker();
  buildGradePicker();
  buildSizePicker();
  buildPanelStrip();
  buildPhotoTray();
}

function renderToCanvas(sizeKey) {
  const size = SIZES[sizeKey];
  const off = document.createElement('canvas');
  off.width = size.w;
  off.height = size.h;
  renderCover(off.getContext('2d'), state, size.w, size.h);
  return off;
}

function downloadCanvas(off, filename) {
  return new Promise((resolve) => {
    off.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      resolve();
    }, 'image/png');
  });
}

export async function exportCover(sizeKey) {
  const off = renderToCanvas(sizeKey || state.size);
  await downloadCanvas(off, `cover-${SIZES[sizeKey || state.size].w}x${SIZES[sizeKey || state.size].h}.png`);
  $('status').textContent = `Saved cover-${SIZES[sizeKey || state.size].w}x${SIZES[sizeKey || state.size].h}.png`;
}

export async function exportAllSizes() {
  for (const key of Object.keys(SIZES)) {
    await exportCover(key);
    await new Promise((r) => setTimeout(r, 250));
  }
  $('status').textContent = 'Saved all three sizes: square, portrait and wide.';
}

function setupDragEditing() {
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let moved = false;
  const toCanvas = (e) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };
  canvas.addEventListener('pointerdown', (e) => {
    const p = toCanvas(e);
    const rects = panelRects(state, canvas.width, canvas.height);
    const hit = rects.findIndex((r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h);
    if (hit === -1) return;
    dragging = true;
    moved = false;
    lastX = p.x;
    lastY = p.y;
    if (hit !== selectedPanel) selectPanel(hit);
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const p = toCanvas(e);
    const pan = state.panels[selectedPanel];
    const rects = panelRects(state, canvas.width, canvas.height);
    const r = rects[selectedPanel];
    if (!pan || !r) return;
    const dx = (p.x - lastX) / r.w;
    const dy = (p.y - lastY) / r.h;
    if (Math.abs(p.x - lastX) + Math.abs(p.y - lastY) > 2) moved = true;
    pan.px = Math.max(-0.6, Math.min(0.6, (pan.px || 0) + dx));
    pan.py = Math.max(-0.6, Math.min(0.6, (pan.py || 0) + dy));
    lastX = p.x;
    lastY = p.y;
    redrawPreview();
  });
  canvas.addEventListener('pointerup', () => {
    if (dragging && moved) pushHistory();
    dragging = false;
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const pan = state.panels[selectedPanel];
    if (!pan) return;
    const before = pan.zoom || 1;
    pan.zoom = Math.max(0.6, Math.min(2.0, before * (e.deltaY < 0 ? 1.06 : 0.94)));
    if (Math.abs(pan.zoom - before) > 0.001) {
      redrawPreview();
      clearTimeout(canvas._zoomTimer);
      canvas._zoomTimer = setTimeout(pushHistory, 400);
    }
  }, { passive: false });
}

function wireControls() {
  $('photoInput').addEventListener('change', async (e) => {
    const files = [...e.target.files];
    if (!files.length) return;
    for (const file of files) {
      const url = URL.createObjectURL(file);
      const img = await loadImage(url);
      state.photos.push({ name: file.name.replace(/\.[^.]+$/, ''), src: url, img });
    }
    if (!state.panels.length) state.panels = defaultPanels(state.layout, state.photos, canvas.width, canvas.height);
    buildPhotoTray();
    redrawPreview();
    $('status').textContent = `${files.length} photo${files.length > 1 ? 's' : ''} added — click a photo, then a panel, to place it.`;
    e.target.value = '';
  });
  $('fillAllBtn').addEventListener('click', () => {
    const pan = state.panels[selectedPanel];
    if (pan) fillAllPanels(pan.photo);
  });
  $('titleInput').addEventListener('input', (e) => { state.title = e.target.value; redrawPreview(); });
  $('titleInput').addEventListener('change', pushHistory);
  $('subtitleInput').addEventListener('input', (e) => { state.subtitle = e.target.value; redrawPreview(); });
  $('subtitleInput').addEventListener('change', pushHistory);
  $('badgeInput').addEventListener('input', (e) => { state.badge = e.target.value; redrawPreview(); });
  $('badgeInput').addEventListener('change', pushHistory);
  $('heatInput').addEventListener('input', (e) => {
    state.heat = Number(e.target.value);
    $('heatVal').textContent = `${state.heat} / 5`;
    redrawPreview();
  });
  $('heatInput').addEventListener('change', pushHistory);
  $('grainToggle').addEventListener('change', (e) => { pushHistory(); state.grain = e.target.checked; redrawPreview(); });
  $('vignetteToggle').addEventListener('change', (e) => { pushHistory(); state.vignette = e.target.checked; redrawPreview(); });
  $('halftoneToggle').addEventListener('change', (e) => { pushHistory(); state.halftone = e.target.checked; redrawPreview(); });
  $('zoomRange').addEventListener('input', (e) => {
    const pan = state.panels[selectedPanel];
    if (!pan) return;
    pan.zoom = 0.6 + (Number(e.target.value) / 100) * 1.4;
    redrawPreview();
  });
  $('zoomRange').addEventListener('change', pushHistory);
  $('exportBtn').addEventListener('click', () => exportCover());
  $('exportAllBtn').addEventListener('click', exportAllSizes);
  $('undoBtn').addEventListener('click', undo);
  $('redoBtn').addEventListener('click', redo);
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
  });
  setupDragEditing();
  syncUndoButtons();
}

async function ensureFonts() {
  if (fontsReady) return;
  try {
    await Promise.all([
      document.fonts.load('40px Anton'),
      document.fonts.load('20px Pacifico'),
      document.fonts.ready,
    ]);
  } catch { /* fall back to system fonts */ }
  fontsReady = true;
}

// The editor's public setup, also used by the screenshot scenes.
export async function startEditor() {
  const query = new URLSearchParams(location.search);
  if (query.get('shot')) {
    await runShot(query, state, {
      loadSamplePhoto,
      loadImage,
      redrawPreview,
      selectPanel,
      setSelectionVisible,
      buildAll: syncControls,
      ensureFonts,
    });
    return;
  }
  wireControls();
  state.photos.push(await loadSamplePhoto('boulevard'), await loadSamplePhoto('pier'));
  state.panels = defaultPanels(state.layout, state.photos, canvas.width, canvas.height);
  syncControls();
  await ensureFonts();
  redrawPreview();
}

startEditor();
