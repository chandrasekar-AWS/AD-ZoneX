import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import SiteHeader from '../components/SiteHeader';
import Footer from '../components/Footer';
import Button from '../components/Button';
import ServiceSlider from '../components/ServiceSlider';
import { useContent } from '../context/ContentContext';
import { useScrollToHash } from '../hooks/useScrollToHash';
import { scrollToEl } from '../utils/smoothScroll';
import { slugOf, servicePath, categoryPath, worksPath } from '../data/services';
import './ServicesHubPage.css';

/** /service — intro, sticky line sidebar and four large category boxes. */
export default function ServicesHubPage() {
  const { sessions } = useContent();
  const [active, setActive] = useState(0);
  const boxRefs = useRef([]);
  const tabsRef = useRef(null);
  const lock = useRef(false);
  const lockTimer = useRef(null);
  useScrollToHash();

  useEffect(() => { document.title = 'Services | AD ZONEX'; }, []);

  const labels = useMemo(() => sessions.map((s) => s.label), [sessions]);

  // Scroll-spy with IntersectionObserver: no layout reads on every scroll frame (that caused the lag).
  useEffect(() => {
    const els = boxRefs.current.filter(Boolean);
    if (!els.length || !('IntersectionObserver' in window)) return undefined;
    // A box becomes active while it crosses a thin band at ~40% of the viewport height.
    const io = new IntersectionObserver((entries) => {
      if (lock.current) return;
      entries.forEach((en) => {
        if (en.isIntersecting) {
          const i = boxRefs.current.indexOf(en.target);
          if (i >= 0) setActive(i);
        }
      });
    }, { rootMargin: '-40% 0px -59% 0px', threshold: 0 });
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [sessions.length]);

  // Keep the active tab visible in the mobile tab row.
  useEffect(() => {
    const el = tabsRef.current?.querySelectorAll('.svc-tab')[active];
    const row = tabsRef.current;
    if (el && row) row.scrollTo({ left: el.offsetLeft - (row.clientWidth - el.clientWidth) / 2, behavior: 'smooth' });
  }, [active]);

  const goTo = useCallback((idx) => {
    setActive(idx);
    lock.current = true;
    scrollToEl(boxRefs.current[idx], { offset: -(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) + 56) });
    clearTimeout(lockTimer.current);
    lockTimer.current = setTimeout(() => { lock.current = false; }, 1300);
  }, []);

  // /service#print etc. (used by menus and cards) selects the right box.
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    const i = sessions.findIndex((s) => s.id === id);
    if (i >= 0) setActive(i);
  }, [sessions]);

  return (
    <div className="page svc-page">
      <SiteHeader activeHref="/service" />

      <main>
        <section className="page-hero">
          <div className="container">
            <span className="eyebrow">Services</span>
            <h1>Design, print, signage, digital marketing and AWS cloud</h1>
            <p>
              For over 16 years AD ZONEX has helped businesses in Coimbatore build a brand that people notice and
              remember. We take care of the full journey, from the first logo sketch and the printed material in your
              customer's hand to the signboard above your door, the campaign running on their phone and the AWS cloud setup behind your website.
            </p>
            <p>
              Every service is handled in-house, so your brand stays consistent across print, signage and digital
              platforms. You explain your business once, and we carry it through every piece of work.
            </p>
          </div>
        </section>

        <div className="svc-tabs-wrap">
          <div className="container">
            <div className="svc-tabs" ref={tabsRef} role="tablist" aria-label="Service categories">
              {sessions.map((s, i) => (
                <button key={s.id} type="button" role="tab" aria-selected={active === i}
                  className={`svc-tab${active === i ? ' is-on' : ''}`} onClick={() => goTo(i)}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {sessions.map((s, i) => (
          <section key={s.id} id={s.id} ref={(el) => { boxRefs.current[i] = el; }}
            className={`svc-box${i % 2 ? ' svc-box--alt' : ''}`} aria-labelledby={`${s.id}-title`}>
            <div className="container svc-box__grid">
              <div className="svc-box__media">
                <ServiceSlider
                  images={(s.previewImages ?? s.services.flatMap((sv) => (sv.images ?? (sv.image ? [sv.image] : [])).slice(0, 1)))
                    .filter((v, k, a) => a.indexOf(v) === k)}
                  alt={s.label}
                />
              </div>
              <div className="svc-box__text">
                <h2 id={`${s.id}-title`}>{s.label}</h2>
                <p className="svc-box__desc">{s.description}</p>
                <ul className="svc-links">
                  {s.services.map((sv) => (
                    <li key={sv.name}>
                      <Link to={servicePath(slugOf(sv.name))}>
                        <span>{sv.name}</span>
                        <ArrowUpRight size={18} aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
                <div className="svc-box__actions">
                  <Button to={categoryPath(s.id)} variant="primary">Enquire</Button>
                  <Button to={worksPath(s.id)} variant="outline">See our work</Button>
                </div>
              </div>
            </div>
          </section>
        ))}

        <section className="section section--ink svc-closing">
          <div className="container svc-closing__inner">
            <p>Not sure which service you need? Tell us about your business and we will suggest what fits your budget.</p>
            <Button to="/contact" variant="lime">Get a free quote</Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
