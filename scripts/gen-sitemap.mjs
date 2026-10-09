// Builds img/sitemap.xml (served at /sitemap.xml) from the real pages and services.
// Runs automatically before every build (see "prebuild" in package.json), so it never goes out of date.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { SESSIONS, slugOf } from '../src/data/services.js';

const SITE = process.env.SITE_URL || 'https://www.adzonex.in';
const today = new Date().toISOString().slice(0, 10);

const pages = [
  ['/', 1.0, 'weekly'],
  ['/service', 0.9, 'weekly'],
  ...SESSIONS.map((s) => [`/service/${s.id}`, 0.8, 'monthly']),
  ...SESSIONS.flatMap((s) => s.services.map((sv) => [`/services/${slugOf(sv.name)}`, 0.7, 'monthly'])),
  ['/gallery', 0.8, 'weekly'],
  ['/about', 0.6, 'monthly'],
  ['/clients', 0.5, 'monthly'],
  ['/careers', 0.4, 'monthly'],
  ['/contact', 0.8, 'monthly'],
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(([path, priority, freq]) => `  <url>
    <loc>${SITE}${path === '/' ? '/' : path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${freq}</changefreq>
    <priority>${priority.toFixed(1)}</priority>
  </url>`).join('\n')}
</urlset>
`;

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
writeFileSync(join(root, 'img', 'sitemap.xml'), xml);
writeFileSync(join(root, 'img', 'robots.txt'), `User-agent: *\nDisallow: /admin\nDisallow: /api/\n\nSitemap: ${SITE}/sitemap.xml\n`);
console.log(`sitemap.xml: ${pages.length} pages for ${SITE}`);
