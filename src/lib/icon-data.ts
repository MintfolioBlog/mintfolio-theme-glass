/**
 * Icon artwork, resolved while pages render; only the inline SVG reaches the browser.
 * - Framework7 Icons (@iconify-json/f7, MIT): line icons drawn in the style of
 *   SF Symbols with near-identical names. SF Symbols itself is licensed for
 *   Apple-platform apps only and cannot be shipped in a web page.
 * - Brand logos from simple-icons, by slug.
 */
import { icons as f7 } from '@iconify-json/f7';
import { getIconData, iconToHTML, iconToSVG, replaceIDs } from '@iconify/utils';
import * as simpleIcons from 'simple-icons';

/** SF Symbols names whose Framework7 counterpart is spelled differently. */
const ALIASES: Record<string, string> = {
  magnifyingglass: 'search',
  'line-3-horizontal': 'line-horizontal-3',
  'square-and-pencil': 'square-pencil',
  rss: 'logo-rss',
  newspaper: 'doc-richtext',
  safari: 'compass',
  'text-justify-left': 'text-alignleft',
};

/** "doc.text.fill" / "doc_text" → "doc-text-fill" */
export function normalizeSymbol(name: string): string {
  const base = name.trim().toLowerCase().replace(/[._\s]+/g, '-');
  const filled = base.endsWith('-fill');
  const stem = filled ? base.slice(0, -5) : base;
  const mapped = ALIASES[stem] ?? stem;
  return filled ? `${mapped}-fill` : mapped;
}

/**
 * @param name SF Symbols-style name ("doc.text") or Framework7 name ("doc-text").
 * @param filled Prefer the filled variant, as a selected tab uses.
 * @returns Inline SVG, or null when the set has no such icon.
 */
export function symbolSvg(name: string, filled = false): string | null {
  const base = normalizeSymbol(name);
  if (!/^[a-z0-9-]+$/.test(base)) return null;
  const stem = base.replace(/-fill$/, '');
  const candidates = filled ? [`${stem}-fill`, base] : [base, stem];
  for (const candidate of candidates) {
    const data = getIconData(f7, candidate);
    if (!data) continue;
    const { body, attributes } = iconToSVG(data);
    return iconToHTML(replaceIDs(body), { viewBox: attributes.viewBox });
  }
  return null;
}

interface SimpleIcon { slug: string; path: string }
let brands: Map<string, SimpleIcon> | undefined;

/** @returns Inline SVG for a Simple Icons slug, or null when the set has no such brand. */
export function brandSvg(slug: string): string | null {
  brands ??= new Map(Object.values(simpleIcons as Record<string, SimpleIcon>).filter((icon) => icon?.slug).map((icon) => [icon.slug, icon]));
  const icon = brands.get(slug);
  return icon ? iconToHTML(`<path d="${icon.path}"/>`, { viewBox: '0 0 24 24' }) : null;
}

const warned = new Set<string>();
/** Report a setting that names a missing icon once per build, without failing the build. */
export function warnMissingIcon(kind: string, name: string): void {
  if (warned.has(kind + name)) return;
  warned.add(kind + name);
  console.warn(`[theme-glass] Unknown ${kind} icon "${name}"; using a default icon instead.`);
}
