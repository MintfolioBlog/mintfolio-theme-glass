/**
 * Liquid Glass optics for the navigation layer (tab bar, search button, sidebar,
 * toolbar buttons) and the tab bar's drag lens. CSS frosted glass is the baseline;
 * refraction is an enhancement on top of it.
 *
 * Chromium refracts the live backdrop with an SVG filter built here for each surface:
 * - a displacement map for the surface's rounded shape, generated on a canvas. The rim
 *   bends the backdrop inward like the edge of a convex pane, the middle stays clear;
 *   the drag lens also magnifies, like a drop of water;
 * - chromatic dispersion: red, green and blue are displaced separately with slightly
 *   different strengths (blue bends most) and added back together, so the rim splits
 *   light into color fringes instead of smearing it;
 * - only a light blur and a small saturation lift, so the glass stays clear.
 *
 * Other engines cannot use SVG filters in backdrop-filter. There the visible primary
 * surface uses simple-liquid-glass's WebGL renderer (MIT), which snapshots
 * #main-content; it is skipped on protected pages and with reduced motion.
 *
 * Refraction is removed when visitors reduce transparency, increase contrast or force
 * colors (HIG: these settings always win).
 */
const root = document.documentElement;
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const transparency = matchMedia('(prefers-reduced-transparency: reduce)');
const contrast = matchMedia('(prefers-contrast: more)');
const colors = matchMedia('(forced-colors: active)');
const wide = matchMedia('(min-width: 1200px)');
const chromium = /Chrome|Chromium|Edg|OPR/.test(navigator.userAgent) && !/iPhone|iPad|iPod/.test(navigator.userAgent);
const SVG = 'http://www.w3.org/2000/svg';

export function opticsEnabled(): boolean {
  return root.dataset.transparency === 'on' && !transparency.matches && !contrast.matches && !colors.matches;
}

/* ---------- Displacement maps ---------- */

interface Shape {
  width: number;
  height: number;
  radius: number;
  /** Width of the curved rim, px. */
  bezel: number;
  /** Largest inward shift at the rim, px. */
  edge: number;
  /** Center magnification of a lens (1 = flat pane). */
  magnify?: number;
}

const mapCache = new Map<string, { href: string; scale: number; bytes: number }>();
const MAX_CACHE_BYTES = 8 * 1024 * 1024;
const MAX_CACHE_ENTRIES = 24;
let cacheBytes = 0;

/**
 * Encodes, per pixel, where the backdrop is sampled from: R and G hold the x and y
 * shift (128 = none) scaled by `scale`, as feDisplacementMap reads them.
 */
