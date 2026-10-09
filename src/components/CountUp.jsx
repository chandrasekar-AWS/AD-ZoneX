import { useEffect, useRef, useState } from 'react';

/**
 * CountUp — counts from 0 to the number in `value` ("2500+", "16+") the first
 * time it scrolls into view. Fast (default 900ms, ease-out). With reduced
 * motion it simply shows the final value.
 */
export default function CountUp({ value, duration = 900 }) {
  const m = String(value).match(/^(\D*)([\d,.]+)(.*)$/);
  const prefix = m ? m[1] : '';
  const end = m ? parseFloat(m[2].replace(/,/g, '')) : 0;
  const suffix = m ? m[3] : '';
  const [n, setN] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    if (!m) return undefined;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) { setN(end); return undefined; }
    let raf = 0;
    const io = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (now) => {
        const t = Math.min((now - t0) / duration, 1);
        setN(Math.round(end * (1 - Math.pow(1 - t, 3))));
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.3 });
    if (ref.current) io.observe(ref.current);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
  }, [end, duration]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!m) return <>{value}</>;
  const final = `${prefix}${end.toLocaleString('en-US')}${suffix}`.replace(/,/g, '');
  return (
    <span ref={ref} aria-label={final} style={{ fontVariantNumeric: 'tabular-nums' }}>
      <span aria-hidden="true">{prefix}{n}{suffix}</span>
    </span>
  );
}
