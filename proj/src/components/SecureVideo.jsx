import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, Volume2, VolumeX } from 'lucide-react';
import './SecureVideo.css';

const fmt = (t) => {
  if (!Number.isFinite(t) || t < 0) return '0:00';
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};
// On data-saver / very slow connections only the first bytes are fetched until Play is pressed.
const slowConnection = () => {
  const c = typeof navigator !== 'undefined' ? navigator.connection : null;
  return !!(c?.saveData || /(^|-)(2g|3g)$/.test(c?.effectiveType || ''));
};
const IDLE_MS = 2600;

/**
 * SecureVideo — our own small video player, used instead of the browser's built-in controls.
 * The browser's controls carry a "⋮ More" menu (Download, Playback speed, Picture-in-picture, Cast) and a Fullscreen
 * button. Those cannot be removed reliably in every browser, so this player draws only what we want:
 * play / pause, a seek bar, the time and mute. There is no download, no more-menu, no fullscreen, no picture-in-picture,
 * no cast, and right-click does nothing.
 *
 * Props: src, poster, label (accessible name), active (false = another slide is showing, so the video pauses).
 */
export default function SecureVideo({ src, poster, label = 'Video', active = true }) {
  const vref = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [muted, setMuted] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [failed, setFailed] = useState(false);
  const [awake, setAwake] = useState(true); // controls visible
  const idle = useRef(0);

  // Another slide came into view → stop.
  useEffect(() => { if (!active) vref.current?.pause(); }, [active]);

  // Open the connection to the video host early, so the first bytes arrive sooner.
  useEffect(() => {
    let origin = '';
    try { const u = new URL(src, window.location.href); if (u.origin !== window.location.origin) origin = u.origin; } catch { /* ignore */ }
    if (!origin) return undefined;
    const l = document.createElement('link');
    l.rel = 'preconnect'; l.href = origin;
    document.head.appendChild(l);
    return () => { l.remove(); };
  }, [src]);

  useEffect(() => () => clearTimeout(idle.current), []);

  const wake = useCallback(() => {
    setAwake(true);
    clearTimeout(idle.current);
    idle.current = setTimeout(() => setAwake(false), IDLE_MS);
  }, []);

  const toggle = useCallback(() => {
    const v = vref.current; if (!v) return;
    if (v.paused || v.ended) v.play().catch(() => setFailed(true)); else v.pause();
    wake();
  }, [wake]);

  const seek = (e) => {
    const v = vref.current; if (!v || !dur) return;
    const t = Number(e.target.value);
    v.currentTime = t; setTime(t); wake();
  };

  const pct = dur ? Math.min(100, (time / dur) * 100) : 0;
  const showBar = !playing || awake;

  return (
    <div
      className={`sv${showBar ? ' is-awake' : ''}${playing ? ' is-playing' : ''}`}
      onPointerMove={wake} onPointerDown={wake}
      onContextMenu={(e) => e.preventDefault()}
    >
      <video
        ref={vref} className="sv__video" src={src} poster={poster || undefined}
        playsInline preload={slowConnection() ? 'metadata' : 'auto'}
        controlsList="nodownload nofullscreen noremoteplayback noplaybackrate"
        disablePictureInPicture disableRemotePlayback x-webkit-airplay="deny"
        aria-label={label} draggable={false}
        onClick={toggle}
        onPlay={() => { setPlaying(true); setFailed(false); wake(); }}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setAwake(true); }}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDur(e.currentTarget.duration || 0)}
        onDurationChange={(e) => setDur(e.currentTarget.duration || 0)}
        onWaiting={() => setWaiting(true)}
        onPlaying={() => setWaiting(false)}
        onCanPlay={() => setWaiting(false)}
        onError={() => setFailed(true)}
      />

      {failed && <p className="sv__error" role="alert">This video could not be loaded. Please try again later.</p>}
      {waiting && playing && !failed && <span className="sv__spin" aria-hidden="true" />}

      {!playing && !failed && (
        <button type="button" className="sv__big" onClick={toggle} aria-label={`Play ${label}`}>
          <Play size={30} aria-hidden="true" />
        </button>
      )}

      <div className="sv-bar" role="group" aria-label="Video controls">
        <button type="button" className="sv-bar__btn" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? <Pause size={18} aria-hidden="true" /> : <Play size={18} aria-hidden="true" />}
        </button>
        <span className="sv-bar__time" aria-hidden="true">{fmt(time)}</span>
        <input
          type="range" className="sv-bar__seek" min={0} max={dur || 0} step={0.05} value={Math.min(time, dur || 0)}
          onChange={seek} disabled={!dur} aria-label="Seek" aria-valuetext={`${fmt(time)} of ${fmt(dur)}`}
          style={{ '--p': `${pct}%` }}
        />
        <span className="sv-bar__time" aria-hidden="true">{fmt(dur)}</span>
        <button
          type="button" className="sv-bar__btn"
          onClick={() => { const v = vref.current; if (!v) return; v.muted = !v.muted; setMuted(v.muted); wake(); }}
          aria-label={muted ? 'Unmute' : 'Mute'} aria-pressed={muted}
        >
          {muted ? <VolumeX size={18} aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}
