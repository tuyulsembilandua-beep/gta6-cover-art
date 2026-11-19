// Cover Snap Pro — the cover engine: layouts, colour grades, lettering and effects.
// Renders the whole cover onto any 2D canvas context, at any size, from a plain state
// object. The editor and the screenshot scenes both call renderCover; the export path
// renders the same state at full post size, so what the preview shows is what the PNG is.

export const SIZES = {
  square: { label: 'Square 1080 x 1080', w: 1080, h: 1080 },
  portrait: { label: 'Portrait 1080 x 1350', w: 1080, h: 1350 },
  wide: { label: 'Wide 1920 x 1080', w: 1920, h: 1080 },
};

export const LAYOUTS = {
  quad: { label: 'Four Corners', panels: 4, blurb: '2 x 2 poster grid' },
  hero: { label: 'Hero + Three', panels: 4, blurb: 'Big hero, three moments' },
  bleed: { label: 'Full Bleed', panels: 1, blurb: 'One photo, edge to edge' },
  six: { label: 'Six Strip', panels: 6, blurb: '3 x 2 strip grid' },
  nine: { label: 'Nine Grid', panels: 8, blurb: '3 x 3 grid, title at the centre' },
  tilt: { label: 'Tilted Snaps', panels: 3, blurb: 'Overlapping tilted snapshots' },
};

export const GRADES = {
  sunset: { label: 'Vice Sunset', filter: 'saturate(1.18) contrast(1.06)' },
  neon: { label: 'Neon Night', filter: 'saturate(1.35) contrast(1.08)' },
  golden: { label: 'Golden Hour', filter: 'sepia(0.28) saturate(1.25) contrast(1.04)' },
  teal: { label: 'Teal Noir', filter: 'saturate(1.12) contrast(1.1)' },
  rose: { label: 'Rose Dusk', filter: 'saturate(1.28) contrast(1.05)' },
  mono: { label: 'Mono Heat', filter: 'grayscale(1) contrast(1.12)' },
};

// Overlay washes each grade paints over every photo, in order. A wash is either a flat
// colour or a vertical gradient; composite is a canvas globalCompositeOperation.
const GRADE_WASHES = {
  sunset: [
    { op: 'overlay', fill: 'rgba(255,120,40,0.22)' },
    { op: 'soft-light', top: 'rgba(255,41,117,0)', bottom: 'rgba(255,41,117,0.42)' },
    { op: 'screen', fill: 'rgba(255,190,90,0.10)' },
  ],
  neon: [
    { op: 'overlay', fill: 'rgba(255,41,150,0.20)' },
    { op: 'soft-light', top: 'rgba(0,229,255,0.30)', bottom: 'rgba(255,41,150,0.30)' },
    { op: 'screen', fill: 'rgba(140,30,255,0.10)' },
  ],
  golden: [
    { op: 'overlay', fill: 'rgba(255,170,40,0.24)' },
    { op: 'soft-light', top: 'rgba(255,210,110,0.10)', bottom: 'rgba(180,90,10,0.35)' },
  ],
  teal: [
    { op: 'overlay', fill: 'rgba(0,190,190,0.16)' },
    { op: 'soft-light', top: 'rgba(0,120,140,0.35)', bottom: 'rgba(255,130,40,0.28)' },
    { op: 'multiply', fill: 'rgba(10,40,60,0.12)' },
  ],
  rose: [
    { op: 'overlay', fill: 'rgba(255,90,160,0.22)' },
    { op: 'soft-light', top: 'rgba(140,30,255,0.25)', bottom: 'rgba(255,41,117,0.38)' },
  ],
  mono: [
    { op: 'overlay', fill: 'rgba(255,150,60,0.14)' },
    { op: 'soft-light', top: 'rgba(255,255,255,0.05)', bottom: 'rgba(20,5,30,0.35)' },
  ],
};

function frameOf(w, h) {
  // The white poster frame every cover sits inside.
  const b = Math.max(6, Math.round(Math.min(w, h) * 0.012));
  return { x: b, y: b, w: w - 2 * b, h: h - 2 * b, b };
}

function gutterOf(w, h) {
  return Math.max(3, Math.round(Math.min(w, h) * 0.007));
}