function displacementMap(shape: Shape): { href: string; scale: number } {
  const width = Math.max(1, Math.round(shape.width));
  const height = Math.max(1, Math.round(shape.height));
  const radius = Math.min(shape.radius, width / 2, height / 2);
  const magnify = shape.magnify ?? 1;
  const key = `${width}x${height}r${radius.toFixed(1)}b${shape.bezel}e${shape.edge}m${magnify}`;
  const cached = mapCache.get(key);
  if (cached) {
    // Keep frequently reused button/lens sizes when a larger surface is resized.
    mapCache.delete(key);
    mapCache.set(key, cached);
    return cached;
  }

  const cx = width / 2;
  const cy = height / 2;
  const pull = 1 - 1 / magnify;
  // Largest possible shift, so every value fits the 8-bit channel.
  const scale = 2 * (shape.edge + Math.max(cx, cy) * pull) + 1;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return { href: '', scale: 0 };
  const image = context.createImageData(width, height);
  const data = image.data;
  // Flat interiors have exactly neutral displacement. Bulk-fill them instead of
  // evaluating rounded-edge geometry per pixel; preserve full map resolution.
  const inset = Math.ceil(Math.max(radius, shape.bezel));
  const skipInterior = pull === 0 && width > 2 * inset && height > 2 * inset;
  if (skipInterior) {
    const neutral = new Uint32Array(new Uint8Array([128, 128, 128, 255]).buffer)[0];
    new Uint32Array(data.buffer).fill(neutral);
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (skipInterior && y >= inset && y < height - inset && x === inset) {
        x = width - inset;
        if (x >= width) break;
      }
      const px = x + 0.5 - cx;
      const py = y + 0.5 - cy;
      // Signed distance to the rounded rectangle and the outward normal there.
      const qx = Math.abs(px) - (cx - radius);
      const qy = Math.abs(py) - (cy - radius);
      let nx: number;
      let ny: number;
      let inside: number;
      if (qx > 0 && qy > 0) {
        const length = Math.hypot(qx, qy) || 1;
        nx = (qx / length) * Math.sign(px);
        ny = (qy / length) * Math.sign(py);
        inside = radius - length;
      } else if (qx > qy) {
        nx = Math.sign(px); ny = 0; inside = radius - qx;
      } else {
        nx = 0; ny = Math.sign(py); inside = radius - qy;
      }
      // Rim: a convex profile, steepest at the edge and flat where the bezel ends.
      const t = inside >= shape.bezel ? 0 : 1 - Math.max(0, inside) / shape.bezel;
      const bend = shape.edge * t * t * (3 - 2 * t) * t;
      const dx = -nx * bend - px * pull;
      const dy = -ny * bend - py * pull;
      const i = (y * width + x) * 4;
      data[i] = Math.round(128 + (dx / scale) * 255);
      data[i + 1] = Math.round(128 + (dy / scale) * 255);
      data[i + 2] = 128;
      data[i + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  const result = { href: canvas.toDataURL('image/png'), scale };
  // Budget decoded pixels plus the encoded URL, rather than just counting maps.
  const bytes = result.href.length * 2 + width * height * 4;
  if (bytes <= MAX_CACHE_BYTES) {
    while (mapCache.size >= MAX_CACHE_ENTRIES || cacheBytes + bytes > MAX_CACHE_BYTES) {
      const oldest = mapCache.keys().next().value;
      if (oldest === undefined) break;
      cacheBytes -= mapCache.get(oldest)!.bytes;
      mapCache.delete(oldest);
    }
    mapCache.set(key, { ...result, bytes });
    cacheBytes += bytes;
  }
  return result;
}

/* ---------- SVG filters ---------- */

interface Material {
  /** Pre-refraction blur, px. Kept low: Liquid Glass is clear, not frosted. */
  blur: number;
  /** Widest color fringe, px: how far apart red and blue land where the bend is largest. */
  fringe: number;
  saturation: number;
}

let filterCount = 0;

function channel(id: string, input: string, scale: number, matrix: string): string {
  return `<feDisplacementMap in="${input}" in2="map" scale="${scale.toFixed(2)}" xChannelSelector="R" yChannelSelector="G" result="${id}-d"/>`
    + `<feColorMatrix in="${id}-d" type="matrix" values="${matrix}" result="${id}"/>`;
}

/** Writes the filter into `holder` and returns the backdrop-filter value referencing it. */
function writeFilter(holder: SVGSVGElement, id: string, shape: Shape, material: Material): string {
  const map = displacementMap(shape);
  if (!map.href) return '';
  const width = Math.round(shape.width);
  const height = Math.round(shape.height);
  // Red bends least and blue most; the spread is relative to the largest shift (scale / 2).
  const spread = Math.min(0.3, (2 * material.fringe) / map.scale);
  holder.innerHTML = `<filter id="${id}" x="0" y="0" width="${width}" height="${height}" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" color-interpolation-filters="sRGB">`
    + `<feGaussianBlur in="SourceGraphic" stdDeviation="${material.blur}" edgeMode="duplicate" result="soft"/>`
    + `<feImage href="${map.href}" x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="none" result="map"/>`
    + channel('r', 'soft', map.scale * (1 - spread), '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0')
    + channel('g', 'soft', map.scale, '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0')
    + channel('b', 'soft', map.scale * (1 + spread), '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0')
    + '<feComposite in="r" in2="g" operator="arithmetic" k2="1" k3="1" result="rg"/>'
    + '<feComposite in="rg" in2="b" operator="arithmetic" k2="1" k3="1" result="rgb"/>'
    + `<feColorMatrix in="rgb" type="saturate" values="${material.saturation}"/>`
    + '</filter>';
  return `url(#${id})`;
}

/* ---------- Surfaces ---------- */

/** Rim and material per surface kind; values tuned against the HIG reference imagery. */
function surfaceShape(host: HTMLElement, width: number, height: number): Shape {
  const radius = Math.min(Number.parseFloat(getComputedStyle(host).borderTopLeftRadius) || 0, width / 2, height / 2);
  const short = Math.min(width, height);
  return { width, height, radius, bezel: Math.min(radius, short * 0.4), edge: Math.min(10, short * 0.2) };
}
const surfaceMaterial: Material = { blur: 2.5, fringe: 2.5, saturation: 1.6 };

interface Optic { layer: HTMLElement; holder: SVGSVGElement; id: string; size: string }
const optics = new Map<HTMLElement, Optic>();
const pending = new Set<HTMLElement>();
let buildFrame = 0;
let swapping = false;

/** Coalesce resize notifications; generate at most one surface map per frame. */
function scheduleBuild(host: HTMLElement): void {
  pending.add(host);
  if (!buildFrame) buildFrame = requestAnimationFrame(flushBuild);
}
function flushBuild(): void {
  buildFrame = 0;
  const host = pending.values().next().value;
  if (host) {
    pending.delete(host);
    if (!document.hidden && !swapping && opticsEnabled()) build(host);
  }
  if (pending.size) buildFrame = requestAnimationFrame(flushBuild);
}
const resize = new ResizeObserver((entries) => {
  for (const entry of entries) scheduleBuild(entry.target as HTMLElement);
});

function build(host: HTMLElement): void {
  const optic = optics.get(host);
  if (!optic) return;
  const width = host.offsetWidth;
  const height = host.offsetHeight;
  if (!width || !height) return;
  const shape = surfaceShape(host, width, height);
  const size = `${width}x${height}r${shape.radius}`;
  if (size === optic.size) return;
  const value = writeFilter(optic.holder, optic.id, shape, surfaceMaterial);
  if (!value) return;
  optic.size = size;
  host.dataset.refraction = 'svg';
  optic.layer.style.visibility = '';
  optic.layer.style.setProperty('-webkit-backdrop-filter', value);
  optic.layer.style.setProperty('backdrop-filter', value);
}

function attach(host: HTMLElement): void {
  if (optics.has(host)) return;
  const layer = document.createElement('span');
  layer.className = 'glass-optics';
  layer.style.visibility = 'hidden';
  layer.setAttribute('aria-hidden', 'true');
  const holder = document.createElementNS(SVG, 'svg');
  holder.setAttribute('width', '0');
  holder.setAttribute('height', '0');
  holder.setAttribute('aria-hidden', 'true');
  holder.style.position = 'absolute';
  layer.append(holder);
  host.prepend(layer);
  optics.set(host, { layer, holder, id: `glass-optics-${++filterCount}`, size: '' });
  resize.observe(host);
  scheduleBuild(host);
}

function detach(host: HTMLElement): void {
  const optic = optics.get(host);
  if (!optic) return;
  optic.layer.remove();
  pending.delete(host);
  resize.unobserve(host);
  optics.delete(host);
  delete host.dataset.refraction;
}

/* ---------- Drag lens ---------- */

const lensMaterial: Material = { blur: 0.3, fringe: 1.5, saturation: 1.3 };
let lensId = '';
let lensHolder: SVGSVGElement | undefined;
let lensSize = '';
let activeLens: HTMLElement | undefined;

/**
 * Gives the tab bar's drag lens a magnifying, dispersive filter for its current size.
 * Returns false when the lens should stay a plain highlight (no SVG refraction here).
 */
export function lensOptics(lens: HTMLElement, width: number, height: number): boolean {
  activeLens = lens;
  if (!chromium || !opticsEnabled()) {
    lens.style.removeProperty('backdrop-filter');
    lens.style.removeProperty('-webkit-backdrop-filter');
    return false;
  }
  if (!lensHolder?.isConnected || lensHolder.parentElement !== lens) {
    lensHolder?.remove();
    lensSize = '';
    lensHolder = document.createElementNS(SVG, 'svg');
    lensHolder.setAttribute('width', '0');
    lensHolder.setAttribute('height', '0');
    lensHolder.setAttribute('aria-hidden', 'true');
    lensHolder.style.position = 'absolute';
    lens.append(lensHolder);
    lensId = `glass-lens-${++filterCount}`;
  }
  const size = `${width}x${height}`;
  if (lensSize === size) {
    lens.style.setProperty('-webkit-backdrop-filter', 'url(#' + lensId + ')');
    lens.style.setProperty('backdrop-filter', 'url(#' + lensId + ')');
    return true;
  }
  const short = Math.min(width, height);
  const value = writeFilter(lensHolder, lensId, {
    width, height, radius: short / 2, bezel: short * 0.3, edge: short * 0.1, magnify: 1.1,
  }, lensMaterial);
  if (!value) return false;
  lensSize = size;
  lens.style.setProperty('-webkit-backdrop-filter', value);
  lens.style.setProperty('backdrop-filter', value);
  return true;
}

/* ---------- WebGL path (non-Chromium) ---------- */

let webgl: HTMLElement | undefined;
let webglHost: HTMLElement | undefined;
let importing: Promise<unknown> | undefined;
let revision = 0;
let webglBackdrop: Element | null = null;

function unmountWebgl(): void {
  // The library's disconnectedCallback releases its renderer and capture subscription.
  ++revision;
  webgl?.remove();
  if (webglHost) delete webglHost.dataset.refraction;
  webgl = undefined;
  webglHost = undefined;
  webglBackdrop = null;
}

async function updateWebgl(): Promise<void> {
  const request = ++revision;
  const surface = document.querySelector<HTMLElement>(wide.matches ? '[data-glass-surface="sidebar"]' : '[data-glass-surface="tabs"]');
  const backdrop = document.querySelector('#main-content');
  const usable = !document.hidden && !swapping && opticsEnabled() && root.dataset.glassCapture === 'on'
    && !reduced.matches && backdrop && surface && visible.has(surface);
  if (!usable || !surface) { unmountWebgl(); return; }
  if (webglHost === surface && webglBackdrop === backdrop && webgl?.isConnected) return;
  importing ??= import('./webgl');
  try { await importing; } catch { importing = undefined; return; }
  if (request !== revision) return;
  unmountWebgl();
  const element = document.createElement('mintfolio-liquid-glass');
  element.className = 'optical-surface';
  element.setAttribute('aria-hidden', 'true');
  element.setAttribute('renderer', 'webgl');
  element.setAttribute('backdrop-selector', '#main-content');
  element.setAttribute('radius', String(Number.parseFloat(getComputedStyle(surface).borderTopLeftRadius) || 26));
  element.setAttribute('lens-profile', 'player');
  element.setAttribute('strength', '0.2');
  element.setAttribute('dispersion', '22');
  element.setAttribute('frost', '0.06');
  element.setAttribute('blur', '0.6');
  element.setAttribute('saturation', '160');
  element.setAttribute('border-color', 'rgba(255,255,255,0.8)');
  surface.prepend(element);
  surface.dataset.refraction = 'webgl';
  webgl = element;
  webglHost = surface;
  webglBackdrop = backdrop;
}

/* ---------- Lifecycle ---------- */

// Observe hosts, not generated layers. Hidden navigation modes allocate no maps
// or WebGL contexts; offscreen hosts remain observed so they can resume.
const observed = new Set<HTMLElement>();
const visible = new Set<HTMLElement>();
const visibility = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    const host = entry.target as HTMLElement;
    if (!observed.has(host) || !host.isConnected) continue;
    if (entry.isIntersecting && entry.intersectionRect.width > 0 && entry.intersectionRect.height > 0) {
      visible.add(host);
      if (chromium && !document.hidden && !swapping && opticsEnabled()) attach(host);
    } else {
      visible.delete(host);
      detach(host);
    }
  }
  if (!chromium) void updateWebgl();
});

