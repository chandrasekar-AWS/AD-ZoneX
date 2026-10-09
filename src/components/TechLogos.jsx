import './TechLogos.css';

const LOGOS = [
  { name: 'Adobe', src: '/partners/adobe.svg' },
  { name: 'Microsoft 365', src: '/partners/microsoft-365.svg' },
  { name: 'AWS', src: '/partners/aws.svg' },
  { name: 'Google Ads', src: '/partners/google-ads.svg' },
  { name: 'Meta Ads', src: '/partners/meta.svg' },
  { name: 'YouTube Ads', src: '/partners/youtube.svg' },
  { name: 'Cloudflare', src: '/partners/cloudflare.svg' },
  { name: 'GoDaddy', src: '/partners/godaddy.svg' },
  { name: 'Supabase', src: '/partners/supabase.svg' },
  { name: 'Antigravity', src: '/partners/antigravity.svg' },
  { name: 'Google Search', src: '/partners/google-search.svg' },
];

/**
 * TechLogos — logos glide right-to-left in a seamless loop (the list is
 * rendered twice and the track moves by exactly half its width).
 * Pauses on hover; static and scrollable for reduced motion.
 */
export default function TechLogos() {
  const row = (key, hidden) => (
    <ul className="tl-row" key={key} aria-hidden={hidden || undefined}>
      {LOGOS.map((l) => (
        <li className="tl-item" key={l.name}>
          <img src={l.src} alt={hidden ? '' : l.name} height="32" loading="lazy" draggable={false} />
          <span>{l.name}</span>
        </li>
      ))}
    </ul>
  );
  return (
    <section className="tl section--ink" aria-label="Technology partners">
      <div className="container tl__head">
        <h2>Technology partners</h2>
        <p>The platforms and tools we use to build, run and promote your brand.</p>
      </div>
      <div className="tl__viewport">
        <div className="tl__track">{row('a', false)}{row('b', true)}</div>
      </div>
    </section>
  );
}
