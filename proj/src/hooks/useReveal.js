import { useEffect } from 'react';

/**
 * Adds .is-in to every .reveal element as it scrolls into view (once).
 * Elements that are already on screen when the page opens are shown at once (no fade),
 * so changing page never shows a half-empty screen; only content further down fades in as you scroll.
 */
export default function useReveal(deps = []) {
  useEffect(() => {
    const els = [...document.querySelectorAll('.reveal:not(.is-in)')];
    const show = (e, now) => { if (now) e.classList.add('is-now'); e.classList.add('is-in'); };
    if (!('IntersectionObserver' in window)) { els.forEach((e) => show(e, true)); return undefined; }
    const vh = window.innerHeight || 800;
    const later = [];
    els.forEach((e) => { (e.getBoundingClientRect().top < vh - 40 ? show(e, true) : later.push(e)); });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    later.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}