// Panel rectangles (fractions of the framed area) and where the title lives, per layout.
// A panel is {x, y, w, h, rot} in fractions; title is {kind: 'band'|'cell', ...}.
export function layoutGeometry(layout, w, h) {
  const f = frameOf(w, h);
  const g = gutterOf(w, h) / f.w; // gutter as a fraction of the framed width
  const gh = gutterOf(w, h) / f.h;
  const bandH = 0.26; // title band height, as a fraction of the framed height
  const areaH = 1 - bandH - gh; // photo area above the band
  // A cols x rows grid of panels inside the photo area, with gutters.
  const cleanGrid = (cols, rows, top = 0, height = areaH) => {
    const out = [];
    const cw = (1 - (cols - 1) * g) / cols;
    const ch = (height - (rows - 1) * gh) / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        out.push({ x: c * (cw + g), y: top + r * (ch + gh), w: cw, h: ch, rot: 0 });
      }
    }
    return out;
  };
  switch (layout) {
    case 'hero': {
      const heroW = 0.6 - g / 2;
      const sideW = 1 - heroW - g;
      const sh = (areaH - 2 * gh) / 3;
      return {
        frame: f,
        panels: [
          { x: 0, y: 0, w: heroW, h: areaH, rot: 0 },
          { x: heroW + g, y: 0, w: sideW, h: sh, rot: 0 },
          { x: heroW + g, y: sh + gh, w: sideW, h: sh, rot: 0 },
          { x: heroW + g, y: 2 * (sh + gh), w: sideW, h: sh, rot: 0 },
        ],
        title: { kind: 'band', y: areaH + gh, h: bandH },
      };
    }
    case 'bleed':
      return {
        frame: f,
        panels: [{ x: 0, y: 0, w: 1, h: 1, rot: 0 }],
        title: { kind: 'scrim', y: 1 - 0.34, h: 0.34 },
      };
    case 'six':
      return { frame: f, panels: cleanGrid(3, 2), title: { kind: 'band', y: areaH + gh, h: bandH } };
    case 'nine': {
      const all = cleanGrid(3, 3, 0, 1);
      const centre = all[4]; // the middle cell becomes the title block
      const panels = all.filter((_, i) => i !== 4);
      return { frame: f, panels, title: { kind: 'cell', x: centre.x, y: centre.y, w: centre.w, h: centre.h } };
    }
    case 'tilt': {
      // Cards live inside the photo area above the title band (fractions of areaH).
      // They overlap, but the lower card sits low enough that the faces in the two
      // upper cards stay visible above its top edge.
      const cw = 0.48;
      const chh = 0.66 * areaH;
      return {
        frame: f,
        panels: [
          { x: 0.01, y: 0.02 * areaH, w: cw, h: chh, rot: -4 },
          { x: 0.51, y: 0.08 * areaH, w: cw, h: chh, rot: 3 },
          { x: 0.25, y: 0.34 * areaH, w: cw, h: chh, rot: -1.5 },
        ],
        title: { kind: 'band', y: areaH + gh, h: bandH },
        tiltBackdrop: true,
      };
    }
    case 'quad':
    default:
      return { frame: f, panels: cleanGrid(2, 2), title: { kind: 'band', y: areaH + gh, h: bandH } };
  }
}

function coverFitDraw(ctx, img, px, py, pw, ph, pan) {
  // Draws the image cover-fitting the panel rect, with the user's pan and zoom.
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const base = Math.max(pw / iw, ph / ih);
  const s = base * (pan.zoom || 1);
  const dw = iw * s;
  const dh = ih * s;
  const dx = px + (pw - dw) / 2 + (pan.px || 0) * pw;
  const dy = py + (ph - dh) / 2 + (pan.py || 0) * ph;
  ctx.drawImage(img, dx, dy, dw, dh);
}

function paintGradeWash(ctx, grade, px, py, pw, ph) {
  for (const wash of GRADE_WASHES[grade] || GRADE_WASHES.sunset) {
    ctx.save();
    ctx.globalCompositeOperation = wash.op;
    if (wash.fill) {
      ctx.fillStyle = wash.fill;
      ctx.fillRect(px, py, pw, ph);
    } else {
      const grad = ctx.createLinearGradient(0, py, 0, py + ph);
      grad.addColorStop(0, wash.top);
      grad.addColorStop(1, wash.bottom);
      ctx.fillStyle = grad;
      ctx.fillRect(px, py, pw, ph);
    }
    ctx.restore();
  }
}

function drawStar(ctx, cx, cy, r, fill) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const x = cx + Math.cos(ang) * rad;
    const y = cy + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = '#ffd319';
    ctx.fill();
  }
  ctx.lineWidth = Math.max(1.5, r * 0.12);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.stroke();
}

