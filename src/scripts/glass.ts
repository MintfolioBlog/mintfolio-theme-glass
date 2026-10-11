/**
 * Progressive enhancement only: every page reads and navigates without this file.
 * - iOS-style transitions: push into detail, pop back out, cross-fade between tabs;
 * - persisted tab bar / sidebar: selection synced from each incoming page (the tab
 *   bar's selection and drag lens live in scripts/tab-bar.ts);
 * - navigation bar: inline title once the large title scrolls beneath it, scroll edge;
 * - Back button, More sheet dismissal, table of contents highlighting.
 * Core's onPage scope releases listeners and observers on navigation.
 */
import { onPage } from '@mintfolio/core/client/lifecycle';
import type { TransitionBeforePreparationEvent, TransitionBeforeSwapEvent } from 'astro:transitions/client';
import { placeSelection } from './tab-bar';

const root = document.documentElement;
const base = import.meta.env.BASE_URL.replace(/\/$/, '');
const depth = (url: URL): number => url.pathname.slice(base.length).split('/').filter(Boolean).length;

/*
 * Direction of the content transition. Tabs and sidebar items switch sections, which
 * iOS shows without a push. Links inside content go deeper (push) unless they lead to a
 * shallower page (pop); history traversal follows the depth change.
 */
let motion: 'push' | 'pop' | 'fade' = 'fade';
let transition: ViewTransition | undefined;
document.addEventListener('astro:before-preparation', (event: TransitionBeforePreparationEvent) => {
  const fromNavigation = event.sourceElement instanceof Element && event.sourceElement.closest('[data-navigation]');
  const from = depth(event.from);
  const to = depth(event.to);
  if (fromNavigation) motion = 'fade';
  else if (event.navigationType === 'traverse') motion = to > from ? 'push' : to < from ? 'pop' : 'fade';
  else motion = to < from ? 'pop' : 'push';
  root.dataset.navMotion = motion;
  // Names the tab bar and sidebar for this transition so they get their own top layer.
  root.setAttribute('data-nav-transition', '');
});
/*
 * The swap replaces <html> attributes with the incoming page's. Restore the runtime
 * flags inside the same update, before the browser captures the new view, so the
 * push/pop animation selectors still match.
 */
document.addEventListener('astro:after-swap', () => {
  root.dataset.navMotion = motion;
  if (transition) root.setAttribute('data-nav-transition', '');
});

/* The navigation is persisted, so copy the selection from the incoming page instead of re-rendering. */
document.addEventListener('astro:before-swap', (event: TransitionBeforeSwapEvent) => {
  const incoming = event.newDocument;
  for (const item of document.querySelectorAll<HTMLElement>('[data-navigation] [data-nav-url]')) {
    const region = item.closest('[data-navigation]')?.getAttribute('data-navigation');
    const match = incoming.querySelector(`[data-navigation="${region}"] [data-nav-url="${CSS.escape(item.dataset.navUrl ?? '')}"]`);
    const current = match?.getAttribute('aria-current');
    if (current) item.setAttribute('aria-current', current);
    else item.removeAttribute('aria-current');
  }
  for (const sheet of document.querySelectorAll<HTMLDetailsElement>('[data-more]')) sheet.open = false;
  placeSelection();
  const current = (transition = event.viewTransition);
  const finish = (): void => {
    if (transition !== current) return;
    transition = undefined;
    root.removeAttribute('data-nav-transition');
  };
  // A superseded or skipped transition may reject; release flags in either case.
  void current.finished.then(finish, finish);
});

onPage('[data-nav-bar]', (bar, scope) => {
  // Inline title appears once the large title is hidden beneath the bar.
  const largeTitle = document.querySelector('[data-large-title]');
  if (largeTitle) {
    const observer = new IntersectionObserver(([entry]) => {
      bar.toggleAttribute('data-title-visible', !entry?.isIntersecting && (entry?.boundingClientRect.top ?? 0) < 0);
    }, { rootMargin: '-56px 0px 0px 0px' });
    observer.observe(largeTitle);
    scope.add(() => observer.disconnect());
  } else {
    bar.setAttribute('data-title-visible', '');
  }
  // Scroll edge effect only while content is actually beneath the bar.
  let frame = 0;
  const update = (): void => { frame = 0; bar.toggleAttribute('data-scrolled', window.scrollY > 2); };
  window.addEventListener('scroll', () => { frame ||= scope.frame(update); }, { passive: true, signal: scope.signal });
  update();

  // Back returns to the previous in-app page when there is one; the link target is the fallback.
  document.getElementById('nav-bar-back')?.addEventListener('click', (event) => {
    // Preserve normal link behavior for new-tab/window and modified clicks.
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const index: unknown = history.state?.index;
    let inApp = typeof index === 'number' && index > 0;
    if (!inApp) {
      try {
        const referrer = new URL(document.referrer);
        const inBase = !base || referrer.pathname === base || referrer.pathname.startsWith(base + '/');
        inApp = referrer.origin === location.origin && inBase && history.length > 1;
      } catch { /* no referrer */ }
    }
    if (!inApp) return;
    event.preventDefault();
    history.back();
  }, { signal: scope.signal });
});

onPage('[data-more]', (element, scope) => {
  const sheet = element as HTMLDetailsElement;
  const summary = sheet.querySelector('summary');
  const close = (): void => {
    if (!sheet.open) return;
    sheet.open = false;
    summary?.focus();
  };
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') close(); }, { signal: scope.signal });
  sheet.querySelector('[data-sheet-scrim]')?.addEventListener('click', close, { signal: scope.signal });
  sheet.addEventListener('toggle', () => root.toggleAttribute('data-sheet-open', sheet.open), { signal: scope.signal });
  scope.add(() => root.removeAttribute('data-sheet-open'));
});
