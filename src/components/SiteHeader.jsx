import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { NAV_ITEMS, slugOf, servicePath } from '../data/services';
import { useContent } from '../context/ContentContext';
import useScrollLock from '../hooks/useScrollLock';
import './SiteHeader.css';

// Extra links that live in the ☰ menu (desktop) and at the bottom of the mobile panel.
const MORE_LINKS = [
  { label: 'Clients', to: '/clients' },
  { label: 'Careers', to: '/careers' },
];

/** Three bars that morph into an X (pure CSS, so it animates smoothly both ways). */
function Burger({ open }) {
  return (
    <span className={`burger${open ? ' is-open' : ''}`} aria-hidden="true"><i /><i /><i /></span>
  );
}

/**
 * SiteHeader — fixed header on every page.
 * Transparent at the top of the page; gets a dark blurred background once you scroll.
 * Desktop: logo · links (Services opens a four-column menu) · ☰ button (hover turns it
 * into ✕ and opens a small menu). Mobile: logo · ☰ that opens a full-width panel.
 * Pass `solid` on pages that start with a light section so the header never sits transparent on it.
 */
export default function SiteHeader({ activeHref = '/', solid = false }) {
  const { sessions } = useContent();
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);      // services mega menu
  const [moreOpen, setMoreOpen] = useState(false);      // ☰ mini menu (desktop)
  const [mobileOpen, setMobileOpen] = useState(false);  // mobile panel
  const megaTimer = useRef(null);
  const moreTimer = useRef(null);

  useEffect(() => { setMenuOpen(false); setMoreOpen(false); setMobileOpen(false); }, [pathname]);

  // Background appears after a few pixels of scrolling.
  useEffect(() => {
    // Hysteresis: shrinks after 28px, grows back below 6px, so it never flickers at the threshold.
    const onScroll = () => setScrolled((was) => (was ? window.scrollY > 6 : window.scrollY > 28));
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') { setMenuOpen(false); setMoreOpen(false); setMobileOpen(false); } };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  useScrollLock(mobileOpen);

  const openMega = () => { clearTimeout(megaTimer.current); setMenuOpen(true); setMoreOpen(false); };
  const closeMega = () => { clearTimeout(megaTimer.current); megaTimer.current = setTimeout(() => setMenuOpen(false), 140); };
  const openMore = () => { clearTimeout(moreTimer.current); setMoreOpen(true); setMenuOpen(false); };
  const closeMore = () => { clearTimeout(moreTimer.current); moreTimer.current = setTimeout(() => setMoreOpen(false), 160); };

  const isActive = (href) => (href === '/' ? activeHref === '/' : activeHref.startsWith(href));
  const compact = solid || scrolled;
  const filled = compact || mobileOpen || menuOpen || moreOpen;

  return (
    <header className={`site-header${filled ? ' is-filled' : ''}${compact ? ' is-compact' : ''}`}>
      <div className="container site-header__bar">
        <Link to="/" className="site-header__logo" aria-label="AD ZONEX — Home">
          <img src="/logo/logo.png" alt="AD ZONEX" width="165" height="45" />
        </Link>

        <nav className="site-nav" aria-label="Main">
          <ul>
            {NAV_ITEMS.map((item) =>
              item.isServiceMenu ? (
                <li key={item.href} className="site-nav__has-menu" onMouseEnter={openMega} onMouseLeave={closeMega}>
                  <Link to={item.href} className={`site-nav__link${isActive(item.href) ? ' is-active' : ''}`}>{item.label}</Link>
                  <button
                    type="button" className="site-nav__chev" aria-label="Show services menu"
                    aria-expanded={menuOpen} aria-controls="services-menu"
                    onClick={() => setMenuOpen((v) => !v)}
                  >
                    <ChevronDown size={16} aria-hidden="true" />
                  </button>
                  {menuOpen && (
                    <div id="services-menu" className="mega" onMouseEnter={openMega} onMouseLeave={closeMega}>
                      <div className="mega__grid">
                        {sessions.map((s) => (
                          <div key={s.id} className="mega__col">
                            <Link to={`/service#${s.id}`} className="mega__head">{s.label}</Link>
                            <ul>
                              {s.services.map((svc) => (
                                <li key={svc.name}><Link to={servicePath(slugOf(svc.name))}>{svc.name}</Link></li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </li>
              ) : (
                <li key={item.href}>
                  <Link to={item.href} className={`site-nav__link${isActive(item.href) ? ' is-active' : ''}`} aria-current={isActive(item.href) ? 'page' : undefined}>
                    {item.label}
                  </Link>
                </li>
              )
            )}
          </ul>
        </nav>

        <div className="site-header__end">
          {/* Desktop ☰ — hover (or click / keyboard) morphs it into ✕ and opens the mini menu */}
          <div className="more" onMouseEnter={openMore} onMouseLeave={closeMore}>
            <button
              type="button" className="more__btn" aria-label={moreOpen ? 'Close more menu' : 'Open more menu'}
              aria-expanded={moreOpen} aria-controls="more-menu" onClick={() => setMoreOpen((v) => !v)}
            >
              <Burger open={moreOpen} />
            </button>
            <div id="more-menu" className={`more__menu${moreOpen ? ' is-open' : ''}`} aria-hidden={!moreOpen}>
              <ul>
                {MORE_LINKS.map((l, i) => (
                  <li key={l.label} style={{ '--i': i }}><Link to={l.to} tabIndex={moreOpen ? 0 : -1}>{l.label}</Link></li>
                ))}
              </ul>
            </div>
          </div>

          {/* Mobile ☰ */}
          <button
            type="button" className="site-header__toggle" aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen} aria-controls="mobile-panel" onClick={() => setMobileOpen((v) => !v)}
          >
            <Burger open={mobileOpen} />
          </button>
        </div>
      </div>

      <div id="mobile-panel" className={`mobile-panel${mobileOpen ? ' is-open' : ''}`} data-lenis-prevent aria-hidden={!mobileOpen}>
          <nav aria-label="Mobile">
            <ul>
              {NAV_ITEMS.map((item) => (
                <li key={item.href}><Link to={item.href} className={isActive(item.href) ? 'is-active' : ''}>{item.label}</Link></li>
              ))}
            </ul>
            <p className="mobile-panel__label">Services</p>
            <ul className="mobile-panel__sub">
              {sessions.map((s) => (<li key={s.id}><Link to={`/service#${s.id}`}>{s.label}</Link></li>))}
            </ul>
            <p className="mobile-panel__label">More</p>
            <ul className="mobile-panel__sub">
              {MORE_LINKS.map((l) => (<li key={l.label}><Link to={l.to}>{l.label}</Link></li>))}
            </ul>
          </nav>
      </div>
    </header>
  );
}
