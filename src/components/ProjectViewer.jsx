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
const LEAVE_MS = 300; // how long the zoom-out animation takes before the full-screen layer is removed

/**
 * ProjectViewer — opens when a gallery image is clicked. One normal page:
 *   1) the picture, shown whole on a soft blurred backdrop;
 *   2) scroll down for the details (company, description, services, tools).
 * Zoom:  the zoomed picture opens in a FULL-SCREEN layer (it is no longer clipped inside the small picture frame).
 *        mouse  → left-click the picture to zoom in, move the mouse to look around, click again (or Esc / X) to zoom out.
 *        touch  → pinch with two fingers, drag with one finger when zoomed in, pinch back out (or X) to leave.
 * Cursor: "+" over the picture, an open hand everywhere else (drag the hand to change picture).
 */
export default function ProjectViewer({ item, items = [], sessions = [], onSelect, onClose }) {
  const root = useRef(null);
  const closeBtn = useRef(null);
  const imgRef = useRef(null);   // the picture inside the page
  const ovRef = useRef(null);    // the full-screen zoom layer
  const ptrs = useRef(new Map());
  const gest = useRef(null);
  const zRef = useRef(IDENTITY);
  const fsRef = useRef(false);       // full-screen layer is on screen
  const leavingRef = useRef(false);  // ...and is animating back out
  const readyRef = useRef(false);    // zoom-in animation has started (mouse look-around allowed)
  const baseRef = useRef({ w: 0, h: 0 });
  const leaveTimer = useRef(0);
  const [z, setZ] = useState(IDENTITY);
  const [fs, setFs] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [base, setBase] = useState({ w: 0, h: 0 });
  const [anim, setAnim] = useState(1); // 0 = follow fingers, 1 = smooth, 2 = quick (mouse look-around)
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dir, setDir] = useState(0);

  const commit = useCallback((next, a = 1) => { zRef.current = next; setZ(next); setAnim(a); }, []);
  const vpSize = () => {
    const r = ovRef.current?.getBoundingClientRect();
    return r && r.width ? { w: r.width, h: r.height } : { w: window.innerWidth, h: window.innerHeight };
  };
  const zoomedNow = () => fsRef.current && !leavingRef.current;

  /** Instant: back to the normal picture (used when changing picture or closing). */
  const resetZoom = useCallback(() => {
    clearTimeout(leaveTimer.current);
    fsRef.current = false; leavingRef.current = false; readyRef.current = false;
    zRef.current = IDENTITY;
    setFs(false); setLeaving(false); setZ(IDENTITY); setAnim(1);
  }, []);

  /** Animated: shrink the full-screen picture back to where it sits in the page, then remove the layer. */
  const leaveZoom = useCallback(() => {
    if (!fsRef.current || leavingRef.current) return;
    const r = imgRef.current?.getBoundingClientRect();
    const V = { w: window.innerWidth, h: window.innerHeight };
    leavingRef.current = true; readyRef.current = false; setLeaving(true);
    commit(r ? { s: 1, x: r.left + r.width / 2 - V.w / 2, y: r.top + r.height / 2 - V.h / 2 } : IDENTITY, 1);
    leaveTimer.current = setTimeout(resetZoom, LEAVE_MS);
  }, [commit, resetZoom]);

  /**
   * Opens the full-screen layer with the picture at exactly the size and place it has in the page (so nothing jumps),
   * then the caller animates it up. Returns the picture's offset from the screen centre, or null if it is already open.
   */
  const enterZoom = () => {
    const im = imgRef.current;
    if (!im || fsRef.current) return null;
    if (root.current && root.current.scrollTop > 0) root.current.scrollTop = 0; // picture back in its resting place
    const r = im.getBoundingClientRect();
    const V = { w: window.innerWidth, h: window.innerHeight };
    const b = { w: im.offsetWidth, h: im.offsetHeight };
    const off = { x: r.left + r.width / 2 - V.w / 2, y: r.top + r.height / 2 - V.h / 2 };
    clearTimeout(leaveTimer.current);
    baseRef.current = b; setBase(b);
    fsRef.current = true; leavingRef.current = false; readyRef.current = false;
    setFs(true); setLeaving(false);
    commit({ s: 1, x: off.x, y: off.y }, 0);
    return off;
  };

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
      if (e.key === 'Escape') { if (fsRef.current) leaveZoom(); else onClose(); }
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
  }, [item, onClose, go, leaveZoom]);

  // Focus the close button on open, give focus back on close.
  const isOpen = !!item;
  useEffect(() => {
    if (!isOpen) { resetZoom(); return undefined; }
    const prev = document.activeElement;
    closeBtn.current?.focus({ preventScroll: true });
    return () => { prev?.focus?.({ preventScroll: true }); };
  }, [isOpen, resetZoom]);

  // While the full-screen picture is open the page behind it must not scroll; remove the timer if the viewer goes away.
  useEffect(() => { if (root.current) root.current.style.overflowY = fs ? 'hidden' : ''; }, [fs]);
  useEffect(() => () => clearTimeout(leaveTimer.current), []);

  // New project → back to the picture; details reveal as they scroll into view.
  const itemKey = keyOf(item);
  useEffect(() => {
    const el = root.current;
    if (!el) return undefined;
    el.scrollTop = 0;
    setDx(0);
    resetZoom();
    ptrs.current.clear(); gest.current = null;
    const els = el.querySelectorAll('.pv-r');
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) { els.forEach((n) => n.classList.add('is-in')); return undefined; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { root: el, threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
    els.forEach((n) => io.observe(n));
    return () => io.disconnect();
  }, [itemKey, resetZoom]);

  // Preload neighbours so Next/Prev feels instant.
  useEffect(() => {
    if (!canNavigate) return;
    [-1, 1].forEach((d) => { const n = items[(index + d + items.length) % items.length]; if (n?.image) { const im = new Image(); im.src = n.image; } });
  }, [canNavigate, items, index]);

  /* ── pointer handling ─────────────────────────────────────────────── */
  // How far the picture may be moved: the scaled picture must keep covering the screen (no empty edges).
  const limit = (s, x, y, V = vpSize()) => {
    const mx = Math.max(0, (baseRef.current.w * s - V.w) / 2);
    const my = Math.max(0, (baseRef.current.h * s - V.h) / 2);
    return { s, x: clamp(x, -mx, mx), y: clamp(y, -my, my) };
  };
  // Mouse look-around: the pointer's place on the screen decides which part of the picture is shown
  // (pointer at the left edge → left edge of the picture, and so on).
  const lookAt = (clientX, clientY, s) => {
    const V = vpSize();
    const nx = clamp((clientX - V.w / 2) / (V.w / 2), -1, 1);
    const ny = clamp((clientY - V.h / 2) / (V.h / 2), -1, 1);
    const mx = Math.max(0, (baseRef.current.w * s - V.w) / 2);
    const my = Math.max(0, (baseRef.current.h * s - V.h) / 2);
    return { s, x: -nx * mx, y: -ny * my };
  };
  const zoomIn = (clientX, clientY) => {
    if (!enterZoom()) return;
    const target = lookAt(clientX, clientY, CLICK_ZOOM);
    // two frames: let the layer paint at the picture's resting size first, so the growth is animated
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (!fsRef.current || leavingRef.current) return;
      readyRef.current = true; commit(target, 1);
    }));
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
    const onImg = !!e.target.closest('.pv-zoom, .pv-fs');

    if (e.pointerType === 'mouse') {
      if (e.button !== 0) return;
      if (onImg) gest.current = { type: 'click', x: e.clientX, y: e.clientY, moved: false };
      else if (canNavigate && !fsRef.current) { e.currentTarget.setPointerCapture?.(e.pointerId); startSwipe(e); }
      return;
    }

    // touch / pen
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setAnim(0);
    if (ptrs.current.size === 2) {
      if (leavingRef.current) return;
      const [a, b] = [...ptrs.current.values()];
      let t0 = { x: zRef.current.x, y: zRef.current.y };
      if (!fsRef.current) { const off = enterZoom(); if (!off) return; t0 = off; } // pinch starts the full-screen layer
      readyRef.current = true;
      gest.current = { type: 'pinch', d0: dist(a, b), s0: zRef.current.s, mid0: mid(a, b), t0 };
      setDragging(false); setDx(0);
    } else if (ptrs.current.size === 1) {
      if (zoomedNow()) gest.current = { type: 'pan', startX: e.clientX, startY: e.clientY, t0: { x: zRef.current.x, y: zRef.current.y } };
      else if (!fsRef.current && canNavigate) startSwipe(e);
    }
  };

  const onMove = (e) => {
    if (e.pointerType === 'mouse') {
      const g = gest.current;
      if (g?.type === 'click' && Math.hypot(e.clientX - g.x, e.clientY - g.y) > 6) g.moved = true;
      if (g?.type === 'swipe' && e.pointerId === g.id) setDx(e.clientX - g.startX);
      // zoomed in: moving the mouse looks around the picture
      if (zoomedNow() && readyRef.current && (!g || g.type === 'click')) commit(lookAt(e.clientX, e.clientY, zRef.current.s), 2);
      return;
    }

    if (!ptrs.current.has(e.pointerId)) return;
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gest.current; if (!g) return;

    if (g.type === 'pinch' && ptrs.current.size >= 2) {
      const V = vpSize();
      const [a, b] = [...ptrs.current.values()];
      const s = clamp(g.s0 * (dist(a, b) / Math.max(1, g.d0)), 1, MAX_SCALE);
      const m = mid(a, b);
      const cx = V.w / 2; const cy = V.h / 2;
      const px = (g.mid0.x - cx - g.t0.x) / g.s0; const py = (g.mid0.y - cy - g.t0.y) / g.s0; // picture point under the fingers
      commit(limit(s, m.x - cx - px * s, m.y - cy - py * s, V), 0);
    } else if (g.type === 'pan') {
      commit(limit(zRef.current.s, g.t0.x + (e.clientX - g.startX), g.t0.y + (e.clientY - g.startY)), 0);
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
        if (zoomedNow()) leaveZoom(); else if (!fsRef.current) zoomIn(e.clientX, e.clientY);
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
      if (fsRef.current && zRef.current.s < 1.05) leaveZoom(); else setAnim(1);
    } else if (ptrs.current.size === 1) {
      const p = [...ptrs.current.values()][0];
      gest.current = zoomedNow() ? { type: 'pan', startX: p.x, startY: p.y, t0: { x: zRef.current.x, y: zRef.current.y } } : null;
    }
  };

  if (!item) return null;
  const d = projectDetails(item, sessions);
  const next = canNavigate ? items[(index + 1) % items.length] : null;
  const jump = () => root.current?.scrollTo({ top: root.current.clientHeight, behavior: 'smooth' });
  const ms = anim === 0 ? 0 : anim === 2 ? 120 : 280;

  return (
    <div className="pv" ref={root} role="dialog" aria-modal="true" aria-label={`${item.title} — project details`} data-lenis-prevent>
      <button ref={closeBtn} type="button" className="pv-btn pv-close" onClick={() => { if (fsRef.current) leaveZoom(); else onClose(); }} aria-label={fs ? 'Zoom out' : 'Close project'}><X size={22} strokeWidth={2.2} /></button>

      {/* ── 1. The picture ─────────────────────────────── */}
      <section
        className={`pv-stage${dragging ? ' is-dragging' : ''}`} aria-label="Project image"
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
      >
        <img key={`bg-${itemKey}`} className="pv-bg" src={item.image} alt="" aria-hidden="true" decoding="async" draggable={false} />

        <div
          key={itemKey}
          className={`pv-zoom${fs ? ' is-zoomed' : ''}${dir ? (dir > 0 ? ' from-right' : ' from-left') : ''}`}
          style={{ transform: dx ? `translateX(${dx}px)` : undefined, transition: dragging ? 'none' : undefined }}
        >
          <img
            ref={imgRef} className="pv-img" src={item.image} alt={item.title} decoding="async" draggable={false}
            style={fs ? { visibility: 'hidden' } : undefined}
          />
        </div>

        {/* The zoomed picture: a layer over the WHOLE screen, so zooming is no longer limited to the picture's frame. */}
        {fs && (
          <div ref={ovRef} className="pv-fs" aria-hidden="true">
            <div className="pv-fs__bg" style={{ opacity: leaving ? 0 : 1 }} />
            <img
              className="pv-fs__img" src={item.image} alt="" decoding="async" draggable={false}
              style={{
                width: base.w, height: base.h, marginLeft: -base.w / 2, marginTop: -base.h / 2,
                transform: `translate3d(${z.x}px, ${z.y}px, 0) scale(${z.s})`, transition: `transform ${ms}ms var(--ease)`,
              }}
            />
            <span className="pv-fs__hint">Move the mouse to look around · click to zoom out</span>
          </div>
        )}

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
