// Reuse ICU formatters across rows and generated pages; keep dev-server memory bounded.
const dateFormats = new Map<string, Intl.DateTimeFormat>();

/** Locale-aware date for public metadata; the timezone is the site's, not the visitor's. */
export function formatDate(value: string, language = 'zh-CN', timezone = 'UTC'): string {
  const key = JSON.stringify([language, timezone]);
  let formatter = dateFormats.get(key);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(language, { year: 'numeric', month: 'long', day: 'numeric', timeZone: timezone });
    if (dateFormats.size >= 16) dateFormats.clear();
    dateFormats.set(key, formatter);
  }
  return formatter.format(new Date(value));
}

/** A stable, HTML-id-safe token for a value that may contain any characters. */
export function domId(prefix: string, value: string): string {
  let hash = 0;
  for (const char of value) hash = (Math.imul(hash, 31) + char.codePointAt(0)!) | 0;
  return `${prefix}-${(hash >>> 0).toString(36)}`;
}
