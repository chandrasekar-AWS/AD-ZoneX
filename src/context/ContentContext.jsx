import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { SESSIONS as DEFAULT_SESSIONS, TESTIMONIALS, LEGACY_NAMES, slugOf } from '../data/services';

const Ctx = createContext(null);

// Old gallery titles saved in the database (e.g. "Flyer & brochures Design") are shown with the correct
// service name. Matching ignores capitals, "&"/"and", plurals and a trailing "Design".
const titleKey = (t) => String(t).toLowerCase().replace(/&/g, ' ').split(/[^a-z]+/).filter((w) => w && w !== 'and' && w !== 'design')
  .map((w) => (w.length > 3 ? w.replace(/s$/, '') : w)).join('');
const CANONICAL = new Map([
  ...DEFAULT_SESSIONS.flatMap((s) => s.services.map((sv) => [titleKey(sv.name), sv.name])),
  ...Object.entries(LEGACY_NAMES).map(([old, now]) => [titleKey(old.replace(/-/g, ' ')), now]),
]);
const fixTitle = (t) => (t && CANONICAL.get(titleKey(t))) || t;

// Pages the website links to from the Home page. If services saved in Admin long ago do not include them,
// they are added back so those links can never lead to a "not found" page.
const REQUIRED_SERVICES = new Set(['aws-cloud-services', 'web-design-development', 'digital-marketing', 'tech-support']);
const withRequired = (session, saved) => {
  const have = new Set(saved.map((sv) => slugOf(sv.name)));
  const missing = session.services.filter((sv) => REQUIRED_SERVICES.has(slugOf(sv.name)) && !have.has(slugOf(sv.name)));
  return missing.length ? [...saved, ...missing] : saved;
};

// Services saved in Admin long ago may use old names (e.g. "Flyer & brochures Design") and old picture paths.
// Each saved service is matched to the built-in one by its (fuzzy) name, then it gets the correct name and, if it
// only has built-in or missing pictures, the correct built-in picture. Pictures uploaded in Admin are kept.
const BUILT_IN = /^\/(design|print|signage|digital)\//;
const withDefaultImages = (session, saved) => saved.map((sv) => {
  const renamed = LEGACY_NAMES[slugOf(sv.name)]; // saved under an old name: move to the new name and new text
  const d = session.services.find((x) => titleKey(x.name) === titleKey(renamed || sv.name));
  if (!d) return sv; // a service added by the owner in Admin: leave as saved
  const imgs = Array.isArray(sv.images) ? sv.images.filter(Boolean) : [];
  const useDefault = d.images?.length && imgs.every((i) => BUILT_IN.test(i));
  return { ...sv, name: d.name, ...(renamed ? { description: d.description } : {}), images: useDefault ? d.images : sv.images };
});

const defaultGallery = () =>
  DEFAULT_SESSIONS.flatMap((s) =>
    s.services.map((svc, i) => ({
      id: `default-${s.id}-${i}`,
      image: svc.images?.[0] ?? svc.image,
      title: svc.name,
      category: s.id,
    }))
  ).filter((g) => g.image);

