import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight, X } from 'lucide-react';
import useScrollLock from '../hooks/useScrollLock';
import { projectDetails } from '../data/projectMeta';
import './ProjectViewer.css';

const keyOf = (it) => it?.id ?? it?.image;
const SWIPE_PX = 60;
const SWIPE_SPEED = 0.45;
const MAX_SCALE = 5;
const CLICK_ZOOM = 2.5;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const IDENTITY = { s: 1, x: 0, y: 0 };

/**
 * ProjectViewer — opens when a gallery image is clicked. One normal page:
 *   1) the picture, shown whole on a soft blurred backdrop;
 *   2) scroll down for the details (company, description, services, tools).
 * Zoom:  mouse  → left-click the picture to zoom in/out, then move the mouse to look around.
 *        touch  → pinch with two fingers, drag with one finger when zoomed in.
 * Cursor: "+" over the picture, an open hand everywhere else (drag the hand to change picture).
 */
export default function ProjectViewer({ item, items = [], sessions = [], onSelect, onClose }) {
  const root = useRef(null);
  const closeBtn = useRef(null);
  const box = useRef(null);
  const ptrs = useRef(new Map());
  const gest = useRef(null);
  const zRef = useRef(IDENTITY);
  const [z, setZ] = useState(IDENTITY);
  const [anim, setAnim] = useState(1); // 0 = follow fingers, 1 = smooth, 2 = quick (mouse look-around)
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dir, setDir] = useState(0);

  const commit = useCallback((next, a = anim) => { zRef.current = next; setZ(next); setAnim(a); }, [anim]);
  const resetZoom = useCallback(() => { zRef.current = IDENTITY; setZ(IDENTITY); setAnim(1); }, []);

  const index = item ? items.findIndex((it) => keyOf(it) === keyOf(item)) : -1;
  const canNavigate = !!onSelect && items.length > 1 && index >= 0;
  const go = useCallback((d) => {
    if (!canNavigate) return;
    setDir(d);
    resetZoom();
    onSelect(items[(index + d + items.length) % items.length]);
  }, [canNavigate, items, index, onSelect, resetZoom]);

  useScrollLock(!!item);

  // Keyboard: Esc (zoom out first, then close), arrows, and Tab kept inside the dialog.
  useEffect(() => {
    if (!item) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') { if (zRef.current.s > 1) resetZoom(); else onClose(); }
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'Tab' && root.current) {
        const f = [...root.current.querySelectorAll('a[href], button:not([disabled])')].filter((n) => n.offsetParent !== null);
        if (!f.length) return;
        const first = f[0]; const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [item, onClose, go, resetZoom]);

  // Focus the close button on open, give focus back on close.
  const isOpen = !!item;
  useEffect(() => {
    if (!isOpen) return undefined;
    const prev = document.activeElement;
    closeBtn.current?.focus({ preventScroll: true });
    return () => { prev?.focus?.({ preventScroll: true }); };
  }, [isOpen]);

  // New project → back to the picture; details reveal as they scroll into view.
  const itemKey = keyOf(item);
  useEffect(() => {
    const el = root.current;
    if (!el) return undefined;
    el.scrollTop = 0;
    setDx(0);
    ptrs.current.clear(); gest.current = null;
    const els = el.querySelectorAll('.pv-r');
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) { els.forEach((n) => n.classList.add('is-in')); return undefined; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { root: el, threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
    els.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [itemKey]);

  // Preload neighbours so Next/Prev feels instant.
  useEffect(() => {
    if (!canNavigate) return;
    [-1, 1].forEach((d) => { const n = items[(index + d + items.length) % items.length]; if (n?.image) { const im = new Image(); im.src = n.image; } });
  }, [canNavigate, items, index]);

  /* ── pointer handling ─────────────────────────────────────────────── */
  const boxRect = () => box.current?.getBoundingClientRect();
  const limit = (s, x, y, r) => {
    const mx = ((s - 1) * r.width) / 2; const my = ((s - 1) * r.height) / 2;
    return { s, x: clamp(x, -mx, mx), y: clamp(y, -my, my) };
  };
  const zoomAt = (clientX, clientY) => {
    const r = boxRect(); if (!r) return;
    const ox = clientX - (r.left + r.width / 2); const oy = clientY - (r.top + r.height / 2);
    commit(limit(CLICK_ZOOM, -(CLICK_ZOOM - 1) * ox, -(CLICK_ZOOM - 1) * oy, r), 1);
  };

  const startSwipe = (e) => {
    gest.current = { type: 'swipe', id: e.pointerId, startX: e.clientX, startY: e.clientY, t0: performance.now() };
    setDragging(true);
  };
  const endSwipe = (clientX) => {
    const g = gest.current;
    setDragging(false); setDx(0);
    if (!g || g.type !== 'swipe') return;
    const moved = clientX - g.startX;
    const speed = Math.abs(moved) / Math.max(1, performance.now() - g.t0);
    if (Math.abs(moved) >= SWIPE_PX || (speed > SWIPE_SPEED && Math.abs(moved) > 20)) go(moved < 0 ? 1 : -1);
  };

  const onDown = (e) => {
    if (e.target.closest('button, a')) return;
    const onImg = !!e.target.closest('.pv-zoom');

    if (e.pointerType === 'mouse') {
      if (e.button !== 0) return;
      if (onImg) gest.current = { type: 'click', x: e.clientX, y: e.clientY, moved: false };
      else if (canNavigate && zRef.current.s === 1) { e.currentTarget.setPointerCapture?.(e.pointerId); startSwipe(e); }
      return;
    }

    // touch / pen
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setAnim(0);
    if (ptrs.current.size === 2) {
      const [a, b] = [...ptrs.current.values()];
      gest.current = { type: 'pinch', d0: dist(a, b), s0: zRef.current.s, mid0: mid(a, b), t0: { x: zRef.current.x, y: zRef.current.y } };
      setDragging(false); setDx(0);
    } else if (ptrs.current.size === 1) {
      if (zRef.current.s > 1) gest.current = { type: 'pan', startX: e.clientX, startY: e.clientY, t0: { x: zRef.current.x, y: zRef.current.y } };
      else if (canNavigate) startSwipe(e);
    }
  };

  const onMove = (e) => {
    if (e.pointerType === 'mouse') {
      const g = gest.current;
      if (g?.type === 'click' && Math.hypot(e.clientX - g.x, e.clientY - g.y) > 6) g.moved = true;
      if (g?.type === 'swipe' && e.pointerId === g.id) setDx(e.clientX - g.startX);
      // zoomed in: moving the mouse looks around the picture
      if (zRef.current.s > 1 && (!g || g.type === 'click') && e.target.closest?.('.pv-zoom')) {
        const r = boxRect(); if (!r) return;
        const ox = clamp(e.clientX - (r.left + r.width / 2), -r.width / 2, r.width / 2);
        const oy = clamp(e.clientY - (r.top + r.height / 2), -r.height / 2, r.height / 2);
        commit(limit(zRef.current.s, -(zRef.current.s - 1) * ox, -(zRef.current.s - 1) * oy, r), 2);
      }
      return;
    }

    if (!ptrs.current.has(e.pointerId)) return;
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gest.current; if (!g) return;
    const r = boxRect();

    if (g.type === 'pinch' && ptrs.current.size >= 2 && r) {
      const [a, b] = [...ptrs.current.values()];
      const s = clamp(g.s0 * (dist(a, b) / Math.max(1, g.d0)), 1, MAX_SCALE);
      const m = mid(a, b);
      const cx = r.left + r.width / 2; const cy = r.top + r.height / 2;
      const px = (g.mid0.x - cx - g.t0.x) / g.s0; const py = (g.mid0.y - cy - g.t0.y) / g.s0; // picture point under the fingers
      commit(limit(s, m.x - cx - px * s, m.y - cy - py * s, r), 0);
    } else if (g.type === 'pan' && r) {
      commit(limit(zRef.current.s, g.t0.x + (e.clientX - g.startX), g.t0.y + (e.clientY - g.startY), r), 0);
    } else if (g.type === 'swipe' && e.pointerId === g.id) {
      const mx = e.clientX - g.startX;
      if (Math.abs(e.clientY - g.startY) > Math.abs(mx) && Math.abs(e.clientY - g.startY) > 10) { gest.current = null; setDragging(false); setDx(0); return; }
      setDx(mx);
    }
  };

  const onUp = (e) => {
    if (e.pointerType === 'mouse') {
      const g = gest.current;
      if (g?.type === 'click' && !g.moved && e.type === 'pointerup') {
        if (zRef.current.s > 1) resetZoom(); else zoomAt(e.clientX, e.clientY);
      } else if (g?.type === 'swipe') endSwipe(e.clientX);
      gest.current = null;
      return;
    }
    if (!ptrs.current.has(e.pointerId)) return;
    ptrs.current.delete(e.pointerId);
    const g = gest.current;
    if (g?.type === 'swipe') endSwipe(e.type === 'pointercancel' ? g.startX : e.clientX);
    if (ptrs.current.size === 0) {
      gest.current = null;
      if (zRef.current.s < 1.05) resetZoom(); else setAnim(1);
    } else if (ptrs.current.size === 1) {
      const p = [...ptrs.current.values()][0];
      gest.current = zRef.current.s > 1 ? { type: 'pan', startX: p.x, startY: p.y, t0: { x: zRef.current.x, y: zRef.current.y } } : null;
    }
  };

  if (!item) return null;
  const d = projectDetails(item, sessions);
  const next = canNavigate ? items[(index + 1) % items.length] : null;
  const zoomed = z.s > 1;
  const jump = () => root.current?.scrollTo({ top: root.current.clientHeight, behavior: 'smooth' });
  const ms = anim === 0 ? 0 : anim === 2 ? 120 : 280;

  return (
    <div className="pv" ref={root} role="dialog" aria-modal="true" aria-label={`${item.title} — project details`} data-lenis-prevent>
      <button ref={closeBtn} type="button" className="pv-btn pv-close" onClick={onClose} aria-label="Close project"><X size={22} strokeWidth={2.2} /></button>

      {/* ── 1. The picture ─────────────────────────────── */}
      <section
        className={`pv-stage${dragging ? ' is-dragging' : ''}`} aria-label="Project image"
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
      >
        <img key={`bg-${itemKey}`} className="pv-bg" src={item.image} alt="" aria-hidden="true" draggable={false} />

        <div
          ref={box} key={itemKey}
          className={`pv-zoom${zoomed ? ' is-zoomed' : ''}${dir ? (dir > 0 ? ' from-right' : ' from-left') : ''}`}
          style={{ transform: dx ? `translateX(${dx}px)` : undefined, transition: dragging ? 'none' : undefined }}
        >
          <img
            className="pv-img" src={item.image} alt={item.title} draggable={false}
            style={{ transform: `translate3d(${z.x}px, ${z.y}px, 0) scale(${z.s})`, transition: `transform ${ms}ms var(--ease)` }}
          />
        </div>

        {canNavigate && (
          <>
            <button type="button" className="pv-btn pv-nav pv-nav--prev" onClick={() => go(-1)} aria-label="Previous project"><ChevronLeft size={26} strokeWidth={2.2} /></button>
            <button type="button" className="pv-btn pv-nav pv-nav--next" onClick={() => go(1)} aria-label="Next project"><ChevronRight size={26} strokeWidth={2.2} /></button>
          </>
        )}
        <button type="button" className="pv-chevron" onClick={jump} aria-label="Scroll down for project details"><ChevronDown size={26} aria-hidden="true" /></button>
      </section>

      {/* ── 2. The details (normal page flow, nothing overlaps) ── */}
      <section className="pv-details" key={`d-${itemKey}`} aria-label="Project details">
        <div className="pv-wrap">
          <div className="pv-grid">
            <div>
              <span className="pv-chip pv-r">{d.categoryLabel}</span>
              <span className="pv-eyebrow pv-r" style={{ '--d': '40ms' }}>{d.hasClient ? 'Company' : 'Project'}</span>
              <h3 className="pv-name pv-r" style={{ '--d': '80ms' }}>{d.name}</h3>
              <div className="pv-copy">
                {d.paragraphs.map((p, i) => (<p key={i} className={`pv-r${i === 0 ? ' pv-lead' : ''}`} style={{ '--d': `${160 + i * 90}ms` }}>{p}</p>))}
              </div>
            </div>

            <div className="pv-side">
              <h4 className="pv-r">Service provided</h4>
              <ul className="pv-pills">
                {d.services.map((s, i) => (<li key={s} className="pv-r" style={{ '--d': `${80 + i * 70}ms` }}>{s}</li>))}
              </ul>
              <h4 className="pv-r pv-side__2">Tools used</h4>
              <ul className="pv-pills">
                {d.tools.map((s, i) => (<li key={s} className="pv-r" style={{ '--d': `${80 + i * 70}ms` }}>{s}</li>))}
              </ul>
            </div>
          </div>

          <div className="pv-cta pv-r">
            <div>
              <strong>Want something like this for your business?</strong>
              <span>Tell us what you need and we will send a clear written quote.</span>
            </div>
            <div className="pv-cta__btns">
              <Link to="/contact" className="btn btn--lime" onClick={onClose}>Get a free quote <ArrowRight size={18} aria-hidden="true" /></Link>
              {next && (
                <button type="button" className="btn btn--outline" onClick={() => { go(1); }}>Next project <ChevronRight size={18} aria-hidden="true" /></button>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
