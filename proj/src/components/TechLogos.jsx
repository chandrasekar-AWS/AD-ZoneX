import './TechLogos.css';

const LOGOS = [
  { name: 'Adobe', src: '/partners/adobe.svg', w: 36 },
  { name: 'Microsoft 365', src: '/partners/microsoft-365.svg', w: 32 },
  { name: 'AWS', src: '/partners/aws.svg', w: 32 },
  { name: 'Google Ads', src: '/partners/google-ads.svg', w: 36 },
  { name: 'Meta Ads', src: '/partners/meta.svg', w: 48 },
  { name: 'YouTube Ads', src: '/partners/youtube.svg', w: 46 },
  { name: 'Cloudflare', src: '/partners/cloudflare.svg', w: 70 },
  { name: 'GoDaddy', src: '/partners/godaddy.svg', w: 32 },
  { name: 'Supabase', src: '/partners/supabase.svg', w: 31 },
  { name: 'Antigravity', src: '/partners/antigravity.svg', w: 32 },
  { name: 'Google Search', src: '/partners/google-search.svg', w: 32 },
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
          <img src={l.src} alt={hidden ? '' : l.name} width={l.w} height="32" loading="lazy" decoding="async" draggable={false} />
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
