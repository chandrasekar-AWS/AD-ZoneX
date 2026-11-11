// Route + link + button smoke test: renders every page of the site on the server (no browser needed) and checks that
//  - each page renders without crashing and has a heading,
//  - every internal link (<a href="/...">) leads to a real route (and every /services/<slug> to a real service),
//  - every <button> either has type="button"/"submit" or lives outside a <form> (so nothing submits by accident),
//  - every button and link has a readable name,
//  - no link opens a new tab without rel="noopener"/"noreferrer".
// Run with:  node tests/routes.smoke.mjs
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const server = await createServer({ configFile: false, plugins: [react()], server: { middlewareMode: true }, appType: 'custom', logLevel: 'error', optimizeDeps: { noDiscovery: true } });
const load = (p) => server.ssrLoadModule(p);
const warn = console.error; console.error = (m, ...a) => { if (!/useLayoutEffect/.test(String(m))) warn(m, ...a); }; // that warning is expected when rendering on a server
let failed = 0; const bad = (m) => { failed++; console.log('  ✗', m); };

try {
  const React = (await import('react')).default;           // same Node copies the app uses (vite leaves node_modules alone)
  const { renderToString } = await import('react-dom/server');
  const RR = await import('react-router-dom');
  const { ContentProvider, useContent } = await load('/src/context/ContentContext.jsx');
  const { SESSIONS, slugOf } = await load('/src/data/services.js');
  const h = React.createElement;

  const pages = {
    '/': '/src/pages/HomePage.jsx', '/about': '/src/pages/AboutPage.jsx', '/clients': '/src/pages/ClientsPage.jsx', '/careers': '/src/pages/CareersPage.jsx',
    '/profile': '/src/pages/ProfilePage.jsx', '/service': '/src/pages/ServicesHubPage.jsx', '/service/:category': '/src/pages/CategoryPage.jsx',
    '/services/:slug': '/src/pages/ServicePage.jsx', '/gallery': '/src/pages/GalleryPage.jsx',
    '/contact': '/src/pages/ContactPage.jsx', '/admin/login': '/src/admin/AdminLogin.jsx', '/admin': '/src/admin/AdminDashboard.jsx', '*': '/src/pages/NotFoundPage.jsx',
  };
  const comps = Object.fromEntries(await Promise.all(Object.entries(pages).map(async ([r, f]) => [r, (await load(f)).default])));
  const patterns = [...Object.keys(pages).filter((r) => r !== '*').map((r) => new RegExp('^' + r.replace(/:[^/]+/g, '[^/]+') + '/?$')),
    /^\/(design|print|signage|digital|projects|services)\/?$/]; // these redirect inside the app
  const slugs = SESSIONS.flatMap((s) => s.services.map((x) => x.name));

  const urls = ['/', '/about', '/clients', '/careers', '/profile', '/service', '/gallery', '/contact', '/no-such-page', // (the admin pages are browser-only and are not rendered here)
    ...SESSIONS.map((s) => `/service/${s.id}`)];
  
  slugs.forEach((n) => urls.push(`/services/${slugOf(n)}`));
  const digital = SESSIONS.find((c) => c.id === 'digital').services.map((x) => slugOf(x.name));
  digital.forEach((sl) => urls.push(`/contact?service=${sl}`));
  urls.push('/contact?service=logo-design', '/contact?service=digital');

  const seenLinks = new Map(); const seenFull = new Map();
  for (const url of urls) {
    const html = renderToString(h(RR.StaticRouter, { location: url },
      h(ContentProvider, null, h(RR.Routes, null, ...Object.entries(comps).map(([r, C]) => h(RR.Route, { key: r, path: r, element: h(C) }))))));
    const problems = [];
    if (!/<h1[ >]/.test(html) && !url.startsWith('/admin')) problems.push('no <h1>');
    // "Enquire about this" on a digital service → Contact page with the long details (offers, why, steps, questions) before the form
    const cm = /^\/contact\?service=(.+)$/.exec(url);
    if (cm) {
      const want = digital.includes(cm[1]);
      const has = /class="sd"/.test(html);
      if (want && !has) problems.push('digital service shows no detailed content on the Contact page');
      if (!want && has) problems.push('detailed content should only appear for digital services');
      if (want) {
        const n = (re) => (html.match(re) || []).length;
        if (n(/class="sd-offer reveal"/g) < 4 || n(/<ul class="sd-why">/g) !== 1 || n(/<ul class="sd-steps">/g) !== 1 || n(/<details\b/g) < 4) problems.push('detailed content is incomplete (need 4+ offers, why, steps, 4+ questions)');
        if (html.indexOf('class="sd"') > html.indexOf('id="contact-form-anchor"')) problems.push('details must come BEFORE the form');
        if (html.indexOf('class="contact-intro') > html.indexOf('class="sd"')) problems.push('pictures/video intro must come first');
      }
    }
    // links
    for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)) {
      const attrs = m[1]; const href = /href="([^"]*)"/.exec(attrs)?.[1];
      const name = (/aria-label="([^"]+)"/.exec(attrs)?.[1] || m[2].replace(/<[^>]+>/g, '').trim() || /title="([^"]+)"/.exec(attrs)?.[1]);
      if (!href) { problems.push(`link without href (${name})`); continue; }
      if (!name) problems.push(`link ${href} has no readable name`);
      if (/target="_blank"/.test(attrs) && !/rel="[^"]*(noopener|noreferrer)/.test(attrs)) problems.push(`${href} opens a new tab without rel`);
      if (href.startsWith('/')) { const path = href.split(/[?#]/)[0]; if (!seenLinks.has(path)) seenLinks.set(path, url); const dec = href.replace(/&amp;/g, '&'); if (!seenFull.has(dec)) seenFull.set(dec, url); }
    }
    // buttons
    const forms = [...html.matchAll(/<form\b[\s\S]*?<\/form>/g)].map((f) => f[0]);
    for (const f of forms) for (const b of f.matchAll(/<button\b([^>]*)>/g)) if (!/type="/.test(b[1])) problems.push('button inside a <form> without type (would submit the form)');
    for (const b of html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)) {
      const name = /aria-label="([^"]+)"/.exec(b[1])?.[1] || b[2].replace(/<[^>]+>/g, '').trim() || /title="([^"]+)"/.exec(b[1])?.[1];
      if (!name) problems.push('a button has no readable name');
    }
    console.log(problems.length ? '✗' : '✓', url, problems.length ? '' : `(${(html.match(/<a\b/g) || []).length} links, ${(html.match(/<button\b/g) || []).length} buttons)`);
    problems.forEach((p) => bad(`${url}: ${p}`));
  }

  // Digital services added in Admin (like "Billing & Invoice App") must get the details too, never an empty page
  const { detailsFor } = await load('/src/data/serviceDetails.js');
  const mk = (slug, category, items = []) => ({ slug, title: slug, category, items });
  const b = detailsFor(mk('billing-invoice-app', 'digital'));
  if (!b || b.offers.length < 4 || b.faq.length < 4) bad('Billing & Invoice App has no detailed content');
  const g = detailsFor(mk('some-new-digital-service', 'digital', ['One', 'Two']));
  if (!g || g.offers.length !== 2 || g.faq.length < 3 || g.steps.length !== 4 || g.why.length !== 3) bad('a new digital service added in Admin gets no default details');
  if (detailsFor(mk('logo-design', 'design')) !== undefined) bad('non-digital services must not get the details');
  console.log('\nChecking that every internal link leads somewhere real…');
  for (const c of SESSIONS) if (!seenLinks.has(`/service/${c.id}`)) bad(`nothing links to the ${c.label} page /service/${c.id}`);
  const { findService } = await load('/src/data/services.js');
  const catIds = new Set(SESSIONS.map((c) => c.id));
  const bySlug = new Set(SESSIONS.flatMap((c) => c.services.map((x) => slugOf(x.name))));
  for (const [full, from] of seenFull) {   // query strings and #hashes must point at something real too
    const u = new URL(full, 'https://x.test');
    if (u.pathname === '/contact' && u.searchParams.get('service')) {
      const v = u.searchParams.get('service'); if (!bySlug.has(v) && !catIds.has(v)) bad(`link ${full} (on ${from}): contact form does not know "${v}"`);
    }
    if (u.pathname === '/gallery' && u.searchParams.get('category') && !catIds.has(u.searchParams.get('category'))) bad(`link ${full} (on ${from}): unknown gallery category`);
    if (u.pathname === '/service' && u.hash && !catIds.has(u.hash.slice(1))) bad(`link ${full} (on ${from}): unknown #section`);
  }
  for (const [path, from] of seenLinks) {
    const ok = patterns.some((re) => re.test(path)) || /^\/(logo|team|design|print|signage|digital|video|partners)\//.test(path);
    if (!ok) bad(`link ${path} (found on ${from}) matches no route`);
    const sm = /^\/services\/([^/]+)$/.exec(path);
    if (sm && !findService(SESSIONS, sm[1])) bad(`link ${path} (on ${from}) points to a service that does not exist`);
    const cm = /^\/service\/([^/]+)$/.exec(path);
    if (cm && !SESSIONS.some((s) => s.id === cm[1])) bad(`link ${path} (on ${from}) points to a category that does not exist`);
  }
  console.log(`  ${seenLinks.size} distinct internal links checked`);
} catch (e) { bad('crashed: ' + (e.stack || e)); }
await server.close();
console.log(failed ? `\n${failed} problem(s) found` : '\nAll pages, links and buttons OK');
process.exit(failed ? 1 : 0);
