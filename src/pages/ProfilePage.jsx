import { useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import SiteHeader from '../components/SiteHeader';
import Footer from '../components/Footer';
import Button from '../components/Button';
import { useContent } from '../context/ContentContext';
import useReveal from '../hooks/useReveal';
import './ProfilePage.css';

const initials = (name) => (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

/** /profile — the founder's photo, details and works. Edit it in Admin → Profile. */
export default function ProfilePage() {
  const { profile } = useContent();
  useEffect(() => { document.title = 'Profile | AD ZONEX'; }, []);
  useReveal([profile.works.length]);
  const paragraphs = (profile.about || '').split(/\n+/).map((p) => p.trim()).filter(Boolean);

  return (
    <div className="page profile-page">
      <SiteHeader activeHref="/profile" />
      <main>
        <section className="page-hero">
          <div className="container">
            <span className="eyebrow">Profile</span>
            <h1>The person behind AD ZONEX</h1>
            <p>Who we are, how we work and some of the projects we are proud of.</p>
          </div>
        </section>

        <section className="section section--ink" aria-label="Founder profile">
          <div className="container">
            <div className="pf-grid">
              <div className="pf-card reveal">
                <div className="pf-photo">
                  {profile.photo ? <img src={profile.photo} alt={profile.name} loading="lazy" decoding="async" /> : <span aria-hidden="true">{initials(profile.name)}</span>}
                </div>
                <h2>{profile.name}</h2>
                <p className="pf-role">{profile.role}</p>
                {profile.details.length > 0 && (
                  <dl className="pf-facts">
                    {profile.details.map((d) => (<div key={d.label}><dt>{d.label}</dt><dd>{d.value}</dd></div>))}
                  </dl>
                )}
              </div>

              <div className="pf-about reveal">
                {paragraphs.map((p, i) => <p key={i} className={i === 0 ? 'pf-lead' : ''}>{p}</p>)}
              </div>
            </div>

            {profile.works.length > 0 && (
              <>
                <h2 className="pf-works__title reveal">Selected work</h2>
                <ul className="pf-works">
                  {profile.works.map((w, i) => (
                    <li key={`${w.title}-${i}`} className="pf-work reveal" style={{ transitionDelay: `${(i % 3) * 70}ms` }}>
                      {w.image && <img src={w.image} alt={w.title} loading="lazy" decoding="async" />}
                      <div><h3>{w.title}</h3>{w.text && <p>{w.text}</p>}</div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </section>

        <section className="pf-cta">
          <div className="container pf-cta__inner">
            <div>
              <h2>Let's talk about your brand</h2>
              <p>Tell us what you need and we will send a clear written quote.</p>
            </div>
            <div className="pf-cta__btns">
              <Button to="/contact" variant="primary">Get a free quote <ArrowRight size={18} aria-hidden="true" /></Button>
              <Button to="/careers" variant="outline">Join our team</Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
