// Shared helpers so every in-page scroll (anchors, "back to top", tab jumps) uses the same smooth motion.
export const getLenis = () => (typeof window !== 'undefined' ? window.__lenis : null) || null;

const headerOffset = () => {
  const h = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 80;
  return -(h + 16);
};

/** Smoothly scroll to an element (works with or without the smooth-scroll engine). */
export function scrollToEl(el, { offset } = {}) {
  if (!el) return;
  const off = offset ?? headerOffset();
  const lenis = getLenis();
  if (lenis) lenis.scrollTo(el, { offset: off, duration: 1.1 });
  else {
    const y = el.getBoundingClientRect().top + window.scrollY + off;
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
  }
}

export function scrollToTop(immediate = true) {
  const lenis = getLenis();
  if (lenis) lenis.scrollTo(0, { immediate });
  else window.scrollTo({ top: 0, behavior: immediate ? 'auto' : 'smooth' });
}
