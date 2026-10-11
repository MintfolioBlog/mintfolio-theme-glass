/**
 * Tab bar selection, moved by springs instead of CSS transitions so it behaves like
 * liquid: it stretches along its path in proportion to speed and wobbles back into
 * shape when it stops.
 *
 * Press and hold a tab (or drag across the bar) to lift the selection into a clear
 * lens that magnifies what it passes over (scripts/optics.ts). It follows the finger
 * with a slight lag, rubber-bands past the ends, and on release settles into the
 * nearest tab and opens it, as in iOS 26.
 *
 * The tab bar persists across client navigation, so this module keeps one animator for
 * the life of the document. Taps and keyboard activation work without it.
 */
import { lensOptics } from './optics';

const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const HOLD_MS = 220;
const DRAG_SLOP = 8;
/** Lifted lens scale, how far it may overhang the bar, and the rubber band past that (px). */
const LENS_GROW = 1.3;
const LENS_OVERHANG = 6;
const RUBBER = 4;

/** SwiftUI Spring(duration:bounce:) as stiffness and damping per unit mass. */
function spring(duration: number, bounce: number): { k: number; c: number } {
  const omega = (2 * Math.PI) / duration;
  return { k: omega * omega, c: 2 * (1 - bounce) * omega };
}
const SETTLE = spring(0.5, 0.15); // .snappy, as the CSS tokens
const FOLLOW = spring(0.22, 0.12); // close behind the finger
const STRETCH = spring(0.42, 0.45); // wobbles after the move
const LIFT = spring(0.45, 0.3); // .bouncy

interface TabRect { x: number; y: number; w: number; h: number }
interface TabGeometry { tab: HTMLElement; rect: TabRect }
interface DragGeometry { left: number; width: number; tabs: TabGeometry[] }

interface Channel { value: number; velocity: number; target: number }
const channel = (value = 0): Channel => ({ value, velocity: 0, target: value });

function step(state: Channel, { k, c }: { k: number; c: number }, dt: number): void {
  const force = k * (state.target - state.value) - c * state.velocity;
  state.velocity += force * dt;
  state.value += state.velocity * dt;
}
const resting = (state: Channel, epsilon = 0.01): boolean => Math.abs(state.target - state.value) < epsilon && Math.abs(state.velocity) < epsilon * 10;

class TabBar {
  readonly bar: HTMLElement;
  readonly selection: HTMLElement;
  readonly lens: HTMLElement;
  // Selection geometry relative to the bar: center x, top, width, height.
  readonly x = channel();
  readonly w = channel();
  readonly y = channel();
  readonly h = channel();
  readonly stretch = channel();
  readonly lift = channel();
  visible = false;
  frame = 0;
  last = 0;
  // Drag state.
  pointer: number | undefined;
  startX = 0;
  holdTimer: ReturnType<typeof setTimeout> | undefined;
  dragging = false;
  suppressClick = false;
  lensSize = { w: 0, h: 0 };
  over: HTMLElement | undefined;
  geometry: DragGeometry | undefined;

