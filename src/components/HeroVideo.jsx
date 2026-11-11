import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Pause, Play } from 'lucide-react';
import './HeroVideo.css';

/**
 * HeroVideo — the picture beside the Home heading (replaces the old canvas animation).
 * Plays /video/hero.mp4 muted and looped. Pauses when scrolled out of view to save battery and data,
 * and does not autoplay for people who prefer reduced motion. Pause/Play button for everyone.
 */
export default function HeroVideo() {
  const reduce = typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const [paused, setPaused] = useState(reduce);
  const videoRef = useRef(null);
  const visible = useRef(true);

  const sync = (wantPaused) => {
    const v = videoRef.current;
    if (!v) return;
    if (wantPaused || !visible.current) v.pause();
    else v.play().catch(() => {});
  };

  useEffect(() => { sync(paused); }, [paused]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const v = videoRef.current;
    if (!v || !('IntersectionObserver' in window)) return undefined;
    const io = new IntersectionObserver(([e]) => { visible.current = e.isIntersecting; sync(paused); }, { threshold: 0.15 });
    io.observe(v);
    return () => io.disconnect();
  }, [paused]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <figure className="hero__media hv">
      <div className="hv__stage">
        <video
          ref={videoRef} className="hv__video" src="/video/hero.mp4" poster="/video/hero-poster.jpg"
          width="1280" height="720" muted loop playsInline autoPlay={!reduce} preload="auto"
          controlsList="nodownload nofullscreen noremoteplayback noplaybackrate" disablePictureInPicture disableRemotePlayback x-webkit-airplay="deny" draggable={false}
          aria-label="Ad Zonex: design, print, signage, digital and cloud services in Coimbatore"
        />
      </div>
      <figcaption className="hv__bar">
        <Link to="/service" className="hv__more">Explore our services<ArrowUpRight size={15} aria-hidden="true" /></Link>
        <button type="button" className="hv__pause" onClick={() => setPaused((p) => !p)} aria-label={paused ? 'Play video' : 'Pause video'}>
          {paused ? <Play size={15} aria-hidden="true" /> : <Pause size={15} aria-hidden="true" />}
        </button>
      </figcaption>
    </figure>
  );
}