// Shown on the Profile page until the owner edits it in Admin → Profile.
// "section" is the small label above each person, "role" the line under the name, "intro" an optional sub-heading,
// "expertise" an optional bullet list. A blank line in "about" starts a new paragraph.
export const DEFAULT_PEOPLE = [
  {
    id: 'founder', section: 'Founder', name: 'Mrs. Nafeeza Basha', role: 'Founder, Ad Zonex',
    photo: '/team/nafeeza-basha.webp', intro: '', expertiseTitle: '', expertise: [],
    about: 'Every great brand begins with someone who believes in it. When I started Ad Zonex, I had one simple idea: a business in Coimbatore shouldn’t need five different vendors just to get noticed. So I built a place where your logo, printing, signboards, website and online marketing all come together under one roof, with one team that truly cares about your result.\n\nMy way of leading is simple and hands-on. I listen to what a client really needs, I tell them honestly what will work, and I hold my team to a high standard from the first sketch to the final print. Over time, Ad Zonex has grown from a design-and-print service into a complete growth partner for local businesses, and I’m proud of that journey.',
  },
  {
    id: 'managing-director', section: 'Managing Director', name: 'Mr. Kathar Basha. M', role: 'Director, Ad Zonex',
    photo: '/team/kathar-basha.webp', intro: 'Introduction', expertiseTitle: '', expertise: [],
    about: 'I am Kathar Basha. M, Director of Ad Zonex. I lead a team that turns ideas into designs, prints, signage, websites and marketing campaigns. I believe a brand grows when creativity, quality and reliable delivery come together, and I bring that belief to every project we take on.\n\nAt Ad Zonex, we offer graphic design, flex and UV printing, signage, digital marketing, web design and promotional video production under one roof. My focus is simple: understand each client’s goals, keep our standards high, and deliver on time, so that every business we work with can stand out and grow.\n\nI lead by example, with hands-on involvement, clear communication and a firm commitment to client satisfaction. My vision is to make Ad Zonex a trusted creative partner for businesses across Coimbatore and beyond.',
  },
  {
    id: 'web-solutions', section: 'Web Solutions Specialist', name: 'Chandru', role: 'Web Solutions Specialist',
    photo: '/team/chandru.webp', intro: 'Website Design | Cloud & Hosting Management', expertiseTitle: 'Areas of Expertise',
    expertise: ['Search Engine Optimization (SEO)', 'Website Design & Development', 'Web Hosting & Cloud Management', 'Website Maintenance & Performance'],
    about: 'A dedicated digital solutions specialist focused on building strong online experiences for businesses. Skilled in Search Engine Optimization (SEO), modern website design, web hosting, and cloud management, with a focus on improving search visibility, website performance, security, and user experience.\n\nCombining technical expertise with smart digital strategies to help businesses establish, manage, and grow their online presence.',
  },
];

export const DEFAULT_PROFILE = { people: DEFAULT_PEOPLE, works: [] };

const defaultReviews = () => TESTIMONIALS.map((t, i) => ({ id: `default-${i}`, ...t }));

/**
 * Site content = built-in defaults (src/data/services.js) overlaid with whatever
 * the admin has saved (/api/content). Pages render instantly with defaults and
 * swap in the saved content as soon as it loads.
 */
const CACHE_KEY = 'adzone:content:v2';
const EMPTY = { gallery: null, reviews: null, services: null, clients: null, profile: null };
// The last content this browser received. It is shown at once on the next visit (no flash of old defaults),
// then replaced by the fresh copy a moment later.
const readCache = () => {
  try { const v = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); return v && typeof v === 'object' ? { ...EMPTY, ...v } : EMPTY; } catch { return EMPTY; }
};
const writeCache = (v) => { try { const s = JSON.stringify(v); if (s.length < 400000) localStorage.setItem(CACHE_KEY, s); } catch { /* private mode / full */ } };

export function ContentProvider({ children }) {
  const [remote, setRemote] = useState(readCache);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch('/api/content', { cache: 'no-store' });
      if (r.ok && (r.headers.get('content-type') || '').includes('json')) { const data = await r.json(); setRemote(data); writeCache(data); }
    } catch { /* offline / local dev without functions -> defaults */ }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const value = useMemo(() => {
    const sessions = DEFAULT_SESSIONS.map((s) =>
      Array.isArray(remote.services?.[s.id]) ? { ...s, services: withRequired(s, withDefaultImages(s, remote.services[s.id])) } : s
    );
    return {
      sessions,
      gallery: Array.isArray(remote.gallery) ? remote.gallery.map((g) => ({ ...g, title: fixTitle(g.title) })) : defaultGallery(),
      reviews: Array.isArray(remote.reviews) ? remote.reviews : defaultReviews(),
      clients: Array.isArray(remote.clients) ? remote.clients : [],
      profile: remote.profile && typeof remote.profile === 'object'
        ? { works: Array.isArray(remote.profile.works) ? remote.profile.works : [], people: Array.isArray(remote.profile.people) && remote.profile.people.length ? remote.profile.people : DEFAULT_PEOPLE }
        : DEFAULT_PROFILE,
      refresh,
    };
  }, [remote, refresh]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useContent = () => useContext(Ctx);
