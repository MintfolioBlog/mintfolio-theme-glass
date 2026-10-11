/**
 * Resize scheduling adapter for simple-liquid-glass 5.4.0's public web component.
 * Its connectedCallback installs a synchronous ResizeObserver which rebuilds the
 * shadow tree and WebGL renderer during resize delivery. Use our own frame queue
 * instead, retaining the public attributeChangedCallback rendering hook and the
 * public disconnectedCallback teardown. Do not access the library's private state.
 * Recheck these lifecycle assumptions when upgrading the pinned library version.
 */
import { LiquidGlassElement } from 'simple-liquid-glass/web-component';

class ScheduledLiquidGlass extends LiquidGlassElement {
  private frame = 0;
  private sizeObserver?: ResizeObserver;
  private renderedSize = '';
  private attributesDirty = true;

  connectedCallback(): void {
    // Do not call super.connectedCallback(): it installs the synchronous observer
    // being replaced here. The constructor has already created the shadow root.
    this.renderedSize = '';
    this.attributesDirty = true;
    this.sizeObserver = new ResizeObserver(() => this.scheduleRender());
    this.sizeObserver.observe(this);
    this.scheduleRender();
  }

  attributeChangedCallback(): void {
    // Preserve all of the base class's observed optical attributes, coalescing
    // several changes (including changes before the first frame) into one render.
    this.attributesDirty = true;
    this.scheduleRender();
  }

  disconnectedCallback(): void {
    this.sizeObserver?.disconnect();
    this.sizeObserver = undefined;
    if (this.frame) cancelAnimationFrame(this.frame);
    this.frame = 0;
    super.disconnectedCallback();
  }

  private scheduleRender(): void {
    if (!this.isConnected || this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      if (!this.isConnected) return;
      const rect = this.getBoundingClientRect();
      // Hidden responsive variants are removed by optics.ts. Avoid the library's
      // fallback 300x180 render while their final intersection update is pending.
      if (!rect.width || !rect.height) return;
      const size = rect.width + 'x' + rect.height;
      if (!this.attributesDirty && size === this.renderedSize) return;
      this.renderedSize = size;
      this.attributesDirty = false;
      // In 5.4 this public callback renders only when connected. Calling it here
      // moves DOM/GPU mutations out of ResizeObserver notification delivery.
      super.attributeChangedCallback();
    });
  }
}

const tag = 'mintfolio-liquid-glass';
if (!customElements.get(tag)) customElements.define(tag, ScheduledLiquidGlass);
