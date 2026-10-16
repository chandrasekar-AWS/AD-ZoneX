import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { WhatsAppIcon } from './SocialIcons';
import { CONTACT_INFO } from '../data/services';
import './FloatingWhatsApp.css';

const MESSAGE = "Hello AD ZONEX, I'd like to enquire about your services.";

/**
 * Round WhatsApp button fixed to the bottom-right of every public page (not in /admin).
 * Opens a WhatsApp chat with a ready-typed message. Appears a moment after the page has loaded, so it never competes
 * with the first paint, and respects the phone's safe areas (notch / home bar).
 */
export default function FloatingWhatsApp() {
  const { pathname } = useLocation();
  const [show, setShow] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setShow(true), 1200);
    return () => clearTimeout(id);
  }, []);
  if (pathname.startsWith('/admin') || !show) return null;
  const href = `${CONTACT_INFO.whatsapp}?text=${encodeURIComponent(MESSAGE)}`;
  return (
    <a
      className="wa-float"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with AD ZONEX on WhatsApp (opens in a new tab)"
    >
      <span className="wa-float__ring" aria-hidden="true" />
      <WhatsAppIcon size={30} strokeWidth={1.8} aria-hidden="true" />
      <span className="wa-float__tip" aria-hidden="true">Chat on WhatsApp</span>
    </a>
  );
}