function fitTitleLines(ctx, text, maxWidth, startSize, minSize, fontName) {
  // One line if it fits; otherwise split at the space nearest the middle.
  const words = text.trim().split(/\s+/);
  const oneLine = () => {
    let size = startSize;
    ctx.font = `${size}px ${fontName}`;
    while (ctx.measureText(text).width > maxWidth && size > minSize) {
      size -= 2;
      ctx.font = `${size}px ${fontName}`;
    }
    return { lines: [text], size };
  };
  const whole = oneLine();
  if (whole.size > startSize * 0.62 || words.length < 2) return whole;
  let best = 1;
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' ');
    const b = words.slice(i).join(' ');
    const diff = Math.abs(a.length - b.length);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = i;
    }
  }
  const lines = [words.slice(0, best).join(' '), words.slice(best).join(' ')];
  let size = startSize;
  ctx.font = `${size}px ${fontName}`;
  while (lines.some((l) => ctx.measureText(l).width > maxWidth) && size > minSize) {
    size -= 2;
    ctx.font = `${size}px ${fontName}`;
  }
  return { lines, size };
}

function sunsetTextGradient(ctx, x, yTop, yBottom) {
  const grad = ctx.createLinearGradient(0, yTop, 0, yBottom);
  grad.addColorStop(0, '#fff7ad');
  grad.addColorStop(0.45, '#ffd319');
  grad.addColorStop(0.75, '#ff2975');
  grad.addColorStop(1, '#b537f2');
  return grad;
}

