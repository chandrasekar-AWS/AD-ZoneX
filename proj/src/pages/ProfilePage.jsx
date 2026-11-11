import { useEffect } from 'react';
import { ArrowRight } from 'lucide-react';
import SiteHeader from '../components/SiteHeader';
import Footer from '../components/Footer';
import Button from '../components/Button';
import { useContent } from '../context/ContentContext';
import useReveal from '../hooks/useReveal';
import './ProfilePage.css';

const paragraphs = (text) => (text || '').split(/\n+/).map((p) => p.trim()).filter(Boolean);
const initials = (name) => (name || '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

/** /profile — the founder's photo, details and works. Edit it in Admin → Profile. */
export default function ProfilePage() {
  const { profile } = useContent();
  useEffect(() => { document.title = 'Profile | AD ZONEX'; }, []);
  useReveal([profile.works.length, profile.people.length]);

  return (
    <div className="page profile-page">
      <SiteHeader activeHref="/profile" />
      <main>
        <section className="page-hero">
          <div className="container">
            <span className="eyebrow">Profile</span>
            <h1>The people behind AD ZONEX</h1>
            <p>Meet the leaders and specialists who run your project, from the first idea to the final delivery.</p>
          </div>
        </section>

        <section className="section section--ink" aria-label="Our leadership and team">
          <div className="container">
            {profile.people.map((person, n) => (
              <article key={person.id || n} className="pf-person" aria-label={person.section || person.name}>
                <div className="pf-grid">
                  <div className="pf-card reveal">
                    {person.section && <span className="pf-tag">{person.section}</span>}
                    <div className="pf-photo">
                      {person.photo ? <img src={person.photo} alt={person.name} loading={n < 2 ? 'eager' : 'lazy'} decoding="async" /> : <span aria-hidden="true">{initials(person.name)}</span>}
                    </div>
                    <h2>{person.name}</h2>
                    <p className="pf-role">{person.role}</p>
                  </div>

                  <div className="pf-about reveal">
                    {person.intro && <h3 className="pf-intro">{person.intro}</h3>}
                    {paragraphs(person.about).map((p, i) => <p key={i} className={i === 0 && !person.intro ? 'pf-lead' : ''}>{p}</p>)}
                    {person.expertise?.length > 0 && (
                      <>
                        {person.expertiseTitle && <h3 className="pf-intro pf-intro--sm">{person.expertiseTitle}</h3>}
                        <ul className="pf-skills">
                          {person.expertise.map((x) => <li key={x}>{x}</li>)}
                        </ul>
                      </>
                    )}
                  </div>
                </div>
              </article>
            ))}

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
