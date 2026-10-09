import { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, Cloud, Globe, LifeBuoy, MessageCircle, Megaphone, PenTool, Phone, Printer, Signpost } from 'lucide-react';
import SiteHeader from '../components/SiteHeader';
import Footer from '../components/Footer';
import Button from '../components/Button';
import CountUp from '../components/CountUp';
import HeroShowcase from '../components/HeroShowcase';
import TechLogos from '../components/TechLogos';
import { useContent } from '../context/ContentContext';
import { useScrollToHash } from '../hooks/useScrollToHash';
import useReveal from '../hooks/useReveal';
import { PHILOSOPHY, STATS, CONTACT_INFO, slugOf, servicePath } from '../data/services';
import './HomePage.css';

// Our technical wing, shown as a selling point on the Home page: [icon, title, text, service slug]
const TECH_WING = [
  [Cloud, 'AWS cloud services', 'Secure hosting, backends and cloud setup on Amazon Web Services.', 'aws-cloud-services'],
  [Globe, 'Web design & development', 'Websites and web apps that match your print and signage.', 'web-design-development'],
  [Megaphone, 'Digital marketing', 'Social media, Google and WhatsApp campaigns in the same brand look.', 'digital-marketing'],
  [LifeBuoy, 'Tech support', 'Domain, email and fixes handled by people who know your setup.', 'tech-support'],
];

const CATEGORY_ICON = { design: PenTool, print: Printer, signage: Signpost, digital: Globe };

const PROCESS = [
  ['Understand', 'We learn about your business, your customers and what the work needs to achieve.'],
  ['Design', 'We prepare layouts and share them with you. Nothing goes to print until you approve it.'],
  ['Produce', 'Your approved design goes to print or fabrication, in the material we agreed on.'],
  ['Install', 'Our team delivers and fixes everything on site, and checks that it is done properly.'],
  ['Promote', 'We take your brand online through social media, Google and digital campaigns.'],
  ['Support', 'If something needs a touch-up or a change later, you know exactly who to call.'],
];

// Template text that was never replaced shouldn't appear on a live website.
const isPlaceholder = (t) => /add your client|client name|lorem ipsum/i.test(`${t.quote} ${t.name}`);

