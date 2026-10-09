import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import SiteHeader from '../components/SiteHeader';
import Footer from '../components/Footer';
import Button from '../components/Button';
import NotFoundPage from './NotFoundPage';
import { useContent } from '../context/ContentContext';
import useReveal from '../hooks/useReveal';
import { slugOf, servicePath, categoryPath, worksPath, contactPath } from '../data/services';
import './CategoryPage.css';

/** /service/:category — one page per category (design, print, signage, digital) listing all its services. */
export default function CategoryPage() {
  const { category } = useParams();
  const { sessions } = useContent();
  const cat = sessions.find((s) => s.id === String(category).toLowerCase());

  useEffect(() => {
    document.title = cat ? `${cat.label} Services | AD ZONEX` : 'Page not found | AD ZONEX';
  }, [cat]);
  useReveal([cat?.id]);

  if (!cat) return <NotFoundPage />;
  const others = sessions.filter((s) => s.id !== cat.id);

  return (
    <div className="page cat-page">
      <SiteHeader activeHref="/service" />

      <main>
        <section className="page-hero">
          <div className="container">
            <nav className="cat-crumbs" aria-label="Breadcrumb">
              <Link to="/service">Services</Link><span aria-hidden="true">/</span><span aria-current="page">{cat.label}</span>
            </nav>
            <h1>{cat.label} services</h1>
            <p>{cat.description}</p>
            <div className="cat-hero__actions">
              <Button to={contactPath(cat.id)} variant="lime">Get a quote</Button>
              <Button to={worksPath(cat.id)} variant="outline">See our work</Button>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="section-head reveal">
              <span className="eyebrow">Services</span>
              <h2>Choose a service to see details and enquire</h2>
            </div>
            <ul className="cat-grid">
              {cat.services.map((sv, i) => {
                const img = sv.images?.[0] ?? sv.image;
                return (
                  <li key={sv.name} className="cat-card reveal" style={{ transitionDelay: `${(i % 3) * 60}ms` }}>
                    {img && <img src={img} alt="" loading="lazy" width="1200" height="800" />}
                    <div className="cat-card__body">
                      <h3><Link to={servicePath(slugOf(sv.name))} className="cat-card__link">{sv.name}</Link></h3>
                      {sv.description && <p>{sv.description}</p>}
                      {sv.items?.length > 0 && (
                        <ul className="cat-card__items">{sv.items.slice(0, 4).map((it) => <li key={it}>{it}</li>)}</ul>
                      )}
                      <span className="cat-card__more">Details &amp; enquire <ArrowRight size={16} aria-hidden="true" /></span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <section className="section section--white cat-others">
          <div className="container">
            <div className="section-head reveal">
              <span className="eyebrow">More from AD ZONEX</span>
              <h2>Explore our other services</h2>
            </div>
            <ul className="cat-others__list">
              {others.map((o) => (
                <li key={o.id}><Link to={categoryPath(o.id)}><strong>{o.label}</strong><span>{o.services.length} services</span><ArrowRight size={18} aria-hidden="true" /></Link></li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
