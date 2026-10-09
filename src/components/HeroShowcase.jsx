import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Pause, Play } from 'lucide-react';
import './HeroShowcase.css';

// One animation per service. `ms` is how long each clip takes (including its short hold on the last frame);
// when it ends the next clip starts by itself. To use your own animations, replace the files in /img/hero
// and update the `ms` value to the new clip's length.
export const SLIDES = [
  { id: 'design', label: 'Design', src: '/hero/design.gif', poster: '/hero/design-poster.jpg', ms: 6870, alt: 'Animation: a logo is drawn, coloured and placed on business cards' },
  { id: 'print', label: 'Print', src: '/hero/print.gif', poster: '/hero/print-poster.jpg', ms: 6860, alt: 'Animation: printed sheets pass through four colour heads and stack up' },
  { id: 'signage', label: 'Signage', src: '/hero/signage.gif', poster: '/hero/signage-poster.jpg', ms: 6880, alt: 'Animation: gold letters are fitted to a signboard and the board lights up' },
  { id: 'digital', label: 'Digital', src: '/hero/digital.gif', poster: '/hero/digital-poster.jpg', ms: 6870, alt: 'Animation: a website is built, visitors grow and a social post gains likes' },
];

/**
 * HeroShowcase — the picture beside the Home heading.
 * Four animations (Design, Print, Signage, Digital) play one after another; when one ends the next starts.
 * Click a service name to jump to its animation, and the clip always starts from the beginning.
 * People who prefer reduced motion get still pictures, and anyone can pause with the button.
 */
export default function HeroShowcase() {
  const reduce = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const [active, setActive] = useState(0);
  const [run, setRun] = useState(0); // bumps to restart the current clip from its first frame
  const [loaded, setLoaded] = useState(false);
  const [paused, setPaused] = useState(reduce);
  const [src, setSrc] = useState('');
  const blobs = useRef({});
  const slide = SLIDES[active];

  // Download the clips in the background (first one first) so switching later is instant.
  useEffect(() => {
    if (reduce) return undefined;
    let dead = false;
    (async () => {
      for (let i = 0; i < SLIDES.length; i++) {
        try {
          const r = await fetch(SLIDES[i].src);
          const b = await r.blob();
          if (dead) return;
          blobs.current[i] = b;
        } catch { /* the <img> falls back to the normal URL */ }
      }
    })();
    return () => { dead = true; };
  }, [reduce]);

  // Every play gets its own object URL, so the browser starts the clip at frame 1 each time
  // (browsers otherwise keep one shared animation clock per image address).
  useEffect(() => {
    if (paused) { setSrc(''); return undefined; }
    let url = '';
    const blob = blobs.current[active];
    if (blob) { url = URL.createObjectURL(blob); setSrc(url); }
    else setSrc(`${SLIDES[active].src}${run ? `?r=${run}` : ''}`);
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [active, run, paused]);

  // When a clip finishes, start the next one.
  useEffect(() => {
    if (paused || !loaded) return undefined;
    const id = setTimeout(() => { setLoaded(false); setActive((a) => (a + 1) % SLIDES.length); }, slide.ms + 200);
    return () => clearTimeout(id);
  }, [active, run, loaded, paused, slide.ms]);

  // Coming back to the tab: restart the current clip so the timing is right again.
  useEffect(() => {
    const onVis = () => { if (document.visibilityState === 'visible') { setLoaded(false); setRun((r) => r + 1); } };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const select = useCallback((i) => {
    setLoaded(false);
    if (i === active) setRun((r) => r + 1); else setActive(i);
  }, [active]);

  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); select((active + 1) % SLIDES.length); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); select((active + SLIDES.length - 1) % SLIDES.length); }
  };

  return (
    <figure className="hero__media hs">
      <div className="hs__stage">
        {paused || !src ? (
          <img className="hs__img is-in" src={slide.poster} alt={slide.alt} width="720" height="540" draggable={false} />
        ) : (
          <img
            key={`${active}-${run}`} className={`hs__img${loaded ? ' is-in' : ''}`} src={src} alt={slide.alt}
            width="720" height="540" draggable={false} onLoad={() => setLoaded(true)}
          />
        )}
      </div>

      <figcaption className="hs__bar">
        <div className="hs__tabs" role="tablist" aria-label="Our services" onKeyDown={onKeyDown}>
          {SLIDES.map((s, i) => (
            <button
              key={s.id} type="button" role="tab" id={`hs-tab-${s.id}`} aria-selected={i === active} tabIndex={i === active ? 0 : -1}
              className={`hs__tab${i === active ? ' is-on' : ''}`} onClick={() => select(i)}
            >
              <span>{s.label}</span>
              {i === active && (
                <i className={`hs__fill${loaded && !paused ? ' is-run' : ''}`} style={{ '--ms': `${s.ms}ms` }} key={`${active}-${run}-${loaded}`} aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
        <div className="hs__side">
          <Link to={`/service#${slide.id}`} className="hs__more">Explore {slide.label}<ArrowUpRight size={15} aria-hidden="true" /></Link>
          <button type="button" className="hs__pause" onClick={() => { setLoaded(false); setPaused((p) => !p); }} aria-label={paused ? 'Play animations' : 'Pause animations'}>
            {paused ? <Play size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />}
          </button>
        </div>
      </figcaption>
    </figure>
  );
}
