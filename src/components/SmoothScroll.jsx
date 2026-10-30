import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const WAKE_EVENTS = ['wheel', 'touchstart', 'keydown', 'pointerdown', 'scroll', 'resize'];

/**
 * SmoothScroll — eased mouse-wheel / trackpad scrolling on desktop & laptop screens.
 * Phones and tablets keep their own native momentum scrolling (already smooth).
 * Off for people who prefer reduced motion, and off inside the admin area.
 */
export default function SmoothScroll() {
  const { pathname } = useLocation();
  const enabled = !pathname.startsWith('/admin');

  useEffect(() => {
    if (!enabled) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;

    let dead = false;
    let raf = 0;
    let lenis = null;
    let wake = () => {};
    // Load the smooth-scroll engine once the first screen is on display, not before.
    const start = () => {
      import('lenis').then(({ default: Lenis }) => {
        if (dead) return;
        lenis = new Lenis({
          duration: 1.05,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          smoothWheel: true,
          wheelMultiplier: 0.95,
          anchors: false,
        });
        window.__lenis = lenis;
        // The engine's frame loop runs only while the page is moving (or was just asked to move).
        // When you stop, it sleeps, so the browser has more time for everything else (animations, taps, typing).
        let running = false;
        let awake = 0;
        const loop = (time) => {
          lenis.raf(time);
          if (lenis.isScrolling || time - awake < 400) raf = requestAnimationFrame(loop);
          else running = false;
        };
        wake = () => {
          awake = performance.now();
          if (!running && !dead) { running = true; raf = requestAnimationFrame(loop); }
        };
        const scrollTo = lenis.scrollTo.bind(lenis);
        lenis.scrollTo = (...a) => { wake(); return scrollTo(...a); };
        WAKE_EVENTS.forEach((ev) => window.addEventListener(ev, wake, { passive: true }));
        wake();
      }).catch(() => {});
    };
    const idle = 'requestIdleCallback' in window ? requestIdleCallback(start, { timeout: 1500 }) : setTimeout(start, 300);

    return () => {
      dead = true;
      if ('requestIdleCallback' in window) cancelIdleCallback(idle); else clearTimeout(idle);
      cancelAnimationFrame(raf);
      WAKE_EVENTS.forEach((ev) => window.removeEventListener(ev, wake));
      if (lenis) { lenis.destroy(); if (window.__lenis === lenis) window.__lenis = null; }
    };
  }, [enabled]);

  return null;
}