function drawTitleBlock(ctx, state, box, scale) {
  // The title, subtitle, heat stars and badge, drawn inside `box` (absolute pixels).
  // blockH is measured from the real metrics — cap height of the title, the subtitle
  // offset and the stars — so the block centres instead of spilling past the band.
  const { x, y, w, h } = box;
  const cx = x + w / 2;
  if (state.halftone) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    const step = Math.max(10, 15 * scale);
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    for (let yy = y + step / 2; yy < y + h; yy += step) {
      for (let xx = x + step / 2 + ((Math.round((yy - y) / step) % 2) * step) / 2; xx < x + w; xx += step) {
        ctx.beginPath();
        ctx.arc(xx, yy, Math.max(1, 2.1 * scale), 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }
  const title = (state.title || '').trim().toUpperCase() || 'UNTITLED';
  const subtitle = (state.subtitle || '').trim();
  const maxW = w * 0.92;
  const startSize = Math.min(h * 0.42, w * 0.28);
  const { lines, size } = fitTitleLines(ctx, title, maxW, startSize, 14, 'Anton, sans-serif');
  const lineH = size * 1.04;
  const subSize = subtitle ? Math.max(12, size * 0.34) : 0;
  const starR = Math.max(7, size * 0.11);
  const blockH =
    size * 0.72 +
    lines.length * lineH +
    (subtitle ? subSize * 1.65 : size * 0.25) +
    starR * 1.9;
  let ty = y + (h - blockH) / 2 + size * 0.72;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = size * 0.12;
  ctx.shadowOffsetY = size * 0.03;
  ctx.lineJoin = 'round';
  ctx.lineWidth = Math.max(2, size * 0.055);
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.fillStyle = sunsetTextGradient(ctx, cx, ty - size, ty + size * 0.4);
  for (const line of lines) {
    ctx.font = `${size}px Anton, sans-serif`;
    ctx.strokeText(line, cx, ty);
    ctx.fillText(line, cx, ty);
    ty += lineH;
  }
  ctx.restore();
  if (subtitle) {
    ctx.font = `${subSize}px Pacifico, cursive`;
    ctx.save();
    ctx.shadowColor = '#ff2975';
    ctx.shadowBlur = subSize * 0.55;
    ctx.fillStyle = '#ff9de2';
    ctx.fillText(subtitle, cx, ty + subSize * 0.55);
    ctx.restore();
    ty += subSize * 1.1;
  } else {
    ty += size * 0.25;
  }
  const heat = Math.max(0, Math.min(5, state.heat ?? 4));
  const gap = starR * 2.5;
  const totalW = 5 * starR * 2 + 4 * (gap - starR * 2) + 4 * starR * 0.5;
  let sx = cx - totalW / 2 + starR;
  const sy = ty + starR * 0.9;
  for (let i = 0; i < 5; i++) {
    drawStar(ctx, sx, sy, starR, i < heat);
    sx += gap;
  }
}

// A diagonal ribbon across the top-right corner with the badge text. The strip is
// rotated about the corner itself and dropped down-left along the diagonal, so the text
// sits inside the cover while the strip's ends bleed off the top and right edges.
function drawBadgeRibbon(ctx, state, w, h, scale) {
  const badge = (state.badge || '').trim();
  if (!badge) return;
  const size = Math.max(13, 30 * scale);
  ctx.save();
  ctx.font = `${size}px Anton, sans-serif`;
  const tw = ctx.measureText(badge.toUpperCase()).width;
  const ribbonW = tw + size * 2.6;
  const ribbonH = size * 1.9;
  const drop = ribbonH * 2.1;
  ctx.translate(w, 0);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = '#ff2975';
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 8 * scale;
  ctx.fillRect(-ribbonW * 1.5, drop - ribbonH / 2, ribbonW * 3, ribbonH);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(badge.toUpperCase(), 0, drop);
  ctx.restore();
}

let noisePattern = null;
function getNoise(ctx) {
  if (noisePattern) return noisePattern;
  const n = document.createElement('canvas');
  n.width = 140;
  n.height = 140;
  const nctx = n.getContext('2d');
  const data = nctx.createImageData(140, 140);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = 110 + Math.floor(Math.random() * 90);
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  nctx.putImageData(data, 0, 0);
  noisePattern = ctx.createPattern(n, 'repeat');
  return noisePattern;
}

export function renderCover(ctx, state, w, h) {
  const geo = layoutGeometry(state.layout || 'quad', w, h);
  const { frame: f } = geo;
  const scale = Math.min(w, h) / 1080;
  const grade = GRADES[state.grade] ? state.grade : 'sunset';
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  // White poster frame.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  // Deep sunset backdrop (shows through the gutters and behind tilted cards).
  const bg = ctx.createLinearGradient(0, f.y, 0, f.y + f.h);
  bg.addColorStop(0, '#2b0a4a');
  bg.addColorStop(0.5, '#7a1030');
  bg.addColorStop(1, '#ff7a18');
  ctx.fillStyle = bg;
  ctx.fillRect(f.x, f.y, f.w, f.h);
  const photos = state.photos || [];
  const panels = state.panels || [];
  geo.panels.forEach((panel, i) => {
    const pan = panels[i] || { photo: i % Math.max(1, photos.length), px: 0, py: 0, zoom: 1 };
    const px = f.x + panel.x * f.w;
    const py = f.y + panel.y * f.h;
    const pw = panel.w * f.w;
    const ph = panel.h * f.h;
    const img = photos[pan.photo] && photos[pan.photo].img;
    ctx.save();
    ctx.beginPath();
    if (panel.rot) {
      ctx.translate(px + pw / 2, py + ph / 2);
      ctx.rotate((panel.rot * Math.PI) / 180);
      ctx.rect(-pw / 2, -ph / 2, pw, ph);
    } else {
      ctx.rect(px, py, pw, ph);
    }
    ctx.clip();
    if (img) {
      ctx.save();
      if (panel.rot) ctx.translate(0, 0);
      ctx.filter = GRADES[grade].filter;
      if (panel.rot) {
        coverFitDraw(ctx, img, -pw / 2, -ph / 2, pw, ph, pan);
      } else {
        coverFitDraw(ctx, img, px, py, pw, ph, pan);
      }
      ctx.restore();
      if (panel.rot) {
        paintGradeWash(ctx, grade, -pw / 2, -ph / 2, pw, ph);
      } else {
        paintGradeWash(ctx, grade, px, py, pw, ph);
      }
    } else {
      ctx.fillStyle = '#3a1445';
      ctx.fillRect(panel.rot ? -pw / 2 : px, panel.rot ? -ph / 2 : py, pw, ph);
    }
    ctx.restore();
    // Card edge: tilted snapshots get a white polaroid border and a shadow.
    ctx.save();
    if (panel.rot) {
      ctx.translate(px + pw / 2, py + ph / 2);
      ctx.rotate((panel.rot * Math.PI) / 180);
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 18 * scale;
      ctx.shadowOffsetY = 8 * scale;
      ctx.lineWidth = Math.max(4, 10 * scale);
      ctx.strokeStyle = '#ffffff';
      ctx.strokeRect(-pw / 2, -ph / 2, pw, ph);
    } else {
      ctx.lineWidth = Math.max(1, 2 * scale);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.strokeRect(px, py, pw, ph);
    }
    ctx.restore();
  });
  // Title: a band, a scrim over a full-bleed photo, or the centre cell of the nine grid.
  const t = geo.title;
  if (t.kind === 'band') {
    const bx = f.x;
    const by = f.y + t.y * f.h;
    const bh = t.h * f.h;
    const band = ctx.createLinearGradient(0, by, 0, by + bh);
    band.addColorStop(0, '#1c0533');
    band.addColorStop(0.55, '#4a0a3d');
    band.addColorStop(1, '#8a1030');
    ctx.fillStyle = band;
    ctx.fillRect(bx, by, f.w, bh);
    ctx.fillStyle = '#ffd319';
    ctx.fillRect(bx, by, f.w, Math.max(2, 4 * scale));
    drawTitleBlock(ctx, state, { x: bx, y: by, w: f.w, h: bh }, scale);
  } else if (t.kind === 'scrim') {
    const by = f.y + t.y * f.h;
    const bh = t.h * f.h;
    const scrim = ctx.createLinearGradient(0, by - bh * 0.4, 0, by + bh);
    scrim.addColorStop(0, 'rgba(12,4,28,0)');
    scrim.addColorStop(0.45, 'rgba(12,4,28,0.55)');
    scrim.addColorStop(1, 'rgba(12,4,28,0.92)');
    ctx.fillStyle = scrim;
    ctx.fillRect(f.x, by - bh * 0.4, f.w, bh * 1.4);
    drawTitleBlock(ctx, state, { x: f.x, y: by, w: f.w, h: bh }, scale);
  } else {
    const cx0 = f.x + t.x * f.w;
    const cy0 = f.y + t.y * f.h;
    const cw = t.w * f.w;
    const ch = t.h * f.h;
    const cell = ctx.createLinearGradient(0, cy0, 0, cy0 + ch);
    cell.addColorStop(0, '#ff7a18');
    cell.addColorStop(0.5, '#ff2975');
    cell.addColorStop(1, '#7a1030');
    ctx.fillStyle = cell;
    ctx.fillRect(cx0, cy0, cw, ch);
    drawTitleBlock(ctx, state, { x: cx0, y: cy0, w: cw, h: ch }, scale);
  }
  drawBadgeRibbon(ctx, state, w, h, scale);
  // Grain and vignette over the whole cover.
  if (state.grain !== false) {
    ctx.save();
    ctx.globalAlpha = 0.07;
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = getNoise(ctx);
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  if (state.vignette !== false) {
    const vg = ctx.createRadialGradient(
      w / 2, h / 2, Math.min(w, h) * 0.42,
      w / 2, h / 2, Math.max(w, h) * 0.75,
    );
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,0.30)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}

// Panel rectangles in canvas pixels, for hit-testing clicks in the editor.
export function panelRects(state, w, h) {
  const geo = layoutGeometry(state.layout || 'quad', w, h);
  const { frame: f } = geo;
  return geo.panels.map((p) => ({
    x: f.x + p.x * f.w,
    y: f.y + p.y * f.h,
    w: p.w * f.w,
    h: p.h * f.h,
  }));
}

// The default crop for one photo in one panel: bias toward the top of the photo (where
// faces are) when the panel crops vertically, and vary the side shown when it crops
// horizontally, so the same photo reads as a different moment in each panel.
// panel.w/h are fractions of the frame's width/height, so the true aspect needs the
// frame's own aspect: aspect = (panel.w / panel.h) * frameAspect.
export function smartPan(panel, img, index, frameAspect = 1) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const panelAspect = (panel.w / panel.h) * frameAspect;
  const imgAspect = iw / ih;
  if (panelAspect > imgAspect) {
    // The panel is wider than the photo: the crop eats the top and bottom. A positive
    // py moves the photo down, so the visible window shows the photo's top, where
    // faces are. The window can shift by (pa/ia - 1) / 2 before it hits the edge;
    // aim for 85% of that, so the face sits in frame with a little sky above it.
    const maxShift = (panelAspect / imgAspect - 1) / 2;
    return {
      photo: 0,
      px: [0, 0.05, -0.05][index % 3],
      py: Math.min(0.9, 0.85 * maxShift),
      zoom: 1 + (index % 3) * 0.05,
    };
  }
  // The panel is taller: the crop eats the sides; vary which side shows.
  return {
    photo: 0,
    px: [-0.1, 0.1, 0, -0.06][index % 4],
    py: 0.03,
    zoom: 1 + (index % 3) * 0.06,
  };
}

export function defaultPanels(layout, photos, w = 1080, h = 1080) {
  const geo = layoutGeometry(layout, w, h);
  const frameAspect = geo.frame.w / geo.frame.h;
  const count = LAYOUTS[layout].panels;
  const out = [];
  for (let i = 0; i < count; i++) {
    const img = photos.length ? photos[i % photos.length].img : null;
    const pan = img ? smartPan(geo.panels[i], img, i, frameAspect) : { photo: 0, px: 0, py: 0, zoom: 1 };
    pan.photo = photos.length ? i % photos.length : 0;
    out.push(pan);
  }
  return out;
}