  constructor(bar: HTMLElement) {
    this.bar = bar;
    this.selection = bar.querySelector<HTMLElement>('.tab-bar__selection')!;
    this.lens = bar.querySelector<HTMLElement>('.tab-bar__lens')!;
    bar.addEventListener('pointerdown', (event) => this.down(event));
    bar.addEventListener('pointermove', (event) => this.move(event));
    bar.addEventListener('pointerup', (event) => this.up(event));
    bar.addEventListener('pointercancel', () => this.cancel());
    bar.addEventListener('lostpointercapture', () => { if (this.dragging) this.cancel(); });
    // A drag ends in its own navigation; swallow the click the browser may still send.
    bar.addEventListener('click', (event) => {
      if (!this.suppressClick) {
        // Tap feedback: move the selection to the tapped tab right away.
        const tab = (event.target as Element).closest<HTMLElement>('a.tab');
        if (tab && !event.defaultPrevented && !(event.metaKey || event.ctrlKey || event.shiftKey)) this.moveTo(tab);
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
    bar.addEventListener('contextmenu', (event) => { if (this.pointer !== undefined) event.preventDefault(); });
  }

  tabs(): HTMLElement[] {
    return [...this.bar.querySelectorAll<HTMLElement>('.tab-bar__items > li > .tab, .tab-bar__items > li > .more > .tab')];
  }

  rect(tab: HTMLElement, bar = this.bar.getBoundingClientRect()): TabRect {
    const box = tab.getBoundingClientRect();
    return { x: box.left - bar.left + box.width / 2, y: box.top - bar.top, w: box.width, h: box.height };
  }

  /** Read layout once per gesture, before hover/style writes; layout changes invalidate it. */
  measure(): DragGeometry {
    const bar = this.bar.getBoundingClientRect();
    return { left: bar.left, width: bar.width, tabs: this.tabs().map((tab) => ({ tab, rect: this.rect(tab, bar) })) };
  }

  stop(): void {
    cancelAnimationFrame(this.frame);
    this.frame = 0;
  }

  /** Aims the selection at the selected tab; jumps there when nothing is shown yet or motion is reduced. */
  place(animate = true): void {
    this.geometry = undefined;
    // Resize/navigation can move the hit targets while the pointer is captured.
    if (this.pointer !== undefined) this.cancel(false);
    const selected = this.bar.querySelector<HTMLElement>('.tab[aria-current]');
    if (!selected || !selected.offsetWidth) {
      this.visible = false;
      this.stop();
      this.bar.removeAttribute('data-has-selection');
      return;
    }
    this.target(this.rect(selected), animate && this.visible && !reduced.matches);
    this.visible = true;
    this.bar.setAttribute('data-has-selection', '');
  }

  moveTo(tab: HTMLElement): void {
    if (!this.visible || this.dragging) return;
    this.target(this.rect(tab), !reduced.matches);
  }

  target(rect: { x: number; y: number; w: number; h: number }, animate: boolean): void {
    this.x.target = rect.x; this.w.target = rect.w; this.y.target = rect.y; this.h.target = rect.h;
    if (!animate) {
      for (const state of [this.x, this.w, this.y, this.h]) { state.value = state.target; state.velocity = 0; }
    }
    this.kick();
  }

  kick(): void {
    if (this.frame || document.hidden || !this.bar.isConnected) return;
    this.last = performance.now();
    this.frame = requestAnimationFrame((time) => this.tick(time));
  }

  tick(time: number): void {
    this.frame = 0;
    const dt = Math.min(1 / 30, (time - this.last) / 1000);
    this.last = time;
    const still = reduced.matches;
    // Several sub-steps keep the stiff follow spring stable at low frame rates.
    for (let i = 0; i < 4; i++) {
      const h = dt / 4;
      step(this.x, this.dragging ? FOLLOW : SETTLE, h);
      step(this.w, SETTLE, h);
      step(this.y, SETTLE, h);
      step(this.h, SETTLE, h);
      // Stretch follows speed: a fast move elongates the drop, then it wobbles round again.
      this.stretch.target = still ? 0 : Math.min(0.38, Math.abs(this.x.velocity) / 2400);
      step(this.stretch, STRETCH, h);
      step(this.lift, LIFT, h);
    }
    if (still) {
      this.stretch.target = 0;
      for (const state of [this.x, this.w, this.y, this.h, this.lift, this.stretch]) {
        state.value = state.target; state.velocity = 0;
      }
    }
    this.render();
    const moving = ![this.x, this.w, this.y, this.h, this.lift].every((state) => resting(state, 0.05)) || !resting(this.stretch, 0.002);
    // A stationary held lens needs no frames; the next pointer move wakes it.
    if (moving) { this.kick(); return; }
    // Settle exactly on the target so the last frame has no leftover stretch.
    for (const state of [this.x, this.w, this.y, this.h, this.stretch, this.lift]) { state.value = state.target; state.velocity = 0; }
    this.render();
  }

  render(): void {
    const stretch = Math.max(-0.12, this.stretch.value);
    const lift = Math.max(0, this.lift.value);
    const sx = 1 + stretch;
    const sy = 1 - stretch * 0.45;
    const s = this.selection.style;
    s.width = `${this.w.value}px`;
    s.height = `${this.h.value}px`;
    s.transform = `translate(${this.x.value - this.w.value / 2}px, ${this.y.value}px) scale(${sx}, ${sy})`;
    s.opacity = String(Math.max(0, 1 - lift * 1.6));
    const grow = 1 + (LENS_GROW - 1) * lift;
    const l = this.lens.style;
    l.width = `${this.lensSize.w}px`;
    l.height = `${this.lensSize.h}px`;
    l.transform = `translate(${this.x.value - this.lensSize.w / 2}px, ${this.y.value + (this.h.value - this.lensSize.h) / 2}px) scale(${grow * sx}, ${grow * sy})`;
    l.opacity = String(Math.min(1, lift * 1.8));
    if (lift < 0.01 && !this.dragging) this.bar.removeAttribute('data-lens');
  }

  /* ----- Drag ----- */

  down(event: PointerEvent): void {
    if (event.button !== 0 || this.pointer !== undefined || !this.visible) return;
    // The More sheet lives inside the bar; its rows are ordinary links.
    if ((event.target as Element).closest('.sheet, .sheet-scrim')) return;
    this.pointer = event.pointerId;
    this.startX = event.clientX;
    this.holdTimer = setTimeout(() => this.begin(event.clientX), HOLD_MS);
  }

  move(event: PointerEvent): void {
    if (event.pointerId !== this.pointer) return;
    if (!this.dragging) {
      if (Math.abs(event.clientX - this.startX) > DRAG_SLOP) this.begin(event.clientX);
      return;
    }
    this.follow(event.clientX);
  }

  begin(clientX: number): void {
    clearTimeout(this.holdTimer);
    if (this.dragging || this.pointer === undefined) return;
    this.geometry = this.measure();
    this.dragging = true;
    try { this.bar.setPointerCapture(this.pointer); } catch { /* pointer already gone */ }
    this.bar.setAttribute('data-dragging', '');
    this.bar.setAttribute('data-lens', '');
    for (const sheet of this.bar.querySelectorAll<HTMLDetailsElement>('[data-more]')) sheet.open = false;
    // The lens keeps the selection's height and a drop-like width while it is held.
    this.lensSize = { w: Math.max(this.h.target * 1.5, this.w.target), h: this.h.target };
    lensOptics(this.lens, this.lensSize.w, this.lensSize.h);
    this.lift.target = 1;
    this.follow(clientX);
  }

  follow(clientX: number): void {
    const bar = this.geometry ??= this.measure();
    const tabs = bar.tabs;
    if (!tabs.length) return;
    const first = tabs[0]!.rect;
    const last = tabs.at(-1)!.rect;
    // The lifted lens may overhang the bar only slightly; past that it rubber-bands a few px.
    const half = (this.lensSize.w * LENS_GROW) / 2;
    const min = Math.max(first.x, half - LENS_OVERHANG);
    const max = Math.min(last.x, bar.width - half + LENS_OVERHANG);
    let x = clientX - bar.left;
    if (x < min) x = min - RUBBER * Math.tanh((min - x) / (RUBBER * 4));
    if (x > max) x = max + RUBBER * Math.tanh((x - max) / (RUBBER * 4));
    this.x.target = x;
    const nearest = this.nearest(x, tabs);
    const over = nearest?.tab;
    if (over !== this.over) {
      this.over?.removeAttribute('data-lens-over');
      over?.setAttribute('data-lens-over', '');
      this.over = over;
      const rect = nearest?.rect;
      if (rect) { this.w.target = rect.w; this.y.target = rect.y; this.h.target = rect.h; }
    }
    this.kick();
  }

  nearest(x: number, tabs: TabGeometry[]): TabGeometry | undefined {
    let best: TabGeometry | undefined;
    let distance = Infinity;
    for (const tab of tabs) {
      const d = Math.abs(tab.rect.x - x);
      if (d < distance) { distance = d; best = tab; }
    }
    return best;
  }

  up(event: PointerEvent): void {
    if (event.pointerId !== this.pointer) return;
    clearTimeout(this.holdTimer);
    this.pointer = undefined;
    if (!this.dragging) return;
    const nearest = this.nearest(this.x.target, (this.geometry ??= this.measure()).tabs);
    this.end();
    if (!nearest) return;
    const target = nearest.tab;
    this.target(nearest.rect, !reduced.matches);
    // Open the tab once the browser has delivered (and we have swallowed) the click.
    this.suppressClick = true;
    setTimeout(() => {
      this.suppressClick = false;
      if (!target.hasAttribute('aria-current') || target.matches('summary')) target.click();
    }, 0);
  }

  cancel(restore = true): void {
    clearTimeout(this.holdTimer);
    const pointer = this.pointer;
    this.pointer = undefined;
    if (pointer !== undefined && this.bar.hasPointerCapture(pointer)) this.bar.releasePointerCapture(pointer);
    if (!this.dragging) return;
    this.end();
    if (restore) this.place();
  }

  end(): void {
    this.geometry = undefined;
    this.dragging = false;
    this.lift.target = 0;
    this.bar.removeAttribute('data-dragging');
    this.over?.removeAttribute('data-lens-over');
    this.over = undefined;
    this.kick();
  }
}

const bars = [...document.querySelectorAll<HTMLElement>('.tab-bar')].map((bar) => new TabBar(bar));

/** Re-aims every tab bar at its selected tab (after a selection change or layout change). */
export function placeSelection(animate = true): void {
  for (const bar of bars) bar.place(animate);
}

placeSelection(false);
const layout = new ResizeObserver(() => placeSelection(false));
for (const bar of bars) layout.observe(bar.bar);

// Persisted bars keep their animator across swaps, but never keep a held gesture.
document.addEventListener('astro:before-swap', () => {
  for (const bar of bars) { bar.cancel(); bar.geometry = undefined; }
});
document.addEventListener('visibilitychange', () => {
  for (const bar of bars) {
    if (document.hidden) { bar.cancel(); bar.stop(); }
    else bar.place(false);
  }
});
reduced.addEventListener('change', () => placeSelection(false));
window.addEventListener('resize', () => placeSelection(false), { passive: true });
// Scrolling can change viewport-relative coordinates without resizing the bar.
document.addEventListener('scroll', () => {
  for (const bar of bars) bar.geometry = undefined;
}, { capture: true, passive: true });
void document.fonts.ready.then(() => placeSelection(false));
