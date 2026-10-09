import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { SESSIONS as DEFAULT_SESSIONS, TESTIMONIALS } from '../data/services';

const Ctx = createContext(null);

// Old gallery titles saved in the database (e.g. "Flyer & brochures Design") are shown with the correct
// service name. Matching ignores capitals, "&"/"and", plurals and a trailing "Design".
const titleKey = (t) => String(t).toLowerCase().replace(/&/g, ' ').split(/[^a-z]+/).filter((w) => w && w !== 'and' && w !== 'design')
  .map((w) => (w.length > 3 ? w.replace(/s$/, '') : w)).join('');
const CANONICAL = new Map(DEFAULT_SESSIONS.flatMap((s) => s.services.map((sv) => [titleKey(sv.name), sv.name])));
const fixTitle = (t) => (t && CANONICAL.get(titleKey(t))) || t;

const defaultGallery = () =>
  DEFAULT_SESSIONS.flatMap((s) =>
    s.services.map((svc, i) => ({
      id: `default-${s.id}-${i}`,
      image: svc.images?.[0] ?? svc.image,
      title: svc.name,
      category: s.id,
    }))
  ).filter((g) => g.image);

// Shown on the Careers page until the owner fills in Admin → Profile.
export const DEFAULT_PROFILE = {
  name: 'Founder name',
  role: 'Founder · AD ZONEX, Coimbatore',
  photo: '',
  about: 'A short introduction goes here: who you are, how AD ZONEX started and what you care about when you work with clients. You can edit all of this in Admin → Profile.',
  details: [
    { label: 'Experience', value: '16+ years in design, print and signage' },
    { label: 'Based in', value: 'Coimbatore, Tamil Nadu' },
  ],
  works: [],
};

const defaultReviews = () => TESTIMONIALS.map((t, i) => ({ id: `default-${i}`, ...t }));

/**
 * Site content = built-in defaults (src/data/services.js) overlaid with whatever
 * the admin has saved (/api/content). Pages render instantly with defaults and
 * swap in the saved content as soon as it loads.
 */
export function ContentProvider({ children }) {
  const [remote, setRemote] = useState({ gallery: null, reviews: null, services: null, clients: null, profile: null });

  const refresh = useCallback(async () => {
    try {
      const r = await fetch('/api/content', { cache: 'no-store' });
      if (r.ok && (r.headers.get('content-type') || '').includes('json')) setRemote(await r.json());
    } catch { /* offline / local dev without functions -> defaults */ }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const value = useMemo(() => {
    const sessions = DEFAULT_SESSIONS.map((s) =>
      Array.isArray(remote.services?.[s.id]) ? { ...s, services: remote.services[s.id] } : s
    );
    return {
      sessions,
      gallery: Array.isArray(remote.gallery) ? remote.gallery.map((g) => ({ ...g, title: fixTitle(g.title) })) : defaultGallery(),
      reviews: Array.isArray(remote.reviews) ? remote.reviews : defaultReviews(),
      clients: Array.isArray(remote.clients) ? remote.clients : [],
      profile: remote.profile && typeof remote.profile === 'object' ? { ...DEFAULT_PROFILE, ...remote.profile } : DEFAULT_PROFILE,
      refresh,
    };
  }, [remote, refresh]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useContent = () => useContext(Ctx);
