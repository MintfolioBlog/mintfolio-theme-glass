/** Icon choice for destinations and social links; artwork comes from src/lib/icon-data.ts. */

/** Pick a symbol for a navigation link that has none; tab bars and sidebars need one per item. */
export function navigationIcon(link: { label: string; url: string }, urls: { home: string; archive: string }): string {
  if (link.url === urls.home) return 'house';
  if (link.url === urls.archive) return 'doc.text';
  // The label says what the destination is; the URL is only a fallback.
  return iconFor(link.label.toLowerCase()) ?? iconFor(link.url.toLowerCase()) ?? 'bookmark';
}

const PATTERNS: Array<[RegExp, string]> = [
  [/project|work|作品|项目/, 'briefcase'],
  [/tag|标签/, 'tag'],
  [/categor|分类/, 'folder'],
  [/series|系列|专题/, 'book'],
  [/link|friend|友链|链接/, 'link'],
  [/rss|feed|订阅/, 'logo.rss'],
  [/about|关于|我/, 'person.crop.circle'],
  [/blog|archive|post|文章|归档|博客/, 'doc.text'],
  [/^\/$|home|首页|主页/, 'house'],
];

function iconFor(text: string): string | undefined {
  return PATTERNS.find(([pattern]) => pattern.test(text))?.[1];
}

const SOCIAL_SYMBOLS: Record<string, string> = {
  email: 'envelope', mail: 'envelope', rss: 'logo.rss', feed: 'logo.rss',
  website: 'globe', site: 'globe', blog: 'globe', home: 'globe', link: 'link',
};
/** Simple Icons renamed or never had these platform names. */
const BRAND_ALIASES: Record<string, string> = { twitter: 'x', weibo: 'sinaweibo', 'little-red-book': 'xiaohongshu' };

/** Icon for a social link `{ platform, icon? }`: a brand logo when Simple Icons has one, else a symbol. */
export function socialIcon(social: { platform: string; icon?: string; url: string }): { name?: string; brand?: string } {
  if (social.url.startsWith('mailto:')) return { name: 'envelope' };
  const key = (social.icon || social.platform).toLowerCase().replace(/[^a-z0-9-]/g, '');
  const symbol = SOCIAL_SYMBOLS[key];
  if (symbol) return { name: symbol };
  return { brand: (BRAND_ALIASES[key] ?? key).replace(/-/g, '') };
}
