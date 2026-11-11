import { useState, useCallback, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import useImageRatios from '../hooks/useImageRatios';
import SecureVideo from './SecureVideo';
import './ServiceSlider.css';

const SWIPE_MIN = 40;        // px of travel that always counts as a swipe
const SWIPE_SPEED = 0.45;    // px/ms: a quick flick counts too

/**
 * ServiceSlider — one slider for a service's video AND photos (used on service pages, the Services page and the
 * Contact intro). The video, if any, is the first slide. Swipe or drag left/right (the slide follows your finger),
 * use the arrows, the line under the slider, or the arrow keys. A video pauses when you move away from it.
 * The video uses our own player (SecureVideo): no download, no "more" menu, no fullscreen, no picture-in-picture.
 */
export default function ServiceSlider({ images = [], video = '', alt = '', className = '' }) {
  const [idx, setIdx] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const rec = useRef(null);          // the pointer being tracked
  const justDragged = useRef(false); // swallows the click that follows a swipe
  const panel = useRef(null);

  const slides = [...(video ? [{ kind: 'video', src: video }] : []), ...images.map((src) => ({ kind: 'image', src }))];
  const count = slides.length;
  const key = `${video}|${images.join('|')}`;
  useEffect(() => { setIdx(0); setDragX(0); }, [key]);

  const ratios = useImageRatios(images);
  const cur = Math.min(idx, Math.max(0, count - 1));
  const go = useCallback((to) => setIdx(() => Math.min(Math.max(to, 0), count - 1)), [count]);
  const prev = useCallback(() => setIdx((i) => Math.max(0, i - 1)), []);
  const next = useCallback(() => setIdx((i) => Math.min(count - 1, i + 1)), [count]);

  const down = (e) => {
    if (count < 2 || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (e.target.closest?.('.sv-bar, .sv__big')) return; // the player's own buttons and seek bar are never a swipe
    rec.current = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), drag: false };
  };
  const move = (e) => {
    const r = rec.current;
    if (!r || r.id !== e.pointerId) return;
    const dx = e.clientX - r.x; const dy = e.clientY - r.y;
    if (!r.drag) {
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
        r.drag = true; setDragging(true);
        panel.current?.setPointerCapture?.(e.pointerId); // only now, so taps on the video's own buttons still work
      } else if (Math.abs(dy) > 10) { rec.current = null; return; }
      else return;
    }
    const atStart = cur === 0 && dx > 0; const atEnd = cur === count - 1 && dx < 0;
    setDragX(atStart || atEnd ? dx * 0.3 : dx); // a little resistance at the first and last slide
  };
  const up = (e) => {
    const r = rec.current;
    if (!r || r.id !== e.pointerId) return;
    rec.current = null;
    if (!r.drag) return;
    const dx = e.clientX - r.x;
    const w = panel.current?.clientWidth || 1;
    const speed = Math.abs(dx) / Math.max(1, performance.now() - r.t);
    setDragging(false); setDragX(0);
    justDragged.current = true; setTimeout(() => { justDragged.current = false; }, 0);
    if (e.type === 'pointercancel') return;
    if (Math.abs(dx) >= Math.max(SWIPE_MIN, w * 0.18) || (speed > SWIPE_SPEED && Math.abs(dx) > 20)) { if (dx < 0) next(); else prev(); }
  };

  if (!count) return null;
  const hasVideo = !!video;
  const ratio = hasVideo ? 16 / 9 : Math.min(Math.max(ratios[images[cur]] || 3 / 2, 1), 1.6);
  const label = (i) => (slides[i].kind === 'video' ? 'video' : `image ${i + 1 - (hasVideo ? 1 : 0)} of ${images.length}`);

  return (
    <div className={`ssl ${className}`.trim()}>
      <div className={`ssl-frame${hasVideo ? ' ssl-frame--dark' : ''}`} style={{ aspectRatio: String(ratio) }}>
        <div
          ref={panel} className={`ssl-panel${dragging ? ' is-dragging' : ''}`}
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
          onClickCapture={(e) => { if (justDragged.current) { e.preventDefault(); e.stopPropagation(); } }}
          role="group" tabIndex={0} aria-roledescription="carousel" aria-label={`${alt}, ${hasVideo ? 'video and images' : 'images'}, use the arrow keys to browse`}
          onKeyDown={(e) => { if (e.target !== e.currentTarget) return; if (e.key === 'ArrowLeft') prev(); else if (e.key === 'ArrowRight') next(); }}
        >
          <div className="ssl-track" style={{ transform: `translate3d(calc(${-cur * 100}% + ${dragX}px), 0, 0)`, transition: dragging ? 'none' : undefined }}>
            {slides.map((s, i) => (
              <div key={s.kind + s.src + i} className="ssl-slide" role="group" aria-roledescription="slide" aria-label={`${alt}, ${label(i)}`}
                aria-hidden={i === cur ? undefined : 'true'} inert={i === cur ? undefined : ''}>
                {s.kind === 'video' ? (
                  <SecureVideo src={s.src} poster={images[0] || undefined} label={`${alt} video`} active={i === cur} />
                ) : (
                  <img src={s.src} alt={i === cur ? `${alt}, ${label(i)}` : ''} loading="eager" decoding="async" fetchpriority={i === cur ? 'high' : 'low'}
                    className={`ssl-img${hasVideo ? ' ssl-img--fit' : ''}`} draggable={false} />
                )}
              </div>
            ))}
          </div>
        </div>
        {count > 1 && (
          <>
            {cur > 0 && <button type="button" className="ssl-nav ssl-nav--prev" onClick={prev} aria-label="Previous"><ChevronLeft size={20} aria-hidden="true" /></button>}
            {cur < count - 1 && <button type="button" className="ssl-nav ssl-nav--next" onClick={next} aria-label="Next"><ChevronRight size={20} aria-hidden="true" /></button>}
          </>
        )}
      </div>
      {count > 1 && (
        <div className="ssl-line" role="tablist" aria-label="Slide selector" style={{ '--n': count, '--i': cur }}>
          <span className="ssl-line__thumb" aria-hidden="true" />
          {slides.map((_, i) => (
            <button key={i} type="button" role="tab" aria-selected={i === cur} aria-label={`Show ${label(i)}`}
              className="ssl-line__hit" onClick={() => go(i)} />
          ))}
        </div>
      )}
    </div>
  );
}
