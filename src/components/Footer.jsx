import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin } from 'lucide-react';
import { SOCIALS, CONTACT_INFO } from '../data/services';
import { SocialLink } from './SocialIcons';
import { useContent } from '../context/ContentContext';
import './Footer.css';

/** Footer — same on every page: brand + socials, link columns, contact details. */
export default function Footer() {
  const { sessions } = useContent();
  const year = new Date().getFullYear();
  const tel = `tel:${CONTACT_INFO.phone.replace(/[\s()-]/g, '')}`;

  return (
    <footer className="site-footer">
      <div className="container">
        <div className="site-footer__grid">
          <div className="site-footer__brand">
            <Link to="/" aria-label="AD ZONEX — Home"><img src="/logo/logo-165.png" srcSet="/logo/logo-165.png 1x, /logo/logo-330.png 2x" alt="" width="160" height="43" loading="lazy" decoding="async" /></Link>
            <p>Graphic design, printing, signage and digital marketing for businesses in Coimbatore.</p>
            <div className="site-footer__socials">
              {SOCIALS.map((s) => <SocialLink key={s.name} name={s.name} url={s.url} />)}
            </div>
          </div>

          <nav aria-label="Services">
            <h2>Services</h2>
            <ul>
              {sessions.map((s) => (<li key={s.id}><Link to={`/service#${s.id}`}>{s.label}</Link></li>))}
              
            </ul>
          </nav>

          <nav aria-label="Company">
            <h2>Company</h2>
            <ul>
              <li><Link to="/about">About us</Link></li>
              <li><Link to="/gallery">Gallery</Link></li>
              <li><Link to="/clients">Clients</Link></li>
              <li><Link to="/careers">Careers</Link></li>
              <li><Link to="/profile">Profile</Link></li>
              <li><Link to="/contact">Contact</Link></li>
            </ul>
          </nav>

          <div>
            <h2>Visit or call</h2>
            <address>
              <p className="site-footer__row">
                <a className="site-footer__pin" href={CONTACT_INFO.map} target="_blank" rel="noopener noreferrer" aria-label="Open our location in Google Maps" title="Open in Google Maps"><MapPin size={18} aria-hidden="true" /></a>
                <a className="site-footer__addr" href={CONTACT_INFO.map} target="_blank" rel="noopener noreferrer">{CONTACT_INFO.addressLines[0]}<br />{CONTACT_INFO.addressLines[1]}<br />{CONTACT_INFO.addressLines[2]}</a>
              </p>
              <p className="site-footer__row"><Phone size={18} aria-hidden="true" /><a href={tel}>{CONTACT_INFO.phone}</a></p>
              <p className="site-footer__row"><Mail size={18} aria-hidden="true" /><a href={`mailto:${CONTACT_INFO.email}`}>{CONTACT_INFO.email}</a></p>
            </address>
          </div>
        </div>

        <div className="site-footer__bottom">
          <span>© {year} AD ZONEX. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
