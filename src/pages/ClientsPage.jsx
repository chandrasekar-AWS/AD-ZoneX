import { useEffect, useMemo } from 'react';
import SiteHeader from '../components/SiteHeader';
import Footer from '../components/Footer';
import useReveal from '../hooks/useReveal';
import { useContent } from '../context/ContentContext';
import './ClientsPage.css';

const PER_ROW = 6; // logos visible in one row; every extra six logos make a new row

/** Splits the list into rows of six. A short last row is topped up so it still fills the width. */
function toRows(list) {
  const rows = [];
  for (let i = 0; i < list.length; i += PER_ROW) {
    const row = list.slice(i, i + PER_ROW);
    for (let k = 0; row.length < PER_ROW; k++) row.push(list[k % list.length]);
    rows.push(row);
  }
  return rows;
}

/** /clients — nothing but client logos, in rows that glide right-to-left in a loop. */
export default function ClientsPage() {
  const { clients } = useContent();
  const rows = useMemo(() => toRows(clients.filter((c) => c.image)), [clients]);

  useEffect(() => { document.title = 'Our Clients | AD ZONEX'; }, []);
  useReveal([rows.length]);

  return (
    <div className="page clients">
      <SiteHeader activeHref="/clients" />
      <main>
        <section className="page-hero">
          <div className="container">
            <span className="eyebrow">Clients</span>
            <h1>Businesses that trust us with their brand</h1>
          </div>
        </section>

        <section className="cl-section" aria-label="Our clients">
          {rows.length === 0 ? (
            <p className="container cl-empty">Our client list is being updated. Please check back soon.</p>
          ) : (
            <ul className="cl-rows">
              {rows.map((row, r) => (
                <li key={r} className="cl-row reveal" style={{ '--dur': `${34 + (r % 3) * 6}s`, '--shift': `-${(r * 7) % 30}s` }}>
                  <div className="cl-track">
                    {[0, 1].map((copy) => (
                      <ul className="cl-set" key={copy} aria-hidden={copy ? true : undefined}>
                        {row.map((c, i) => (
                          <li className="cl-logo" key={`${c.id}-${i}`}>
                            <img src={c.image} alt={copy ? '' : c.name || 'Client logo'} loading="lazy" decoding="async" draggable={false} />
                          </li>
                        ))}
                      </ul>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
