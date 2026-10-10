/** Validated settings provided by Core; system appearance follows the visitor's OS. */
export interface GlassSettings {
  appearance: 'system' | 'light' | 'dark';
  heroEyebrow: string;
  heroTitle: string;
  heroDescription: string;
  /** Optional glass navigation; reduced-transparency and increased-contrast preferences take priority. */
  transparency: boolean;
}