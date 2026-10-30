import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Pause, Play } from 'lucide-react';
import { W, H, RUN_SECONDS, HOLD_SECONDS } from './heroConstants';
import './HeroShowcase.css';

const CLIPS = [
  { id: 'design', label: 'Design', alt: 'Animation: a logo is drawn, coloured and placed on business cards' },
  { id: 'print', label: 'Print', alt: 'Animation: printed sheets pass through four colour heads and stack up' },
  { id: 'signage', label: 'Signage', alt: 'Animation: gold letters are fitted to a signboard and the board lights up' },
  { id: 'digital', label: 'Digital', alt: 'Animation: a website is built, visitors grow and a social post gains likes' },
];
const TOTAL = RUN_SECONDS + HOLD_SECONDS; // seconds per clip
const FADE = 0.45; // seconds of cross-fade between clips

/**
 * HeroShowcase — the picture beside the Home heading.
 * Four animations (Design, Print, Signage, Digital) are drawn live on a canvas at the screen's own frame rate,
 * so they are smooth, sharp and tiny to download. They play one after another with a soft cross-fade; click a
 * service name to jump to its animation, which always starts from the beginning.
 * Pause button for everyone; still pictures for people who prefer reduced motion.
 */
export default function HeroShowcase() {
  const reduce = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(reduce);
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const fillRef = useRef(null);
  const st = useRef({ id: 0, t: 0, fade: 0, snap: null, paused: reduce, visible: true, scale: 1, need: true, last: 0, slow: 0, avg: 0, scrollUntil: 0, flip: false, half: false, flip2: false });

  // Change clip: freeze the picture on screen, then fade it out over the new clip as that one starts at 0.
  const goTo = useCallback((i, restart = false) => {
    const s = st.current;
    const cv = canvasRef.current;
    if (cv && s.visible) {
      if (!s.snap) s.snap = document.createElement('canvas');
      s.snap.width = cv.width; s.snap.height = cv.height;
      s.snap.getContext('2d').drawImage(cv, 0, 0);
      s.fade = restart ? 0 : 1;
    }
    s.id = i; s.t = 0; s.need = true;
    setActive(i);
  }, []);

  useEffect(() => { st.current.paused = paused; st.current.need = true; }, [paused]);

  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return undefined;
    const ctx = cv.getContext('2d');
    const s = st.current;
    let raf = 0;
    let dead = false;
    let drawScene = null;
    s.scale = Math.min(1.5, window.devicePixelRatio || 1);

    const resize = () => { cv.width = Math.round(W * s.scale); cv.height = Math.round(H * s.scale); s.need = true; };
    resize();

    const draw = () => {
      if (!drawScene) return;
      ctx.setTransform(s.scale, 0, 0, s.scale, 0, 0);
      drawScene(CLIPS[s.id].id, ctx, s.paused ? RUN_SECONDS : Math.min(s.t, RUN_SECONDS));
      if (s.fade > 0 && s.snap) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = s.fade;
        ctx.drawImage(s.snap, 0, 0, cv.width, cv.height);
        ctx.globalAlpha = 1;
      }
      if (fillRef.current) fillRef.current.style.transform = `scaleX(${s.paused ? 1 : Math.min(1, s.t / TOTAL)})`;
    };

    const frame = (now) => {
      if (dead) return;
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.1, Math.max(0, (now - s.last) / 1000));
      s.last = now;
      if (!s.visible) return;
      if (s.paused) { if (s.need) { s.need = false; draw(); } return; }
      s.t += dt;
      if (s.fade > 0) s.fade = Math.max(0, s.fade - dt / FADE);
      if (s.t >= TOTAL) { goTo((s.id + 1) % CLIPS.length); }
      // While the page is scrolling, redraw every other frame: the picture still moves, but scrolling gets the time.
      if (now < s.scrollUntil) { s.flip = !s.flip; if (s.flip) return; }
      // A weak device that is still struggling after the resolution step-down animates at 30 frames a second instead.
      if (s.half) { s.flip2 = !s.flip2; if (s.flip2) return; }
      const a = performance.now();
      draw();
      // If the device struggles, quietly draw at a lower resolution so the motion stays smooth.
      s.avg = s.avg * 0.9 + (performance.now() - a) * 0.1;
      s.slow = s.avg > 9 ? s.slow + 1 : 0;
      if (s.slow > 30 && s.scale > 0.65) { s.scale = Math.max(0.6, s.scale - 0.2); s.slow = 0; s.avg = 0; resize(); }
      else if (s.slow > 30 && s.scale <= 0.65 && !s.half) { s.half = true; s.slow = 0; s.avg = 0; }
    };

    const fontsReady = document.fonts?.ready || Promise.resolve();
    // The drawing code is a separate file that loads right after the page is first shown.
    const scenes = import('./heroScenes').then((m) => { drawScene = m.drawScene; });
    Promise.all([scenes, document.fonts?.load?.('700 58px Poppins'), document.fonts?.load?.('600 14px Poppins'), fontsReady])
      .catch(() => {}).then(() => { if (!dead) { s.need = true; raf = requestAnimationFrame(frame); } });

    // Only animate while the picture is on screen.
    const io = 'IntersectionObserver' in window
      ? new IntersectionObserver(([e]) => { s.visible = e.isIntersecting; s.need = true; }, { threshold: 0.05 })
      : null;
    if (io && wrapRef.current) io.observe(wrapRef.current);
    const onScroll = () => { s.scrollUntil = performance.now() + 160; };
    window.addEventListener('scroll', onScroll, { passive: true });

    return () => { dead = true; cancelAnimationFrame(raf); io?.disconnect(); window.removeEventListener('scroll', onScroll); };
  }, [goTo]);

  const select = (i) => { if (paused) { st.current.id = i; st.current.t = 0; st.current.need = true; setActive(i); } else goTo(i, i === st.current.id); };
  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); select((active + 1) % CLIPS.length); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); select((active + CLIPS.length - 1) % CLIPS.length); }
  };
  const clip = CLIPS[active];

  return (
    <figure className="hero__media hs" ref={wrapRef}>
      <div className="hs__stage">
        <canvas ref={canvasRef} className="hs__canvas" width="800" height="600" role="img" aria-label={clip.alt} />
      </div>

      <figcaption className="hs__bar">
        <div className="hs__tabs" role="group" aria-label="Our services" onKeyDown={onKeyDown}>
          {CLIPS.map((s, i) => (
            <button
              key={s.id} type="button" id={`hs-tab-${s.id}`} aria-pressed={i === active}
              className={`hs__tab${i === active ? ' is-on' : ''}`} onClick={() => select(i)}
            >
              <span>{s.label}</span>
              {i === active && (<i className="hs__fill" aria-hidden="true"><b ref={fillRef} /></i>)}
            </button>
          ))}
        </div>
        <div className="hs__side">
          <Link to={`/service#${clip.id}`} className="hs__more">Explore {clip.label}<ArrowUpRight size={15} aria-hidden="true" /></Link>
          <button type="button" className="hs__pause" onClick={() => setPaused((p) => !p)} aria-label={paused ? 'Play animations' : 'Pause animations'}>
            {paused ? <Play size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />}
          </button>
        </div>
      </figcaption>
    </figure>
  );
}
