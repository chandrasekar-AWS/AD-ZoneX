import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Compass, Home, Image as ImageIcon, MessageCircle, RotateCw } from 'lucide-react';
import SiteHeader from './SiteHeader';
import Footer from './Footer';
import Button from './Button';
import './ErrorPage.css';

const PRESETS = {
  404: {
    eyebrow: 'Page not found',
    title: "We can't find that page",
    text: 'The link may be broken, or the page may have moved. Here is where you can go instead.',
  },
  500: {
    eyebrow: 'Something went wrong',
    title: 'This page hit a problem',
    text: 'It is on our side, not yours. Please reload the page. If it keeps happening, message us and we will fix it quickly.',
  },
  403: {
    eyebrow: 'Access denied',
    title: "You don't have access to this page",
    text: 'This area is private. If you think this is a mistake, please contact us.',
  },
  offline: {
    eyebrow: "You're offline",
    title: 'No internet connection',
    text: 'Check your connection and try again. Pages you have already opened may still work.',
  },
};

/**
 * ErrorPage — one friendly layout for every kind of error (404, 500, 403, offline).
 * `bare` renders without header/footer (used when the app itself crashed).
 */
export default function ErrorPage({ kind = 404, bare = false, onRetry, detail }) {
  const p = PRESETS[kind] || PRESETS[404];
  const code = kind === 'offline' ? '···' : String(kind);

  useEffect(() => {
    const prev = document.title;
    document.title = `${p.eyebrow} | AD ZONEX`;
    const m = document.createElement('meta'); m.name = 'robots'; m.content = 'noindex';
    document.head.appendChild(m);
    return () => { document.title = prev; m.remove(); };
  }, [p.eyebrow]);

  const body = (
    <main className="err" id="main">
      <div className="err__glow" aria-hidden="true" />
      <div className="container err__inner">
        <p className="err__code" aria-hidden="true">{code}</p>
        <span className="err__eyebrow">{p.eyebrow}</span>
        <h1>{p.title}</h1>
        <p className="err__text">{p.text}</p>
        {detail && <p className="err__detail"><code>{detail}</code></p>}
        <div className="err__actions">
          {onRetry && (
            <button type="button" className="btn btn--lime" onClick={onRetry}><RotateCw size={18} aria-hidden="true" /> Try again</button>
          )}
          <Button to="/" variant={onRetry ? 'outline' : 'lime'}><Home size={18} aria-hidden="true" /> Back to home</Button>
          <Button to="/contact" variant="outline"><MessageCircle size={18} aria-hidden="true" /> Contact us</Button>
        </div>
        {kind === 404 && (
          <nav className="err__links" aria-label="Helpful links">
            <Link to="/service"><Compass size={18} aria-hidden="true" /><span>Our services</span></Link>
            <Link to="/gallery"><ImageIcon size={18} aria-hidden="true" /><span>See our work</span></Link>
            <Link to="/about"><ArrowLeft size={18} aria-hidden="true" /><span>About AD ZONEX</span></Link>
          </nav>
        )}
      </div>
    </main>
  );

  if (bare) return <div className="page err-page">{body}</div>;
  return (
    <div className="page err-page">
      <SiteHeader activeHref="" />
      {body}
      <Footer />
    </div>
  );
}