export default function HomePage() {
  const { sessions, gallery, reviews } = useContent();
  useEffect(() => { document.title = 'AD ZONEX | Graphic Design, Printing & Signage in Coimbatore'; }, []);
  useScrollToHash();

  const work = useMemo(() => {
    const uploaded = gallery.filter((g) => g.image && !String(g.id ?? '').startsWith('default-'));
    const pool = uploaded.length >= 3 ? uploaded : gallery.filter((g) => g.image && g.category === 'design');
    return pool.slice(0, 8);
  }, [gallery]);

  const quotes = useMemo(() => reviews.filter((t) => t.quote && !isPlaceholder(t)).slice(0, 3), [reviews]);
  const tel = `tel:${CONTACT_INFO.phone.replace(/[\s()-]/g, '')}`;

  useReveal([sessions.length, work.length, quotes.length]);

  return (
    <div className="page home">
      <SiteHeader activeHref="/" />

      <main>
        {/* ---------- Hero ---------- */}
        <section className="hero dark">
          <div className="container hero__grid">
            <div className="hero__copy">
              <h1>Printing, Design, Signage &amp; Digital Marketing in Coimbatore</h1>
              <p className="hero__lead">
                From the first sketch to the final installation, one team looks after your logo, printed
                material, signboards and online marketing.
              </p>
              <div className="hero__actions">
                <Button to="/contact" variant="lime">Get a free quote</Button>
                <Button to="/gallery" variant="outline">See our work</Button>
              </div>
              <dl className="hero__stats">
                {STATS.map((s) => (
                  <div key={s.label}><dt>{s.label}</dt><dd><CountUp value={s.value} /></dd></div>
                ))}
              </dl>
            </div>

            <HeroShowcase />
          </div>
        </section>

        {/* ---------- Services ---------- */}
        <section className="section" id="services">
          <div className="container">
            <div className="section-head reveal">
              <span className="eyebrow">What we do</span>
              <h2>Four services, one team</h2>
              <p>Design, print, signage and digital work are all handled in-house, so you explain your business once.</p>
            </div>

            <div className="svc-grid">
              {sessions.map((s, i) => {
                const Icon = CATEGORY_ICON[s.id] ?? Megaphone;
                return (
                  <article key={s.id} className="svc-card reveal" style={{ transitionDelay: `${i * 60}ms` }}>
                    <span className="svc-card__icon" aria-hidden="true"><Icon size={24} /></span>
                    <h3><Link to={`/service#${s.id}`}>{s.label}</Link></h3>
                    <ul>
                      {s.services.slice(0, 5).map((sv) => (
                        <li key={sv.name}><Link to={servicePath(slugOf(sv.name))}>{sv.name}</Link></li>
                      ))}
                    </ul>
                    <Link to={`/service#${s.id}`} className="link-arrow">All {s.label.toLowerCase()} services <ArrowRight size={16} aria-hidden="true" /></Link>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* ---------- Technical wing: our single-window advantage ---------- */}
        <section className="section section--ink tw" id="technical-wing" aria-labelledby="tw-title">
          <div className="container tw__grid">
            <div className="reveal">
              <span className="eyebrow">Single-window agency</span>
              <h2 id="tw-title">Creative work and a technical team, under one roof</h2>
              <p>
                Many print shops stop at the signboard. We also have our own technical wing, so the website, the cloud
                it runs on and the marketing behind it are built by the same team that designed your logo.
              </p>
              <Button to="/contact?service=aws-cloud-services" variant="lime">Talk to our tech team</Button>
            </div>
            <ul className="tw__list">
              {TECH_WING.map(([Icon, title, text, slug], i) => (
                <li key={title} className="reveal" style={{ transitionDelay: `${i * 70}ms` }}>
                  <Link to={servicePath(slug)}>
                    <span className="tw__icon" aria-hidden="true"><Icon size={22} /></span>
                    <span className="tw__text"><strong>{title}</strong><span>{text}</span></span>
                    <ArrowUpRight size={18} className="tw__arrow" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ---------- About strip ---------- */}
        <section className="section section--white" id="about">
          <div className="container about-strip">
            <div className="reveal">
              <span className="eyebrow">{PHILOSOPHY.eyebrow}</span>
              <h2>{PHILOSOPHY.heading}</h2>
            </div>
            <div className="reveal">
              <p>{PHILOSOPHY.body}</p>
              <Button to="/about" variant="outline" className="about-strip__btn">More about us</Button>
            </div>
          </div>
        </section>

        {/* ---------- Process ---------- */}
        <section className="section">
          <div className="container">
            <div className="section-head reveal">
              <span className="eyebrow">How we work</span>
              <h2>From brief to installation</h2>
            </div>
            <ol className="steps">
              {PROCESS.map(([t, d], i) => (
                <li key={t} className="reveal" style={{ transitionDelay: `${i * 60}ms` }}>
                  <h3>{t}</h3>
                  <p>{d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------- Recent work ---------- */}
        {work.length > 0 && (
          <section className="section section--white">
            <div className="container">
              <div className="section-head section-head--row reveal">
                <div>
                  <span className="eyebrow">Our work</span>
                  <h2>Recent projects</h2>
                </div>
                <Link to="/gallery" className="link-arrow">View full gallery <ArrowUpRight size={16} aria-hidden="true" /></Link>
              </div>
              <ul className="work-grid">
                {work.map((w, i) => (
                  <li key={w.id ?? w.image} className="reveal" style={{ transitionDelay: `${(i % 3) * 60}ms` }}>
                    <Link to={`/gallery?category=${w.category}&title=${encodeURIComponent(w.title)}`}>
                      <img src={w.image} alt={w.title} loading="lazy" width="1600" height="893" />
                      <span>{w.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* ---------- Testimonials (hidden until there are real quotes) ---------- */}
        {quotes.length > 0 && (
          <section className="section" id="testimonials">
            <div className="container">
              <div className="section-head reveal">
                <span className="eyebrow">Client feedback</span>
                <h2>What our clients say</h2>
              </div>
              <div className={`quotes quotes--${quotes.length}`}>
                {quotes.map((t, i) => (
                  <figure key={t.id ?? i} className="quote reveal">
                    <blockquote>{t.quote}</blockquote>
                    <figcaption><strong>{t.name}</strong>{t.role && <span>{t.role}</span>}</figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ---------- Technology logos (loop) ---------- */}
        <TechLogos />

        {/* ---------- Closing CTA ---------- */}
        <section className="cta">
          <div className="container cta__inner">
            <div>
              <h2>Planning a new shop, signboard or campaign?</h2>
              <p>Tell us what you have in mind. We will visit, advise and send you a clear written quote.</p>
            </div>
            <div className="cta__actions">
              <Button to="/contact" variant="primary">Get a free quote</Button>
              <Button href={tel} variant="outline"><Phone size={18} aria-hidden="true" /> {CONTACT_INFO.phone}</Button>
              <Button href={CONTACT_INFO.whatsapp} variant="outline" target="_blank" rel="noreferrer"><MessageCircle size={18} aria-hidden="true" /> WhatsApp</Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