function update(): void {
  const enabled = !document.hidden && !swapping && opticsEnabled();
  for (const host of observed) {
    if (!enabled || !host.isConnected) {
      visibility.unobserve(host);
      observed.delete(host);
      visible.delete(host);
      detach(host);
    }
  }
  if (!enabled) {
    unmountWebgl();
    if (buildFrame) cancelAnimationFrame(buildFrame);
    buildFrame = 0;
    pending.clear();
    activeLens?.style.removeProperty('backdrop-filter');
    activeLens?.style.removeProperty('-webkit-backdrop-filter');
    return;
  }
  for (const host of document.querySelectorAll<HTMLElement>('.glass-surface')) {
    if (!observed.has(host)) {
      observed.add(host);
      visibility.observe(host);
    } else if (chromium && visible.has(host)) {
      scheduleBuild(host);
    }
  }
  if (!chromium) void updateWebgl();
}

for (const query of [reduced, transparency, contrast, colors, wide]) query.addEventListener('change', update);
document.addEventListener('visibilitychange', update);
// Recreate persisted navigation optics before binding the new #main-content;
// retaining the old source would keep a stale page capture across Astro navigation.
document.addEventListener('astro:before-swap', () => { swapping = true; update(); });
document.addEventListener('astro:after-swap', () => { swapping = false; update(); });
window.addEventListener('pagehide', () => { swapping = true; update(); });
window.addEventListener('pageshow', () => { swapping = false; update(); });
new MutationObserver(update).observe(root, {
  attributes: true, attributeFilter: ['data-transparency', 'data-glass-capture'],
});
update();
