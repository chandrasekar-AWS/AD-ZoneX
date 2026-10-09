import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Lenis from 'lenis';

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

    const lenis = new Lenis({
      duration: 1.05,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.95,
      anchors: false,
    });
    window.__lenis = lenis;
    let raf = 0;
    const loop = (time) => { lenis.raf(time); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
      if (window.__lenis === lenis) window.__lenis = null;
    };
  }, [enabled]);

  return null;
}
