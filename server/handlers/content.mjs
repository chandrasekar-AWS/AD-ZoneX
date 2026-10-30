import { json, store, isAdmin, clip, sameOrigin, forbidden, audit } from '../lib/util.mjs';

const str = (v, n) => clip(v, n);
// Image fields may only point at our own uploads, our own static pictures, or an https:// address.
// (Blocks javascript:, data: and other odd links being saved by mistake or by a stolen session.)
const url = (v) => {
  const u = clip(v, 300).trim();
  if (/^\/api\/media\/[0-9a-f-]{36}$/.test(u)) return u;
  if (/^\/[A-Za-z0-9_\-./]+$/.test(u) && !u.includes('..') && !u.startsWith('//')) return u;
  if (/^https:\/\/[^\s<>"']+$/.test(u)) return u;
  return '';
};
const list = (v, max, len) => (Array.isArray(v) ? v : String(v || '').split(/[\n,]/))
  .map((x) => str(x, len)).filter(Boolean).slice(0, max);
const cleanGallery = (a) =>
  a.slice(0, 500).map((g) => ({
    id: str(g.id, 60), image: url(g.image), title: str(g.title, 120), category: str(g.category, 30),
    client: str(g.client, 120), description: str(g.description, 2000),
    services: list(g.services, 12, 80), tools: list(g.tools, 16, 80),
  })).filter((g) => g.image);
const cleanReviews = (a) =>
  a.slice(0, 100).map((r) => ({
    id: str(r.id, 60), quote: str(r.quote, 1200), name: str(r.name, 80), role: str(r.role, 80),
  })).filter((r) => r.quote);
const cleanClients = (a) =>
  a.slice(0, 400).map((c) => ({ id: str(c.id, 60), name: str(c.name, 100), image: url(c.image) })).filter((c) => c.image);
const cleanProfile = (p = {}) => ({
  people: (Array.isArray(p.people) ? p.people : []).slice(0, 12).map((o) => ({
    id: str(o.id, 60), section: str(o.section, 60), name: str(o.name, 100), role: str(o.role, 120), photo: url(o.photo),
    intro: str(o.intro, 120), about: str(o.about, 5000), expertiseTitle: str(o.expertiseTitle, 80),
    expertise: list(o.expertise, 12, 100),
  })).filter((o) => o.name),
  works: (Array.isArray(p.works) ? p.works : []).slice(0, 12)
    .map((w) => ({ title: str(w.title, 120), text: str(w.text, 700), image: url(w.image) })).filter((w) => w.title),
});
const cleanServices = (o) => {
  const out = {};
  for (const cat of ['design', 'print', 'signage', 'digital']) {
    if (!Array.isArray(o[cat])) continue;
    out[cat] = o[cat].slice(0, 60).map((s) => ({
      name: str(s.name, 120),
      description: str(s.description, 3000),
      images: Array.isArray(s.images) ? s.images.slice(0, 12).map((i) => url(i)).filter(Boolean) : [],
    })).filter((s) => s.name);
  }
  return out;
};

export default async (req) => {
  const s = store();
  if (req.method === 'GET') {
    const c = (await s.get('content', { type: 'json' })) || {};
    return json({ gallery: c.gallery ?? null, reviews: c.reviews ?? null, services: c.services ?? null, clients: c.clients ?? null, profile: c.profile ?? null });
  }
  if (req.method === 'PUT') {
    if (!isAdmin(req)) return json({ error: 'Not signed in.' }, 401);
    if (!sameOrigin(req)) return forbidden();
    let b;
    try { b = await req.json(); } catch { return json({ error: 'Bad request' }, 400); }
    const c = (await s.get('content', { type: 'json' })) || {};
    if (Array.isArray(b.gallery)) c.gallery = cleanGallery(b.gallery);
    if (Array.isArray(b.reviews)) c.reviews = cleanReviews(b.reviews);
    if (Array.isArray(b.clients)) c.clients = cleanClients(b.clients);
    if (b.profile && typeof b.profile === 'object') c.profile = cleanProfile(b.profile);
    if (b.services && typeof b.services === 'object') c.services = { ...(c.services || {}), ...cleanServices(b.services) };
    await s.setJSON('content', c);
    await audit(req, 'content.save', Object.keys(b).filter((k) => ['gallery', 'reviews', 'clients', 'profile', 'services'].includes(k)).join(','));
    return json({ ok: true });
  }
  return json({ error: 'Method not allowed' }, 405);
};
