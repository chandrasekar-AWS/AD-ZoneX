import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const UNDERLINE_SELECTOR = '.eyebrow, .tl__head h2';

/**
 * PageEffects — two small site-wide behaviours:
 *  1. Draws the animated underline under every section title when it scrolls into view.
 *  2. Blocks right-click everywhere on the site (mouse, long-press on phones, the keyboard's menu key), and dragging
 *     of pictures and videos. Text boxes keep their normal menu so people can still paste into the forms.
 *     This is a deterrent, not real protection: anything shown on a web page can still be screenshotted.
 * The underline effect is off inside /admin; the right-click block applies there too.
 */
export default function PageEffects() {
  const { pathname } = useLocation();
  const inAdmin = pathname.startsWith('/admin');

  useEffect(() => {
    if (inAdmin) return undefined;
    const seen = new WeakSet();
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const io = 'IntersectionObserver' in window && !reduce
      ? new IntersectionObserver((entries) => {
        entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
      }, { threshold: 0.6 })
      : null;

    const scan = () => {
      document.querySelectorAll(UNDERLINE_SELECTOR).forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        if (io) io.observe(el); else el.classList.add('is-in');
      });
    };
    scan();
    // Pages render in stages (content loads after the first paint), so keep watching for new titles.
    let raf = 0;
    const mo = new MutationObserver(() => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; scan(); }); });
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { mo.disconnect(); io?.disconnect(); if (raf) cancelAnimationFrame(raf); };
  }, [pathname, inAdmin]);

  useEffect(() => {
    const inField = (t) => t instanceof Element && !!t.closest('input, textarea, select, [contenteditable="true"]');
    const noMenu = (e) => { if (!inField(e.target)) { e.preventDefault(); e.stopPropagation(); } };
    const noDrag = (e) => { if (e.target instanceof Element && e.target.closest('img, picture, video')) e.preventDefault(); };
    // Capture phase, so nothing else on the page can re-enable the menu.
    document.addEventListener('contextmenu', noMenu, true);
    document.addEventListener('dragstart', noDrag, true);
    return () => { document.removeEventListener('contextmenu', noMenu, true); document.removeEventListener('dragstart', noDrag, true); };
  }, []);

  return null;
}
