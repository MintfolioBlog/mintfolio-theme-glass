/** Validated settings provided by Core; system appearance follows the visitor's OS. */
export interface GlassSettings {
  appearance: 'system' | 'light' | 'dark';
  /** One of the Apple system colors; tints selection, links and prominent buttons. */
  accentColor: 'blue' | 'purple' | 'pink' | 'red' | 'orange' | 'yellow' | 'green' | 'mint' | 'teal' | 'cyan' | 'indigo' | 'brown' | 'graphite';
  /** Liquid Glass on navigation; visitors who reduce transparency always get opaque bars. */
  transparency: boolean;
  /** Tab bar / sidebar destinations; empty uses the site navigation. */
  navigation: Array<{ icon: string; url: string; label: string }>;
  heroEyebrow: string;
  heroTitle: string;
  heroDescription: string;
}
