import { onPage } from '@mintfolio/core/client/lifecycle';

/*
 * Contents: the panel beside the sheet on wide windows and the collapsed list inside it
 * otherwise. Both highlight the section being read; the inline one closes once a
 * section is chosen.
 */
onPage('.reading-layout', (layout, scope) => {
  const links = new Map<Element, HTMLAnchorElement[]>();
  for (const link of layout.querySelectorAll<HTMLAnchorElement>('[data-toc] a[href^="#"]')) {
    let id = link.hash.slice(1);
    try { id = decodeURIComponent(id); } catch { /* Preserve literal percent signs in author-provided anchors. */ }
    const target = document.getElementById(id);
    if (target) links.set(target, [...(links.get(target) ?? []), link]);
  }
  if (links.size === 0) return;
  for (const inline of layout.querySelectorAll<HTMLDetailsElement>('details[data-toc]')) {
    inline.addEventListener('click', (event) => {
      if (event.target instanceof Element && event.target.closest('a')) inline.open = false;
    }, { signal: scope.signal });
  }
  const visible = new Set<Element>();
  const headings = [...links.keys()];
  const mark = (): void => {
    const current = headings.find((heading) => visible.has(heading))
      ?? headings.filter((heading) => heading.getBoundingClientRect().top < 0).at(-1)
      ?? headings[0];
    for (const [heading, group] of links) {
      for (const link of group) {
        if (heading === current) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      }
    }
  };
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) visible.add(entry.target);
      else visible.delete(entry.target);
    }
    mark();
  }, { rootMargin: '-64px 0px -55% 0px' });
  for (const heading of headings) observer.observe(heading);
  mark();
  scope.add(() => observer.disconnect());
});
