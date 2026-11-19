// Fixed scenes for screenshots: ?shot=cover draws one exported cover full-frame, the way
// the house apps shoot theirs; ?shot=editor shows the editor with a photo loaded.
// `photo` picks a sample (samples/<photo>.jpg) or `both` for the two samples together;
// `caption`, `subtitle`, `layout`, `grade` and `size` pick the scene. window.__shotReady
// is set once the cover is painted with its fonts loaded.
import { SIZES, defaultPanels } from './engine.js';

export async function runShot(query, state, helpers) {
  const shot = query.get('shot');
  const canvas = document.getElementById('preview');
  const caption = query.get('caption') || 'Sunset Heist';
  const subtitle = query.get('subtitle') || 'one last ride';
  const layout = query.get('layout') || 'quad';
  const grade = query.get('grade') || 'sunset';
  const sizeKey = query.get('size') || 'square';
  const photo = query.get('photo') || 'both';

  state.layout = layout;
  state.grade = grade;
  state.size = SIZES[sizeKey] ? sizeKey : 'square';
  state.title = caption;
  state.subtitle = subtitle;
  state.photos = [];
  if (photo === 'both') {
    state.photos.push(await helpers.loadSamplePhoto('boulevard'));
    state.photos.push(await helpers.loadSamplePhoto('pier'));
  } else {
    state.photos.push(await helpers.loadSamplePhoto(photo));
  }
  state.panels = defaultPanels(state.layout, state.photos, SIZES[state.size].w, SIZES[state.size].h);

  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    helpers.setSelectionVisible(false);
    // Size the canvas to the export size, then fit it to the viewport in CSS.
    const size = SIZES[state.size];
    canvas.width = size.w;
    canvas.height = size.h;
    canvas.style.aspectRatio = `${size.w} / ${size.h}`;
    await helpers.ensureFonts();
    helpers.redrawPreview();
  } else {
    helpers.setSelectionVisible(true);
    helpers.buildAll();
    await helpers.ensureFonts();
    helpers.redrawPreview();
  }
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
