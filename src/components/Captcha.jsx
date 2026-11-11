import { useEffect, useRef } from 'react';

// Cloudflare Turnstile "I am human" check. It appears ONLY when VITE_TURNSTILE_SITE_KEY is set (see SETUP.md);
// otherwise this component renders nothing and the forms work exactly as before.
export const CAPTCHA_ON = !!import.meta.env.VITE_TURNSTILE_SITE_KEY;
const SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

export default function Captcha({ onToken }) {
  const box = useRef(null);
  useEffect(() => {
    if (!CAPTCHA_ON || !box.current) return undefined;
    let id = null; let dead = false;
    const mount = () => {
      if (dead || !window.turnstile || !box.current) return;
      id = window.turnstile.render(box.current, {
        sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY, theme: 'light',
        callback: (t) => onToken(t), 'expired-callback': () => onToken(''), 'error-callback': () => onToken(''),
      });
    };
    if (window.turnstile) mount();
    else {
      let s = document.querySelector(`script[src="${SRC}"]`);
      if (!s) { s = document.createElement('script'); s.src = SRC; s.async = true; document.head.appendChild(s); }
      s.addEventListener('load', mount);
    }
    return () => { dead = true; try { if (id !== null) window.turnstile?.remove(id); } catch { /* ignore */ } };
  }, [onToken]);
  return CAPTCHA_ON ? <div ref={box} className="captcha" style={{ minHeight: 65 }} /> : null;
}
