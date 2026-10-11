/**
 * Font warm-up for client navigation.
 *
 * The first time a document lays out a face it has not used yet (monospace code, bold
 * or italic CJK, the larger title sizes), the browser resolves fallback fonts
 * synchronously. Measured on Windows, that alone stalled the swap into an article by
 * 40–140 ms, so the push started late and with a jolt. While the browser is idle, lay
 * out a hidden sample of the article faces once, using the real classes so the font
 * descriptions match; client navigation then finds them resolved.
 */
const SAMPLE = '中文排版 Typography 0123456789，。“”';

const groups: string[] = [
  // Article header and reading text.
  `<div class="article-header"><p class="article-header__eyebrow t-footnote">${SAMPLE}</p><h1 class="article-header__title">${SAMPLE}</h1>`
    + `<p class="article-header__deck">${SAMPLE}</p><p class="article-byline t-subheadline"><span class="article-byline__authors">${SAMPLE}</span></p></div>`,
  `<div class="prose"><h2>${SAMPLE}</h2><h3>${SAMPLE}</h3><h4>${SAMPLE}</h4><p>${SAMPLE} <strong>${SAMPLE}</strong> <em>${SAMPLE}</em> <code>${SAMPLE}</code></p>`
    + `<blockquote><p>${SAMPLE}</p></blockquote></div>`,
  `<div class="prose"><pre><code>const value = "${SAMPLE}"; // ${SAMPLE}</code></pre>`
    + `<table><thead><tr><th>${SAMPLE}</th></tr></thead><tbody><tr><td>${SAMPLE}</td></tr></tbody></table></div>`,
];

function warm(index: number): void {
  const html = groups[index];
  if (html === undefined) return;
  const sample = document.createElement('div');
  sample.setAttribute('aria-hidden', 'true');
  sample.setAttribute('inert', '');
  sample.style.cssText = 'position:absolute;top:0;left:0;width:640px;visibility:hidden;pointer-events:none;contain:layout paint';
  sample.innerHTML = html;
  document.body.append(sample);
  void sample.offsetWidth; // lay out (and resolve fonts) now
  sample.remove();
  schedule(index + 1);
}

// One group per idle period keeps each task short, so a tap is never kept waiting.
function schedule(index: number): void {
  if (index >= groups.length) return;
  if ('requestIdleCallback' in window) requestIdleCallback(() => warm(index), { timeout: 3000 });
  else setTimeout(() => warm(index), 200);
}

if (document.readyState === 'complete') schedule(0);
else addEventListener('load', () => schedule(0), { once: true });
