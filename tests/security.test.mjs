// Run with:  npm test      (no browser, no Supabase, no internet needed)
// Calls every API handler directly with fake requests and checks that the security rules hold.
import test, { before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'adzone-test-'));
process.chdir(tmp);                       // .local-data is created here, not in your project
process.env.ADZONE_LOCAL = '1';
process.env.ADMIN_USERNAME = 'test_admin';
process.env.ADMIN_PASSWORD = 'Correct-Horse-Battery-9!';
process.env.ADMIN_SECRET = 'a'.repeat(40);
process.env.ADMIN_KEY_SECRET = 'b'.repeat(40);
process.env.CRON_SECRET = 'cron-secret-for-tests-123';
delete process.env.SMTP_USER; delete process.env.SMTP_PASS; delete process.env.TURNSTILE_SECRET;

const root = new URL('../server/', import.meta.url);
const load = async (n) => (await import(new URL(`handlers/${n}.mjs`, root))).default;
const util = await import(new URL('lib/util.mjs', root));
const { makeKeyFile } = await import(new URL('lib/keyfile.mjs', root));
const H = {};
for (const n of ['login', 'content', 'media', 'enquiries', 'contact', 'careers', 'applications', 'backups', 'backups-scheduled', 'audit']) H[n] = await load(n);

const BASE = 'https://www.adzonex.in';
let ipN = 10;
const newIp = () => `203.0.113.${ipN++}`;
const req = (p, { method = 'GET', body, headers = {}, ip, raw } = {}) =>
  new Request(BASE + p, {
    method,
    headers: { 'x-real-ip': ip || newIp(), host: 'www.adzonex.in', ...(body !== undefined && !raw ? { 'content-type': 'application/json' } : {}), ...headers },
    body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined),
  });
const call = async (name, r) => { const res = await H[name](r); const t = await res.text(); let j = null; try { j = JSON.parse(t); } catch {} return { status: res.status, json: j, text: t, headers: res.headers }; };

let ADMIN = '';
const keyFile = makeKeyFile().text;
async function login(ip = newIp()) {
  let r = await call('login', req('/api/login', { method: 'POST', ip, body: { action: 'checkId', id: 'test_admin' } }));
  r = await call('login', req('/api/login', { method: 'POST', ip, body: { action: 'checkPassword', ticket: r.json.ticket, password: process.env.ADMIN_PASSWORD } }));
  r = await call('login', req('/api/login', { method: 'POST', ip, body: { action: 'key', ticket: r.json.ticket, keyFile } }));
  r = await call('login', req('/api/login', { method: 'POST', ip, body: { action: 'login', ticket: r.json.ticket } }));
  return r.json.token;
}
const auth = (extra = {}) => ({ authorization: `Bearer ${ADMIN}`, ...extra });
before(async () => { ADMIN = await login(); });

// ───────── 1. Every protected route needs a valid admin token ─────────
test('every admin-only route rejects requests with no token or a bad token', async () => {
  const routes = [
    ['content', 'PUT', '/api/content', { gallery: [] }], ['media', 'POST', '/api/media', undefined], ['media', 'DELETE', '/api/media/' + '0'.repeat(8) + '-0000-0000-0000-' + '0'.repeat(12)],
    ['enquiries', 'GET', '/api/enquiries'], ['enquiries', 'DELETE', '/api/enquiries?key=enquiries/x'],
    ['applications', 'GET', '/api/applications'], ['applications', 'GET', '/api/applications?file=' + '0'.repeat(8) + '-0000-0000-0000-' + '0'.repeat(12)], ['applications', 'DELETE', '/api/applications?key=applications/x'],
    ['backups', 'GET', '/api/backups'], ['backups', 'POST', '/api/backups'], ['backups', 'PUT', '/api/backups?key=backups/x'],
    ['audit', 'GET', '/api/audit'],
  ];
  for (const [n, m, p, b] of routes) {
    for (const h of [{}, { authorization: 'Bearer nonsense' }, { authorization: 'Bearer a.b' }, { authorization: 'Bearer ' }]) {
      const r = await call(n, req(p, { method: m, body: b, headers: { 'content-type': 'image/png', ...h } }));
      assert.equal(r.status, 401, `${m} ${p} with ${JSON.stringify(h)} -> ${r.status}`);
    }
  }
});

test('tokens: forged, tampered, expired and wrong-type tokens are refused', async () => {
  const [p, s] = ADMIN.split('.');
  const payload = JSON.parse(Buffer.from(p, 'base64url'));
  const forge = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
  const bad = [
    `${forge({ ...payload, exp: Date.now() + 1e9 })}.${s}`,                 // edited payload, old signature
    `${p}.${s.slice(0, -2)}AA`,                                              // damaged signature
    util.sign({ t: 'admin', exp: Date.now() - 1000 }),                      // expired
    util.sign({ t: 'keyok', exp: Date.now() + 1e6 }),                       // a login-step ticket is not a session
    util.sign({ t: 'idok', exp: Date.now() + 1e6 }),
  ];
  for (const t of bad) assert.equal((await call('enquiries', req('/api/enquiries', { headers: { authorization: 'Bearer ' + t } }))).status, 401);
  assert.equal((await call('enquiries', req('/api/enquiries', { headers: auth() }))).status, 200);
});

test('the OLD hard-coded passwords/secrets no longer work', async () => {
  // Attacker who read the old public repo forges a session with the old secrets:
  const crypto = await import('node:crypto');
  const old = `k9f3Qw-Zr72Lp-Xc81Vb-Nm45Ty-adzone-2026|AdZone@2026#Secure|Hq7-mV2xT9-Lp4Zr8-Wc3Nb6-Ya5Fd1-adzone-keyfile-2026`;
  const p = Buffer.from(JSON.stringify({ t: 'admin', exp: Date.now() + 1e7 })).toString('base64url');
  const tok = `${p}.${crypto.createHmac('sha256', old).update(p).digest('base64url')}`;
  assert.equal((await call('enquiries', req('/api/enquiries', { headers: { authorization: 'Bearer ' + tok } }))).status, 401);
  const ip = newIp();
  const r = await call('login', req('/api/login', { method: 'POST', ip, body: { action: 'checkId', id: 'adzone_admin' } }));
  assert.equal(r.status, 401);
});

test('source code contains no built-in admin credentials', () => {
  const all = ['lib/admin-config.mjs', 'lib/util.mjs', 'lib/keyfile.mjs'].map((f) => fs.readFileSync(new URL(f, root), 'utf8')).join('\n');
  for (const secret of ['AdZone@2026#Secure', 'Hq7-mV2xT9', 'k9f3Qw-Zr72']) assert.ok(!all.includes(secret), `found ${secret}`);
});

test('admin stays CLOSED in production when secrets are missing', async () => {
  const keep = { ...process.env };
  process.env.ADZONE_LOCAL = '0';
  for (const k of ['ADMIN_USERNAME', 'ADMIN_PASSWORD', 'ADMIN_SECRET', 'ADMIN_KEY_SECRET']) delete process.env[k];
  try {
    assert.equal(util.adminReady(), false);
    assert.equal((await call('login', req('/api/login', { method: 'POST', body: { action: 'checkId', id: 'dev_admin' } }))).status, 503);
    assert.equal((await call('enquiries', req('/api/enquiries', { headers: auth() }))).status, 401); // even a token signed earlier is useless
    process.env.ADMIN_USERNAME = 'adzone_admin'; process.env.ADMIN_PASSWORD = 'AdZone@2026#Secure'; process.env.ADMIN_SECRET = 'x'.repeat(30); process.env.ADMIN_KEY_SECRET = 'y'.repeat(30);
    assert.equal(util.adminReady(), false, 'the old example password must be refused');
  } finally { Object.assign(process.env, keep); }
  assert.equal(util.adminReady(), true);
});

// ───────── 2. Brute force / rate limits ─────────
test('login: 5 wrong guesses lock the IP out (429), even for the right answer', async () => {
  const ip = newIp();
  for (let i = 0; i < 5; i++) assert.equal((await call('login', req('/api/login', { method: 'POST', ip, body: { action: 'checkId', id: 'wrong' + i } }))).status, 401);
  const r = await call('login', req('/api/login', { method: 'POST', ip, body: { action: 'checkId', id: 'test_admin' } }));
  assert.equal(r.status, 429);
});

test('login steps cannot be skipped or replayed out of order', async () => {
  const ip = newIp();
  const t = util.sign({ t: 'idok', exp: Date.now() + 1e5 });
  assert.equal((await call('login', req('/api/login', { method: 'POST', ip, body: { action: 'key', ticket: t, keyFile } }))).status, 401);
  assert.equal((await call('login', req('/api/login', { method: 'POST', ip, body: { action: 'login', ticket: t } }))).status, 401);
  assert.equal((await call('login', req('/api/login', { method: 'POST', ip, body: { action: 'login' } }))).status, 401);
});

test('a key file made with a different secret is rejected', async () => {
  const ip = newIp();
  let r = await call('login', req('/api/login', { method: 'POST', ip, body: { action: 'checkId', id: 'test_admin' } }));
  r = await call('login', req('/api/login', { method: 'POST', ip, body: { action: 'checkPassword', ticket: r.json.ticket, password: process.env.ADMIN_PASSWORD } }));
  const r2 = await call('login', req('/api/login', { method: 'POST', ip, body: { action: 'key', ticket: r.json.ticket, keyFile: 'garbage' } }));
  assert.equal(r2.status, 401);
});

test('contact form: rate limited per IP (6th message in 10 minutes -> 429)', async () => {
  const ip = newIp();
  const body = { name: 'Test', email: 'a@b.co', message: 'hi' };
  const codes = [];
  for (let i = 0; i < 7; i++) codes.push((await call('contact', req('/api/contact', { method: 'POST', ip, body }))).status);
  assert.deepEqual(codes, [200, 200, 200, 200, 200, 429, 429]);
  assert.equal((await call('contact', req('/api/contact', { method: 'POST', ip: newIp(), body }))).status, 200, 'another visitor is not affected');
});

test('careers form: rate limited (4th application in an hour -> 429)', async () => {
  const ip = newIp();
  const pdf = Buffer.from('%PDF-1.4 test').toString('base64');
  const body = { name: 'T', email: 'a@b.co', fileName: 'cv.pdf', fileData: pdf };
  const codes = [];
  for (let i = 0; i < 4; i++) codes.push((await call('careers', req('/api/careers', { method: 'POST', ip, body }))).status);
  assert.deepEqual(codes, [200, 200, 200, 429]);
});

// ───────── 3. Input checks / sanitising ─────────
test('contact: bad e-mail addresses and header-injection attempts are refused', async () => {
  const bad = ['no-at-sign', 'a@b', 'a b@c.com', 'a@b.com,evil@x.com', '"x"@b.com', 'a@b.com\r\nBcc: evil@x.com', '<script>@b.com', 'a@b.com>'];
  for (const email of bad) assert.equal((await call('contact', req('/api/contact', { method: 'POST', body: { name: 'T', email } }))).status, 400, email);
});

test('contact: HTML is stored as plain text and control characters are stripped', async () => {
  const ip = newIp();
  const r = await call('contact', req('/api/contact', { method: 'POST', ip, body: { name: 'Bob\r\nBcc: x@y.z', email: 'a@b.co', message: '<img src=x onerror=alert(1)>\u0000', phone: '1'.repeat(500) } }));
  assert.equal(r.status, 200);
  const list = await call('enquiries', req('/api/enquiries', { headers: auth() }));
  const rec = list.json.items.find((i) => i.message.includes('onerror'));
  assert.ok(rec); assert.ok(!rec.name.includes('\n')); assert.ok(!rec.message.includes('\u0000')); assert.ok(rec.phone.length <= 40);
});

test('contact: honeypot, wrong method, invalid JSON, oversize body', async () => {
  assert.equal((await call('contact', req('/api/contact', { method: 'POST', body: { name: 'Bot', email: 'a@b.co', website: 'http://spam' } }))).json.ok, true); // silently dropped
  assert.equal((await call('contact', req('/api/contact', { method: 'GET' }))).status, 405);
  assert.equal((await call('contact', req('/api/contact', { method: 'POST', raw: '{not json' }))).status, 400);
  assert.equal((await call('contact', req('/api/contact', { method: 'POST', body: { name: 'x', email: 'a@b.co' }, headers: { 'content-length': String(200 * 1024) } }))).status, 413);
});

test('content: image links are restricted; scripts/data URLs are removed; text is length-limited', async () => {
  const gallery = [
    { id: '1', image: '/api/media/' + '1'.repeat(8) + '-1111-1111-1111-' + '1'.repeat(12), title: 'ok' },
    { id: '2', image: 'javascript:alert(1)', title: 'bad' },
    { id: '3', image: 'data:text/html;base64,AAAA', title: 'bad' },
    { id: '4', image: '//evil.com/x.png', title: 'bad' },
    { id: '5', image: '/design/../../etc/passwd', title: 'bad' },
    { id: '6', image: 'http://insecure.example/x.png', title: 'bad' },
    { id: '7', image: 'https://good.example/x.png', title: 'T'.repeat(500) },
    { id: '8', image: '/design/logo-design.jpeg', title: 'static ok' },
  ];
  assert.equal((await call('content', req('/api/content', { method: 'PUT', headers: auth(), body: { gallery } }))).status, 200);
  const g = (await call('content', req('/api/content'))).json.gallery;
  assert.deepEqual(g.map((x) => x.id), ['1', '7', '8']);
  assert.equal(g[1].title.length, 120);
});

test('content: public GET needs no login, but never returns admin-only data', async () => {
  const r = await call('content', req('/api/content'));
  assert.equal(r.status, 200);
  assert.deepEqual(Object.keys(r.json).sort(), ['clients', 'gallery', 'profile', 'reviews', 'services']);
});

// ───────── 4. File uploads ─────────
const png = Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), Buffer.alloc(64)]);
test('media upload: only real images; wrong types, fake images, SVG and oversize files are refused', async () => {
  const up = (type, body) => call('media', req('/api/media', { method: 'POST', headers: auth({ 'content-type': type }), raw: body }));
  assert.equal((await up('image/png', png)).status, 200);
  assert.equal((await up('image/svg+xml', Buffer.from('<svg onload=alert(1)>'))).status, 400);
  assert.equal((await up('text/html', Buffer.from('<script>'))).status, 400);
  assert.equal((await up('application/x-msdownload', Buffer.from('MZ'))).status, 400);
  assert.equal((await up('image/png', Buffer.from('<script>alert(1)</script>'))).status, 400, 'HTML pretending to be PNG');
  assert.equal((await up('image/jpeg', png)).status, 400, 'PNG pretending to be JPEG');
  assert.equal((await up('image/png', Buffer.alloc(0))).status, 400);
  assert.equal((await up('image/png', Buffer.concat([png, Buffer.alloc(5 * 1024 * 1024)]))).status, 400);
});

test('media serving: safe headers; bad ids and path tricks give 404', async () => {
  const up = await call('media', req('/api/media', { method: 'POST', headers: auth({ 'content-type': 'image/png' }), raw: png }));
  const r = await H.media(req(up.json.url));
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('x-content-type-options'), 'nosniff');
  assert.match(r.headers.get('content-security-policy'), /sandbox/);
  for (const bad of ['/api/media/..%2f..%2fetc%2fpasswd', '/api/media/abc', '/api/media/' + 'g'.repeat(36), '/api/media/' + '0'.repeat(36)]) assert.equal((await H.media(req(bad))).status, 404, bad);
});

test('careers upload: only documents whose content matches their extension', async () => {
  const send = (fileName, buf) => call('careers', req('/api/careers', { method: 'POST', body: { name: 'T', email: 'a@b.co', fileName, fileData: buf.toString('base64') } }));
  assert.equal((await send('cv.exe', Buffer.from('MZ\x90'))).status, 400);
  assert.equal((await send('cv.pdf', Buffer.from('MZ\x90not a pdf'))).status, 400, 'exe renamed to pdf');
  assert.equal((await send('cv.html', Buffer.from('<script>'))).status, 400);
  assert.equal((await send('cv.svg', Buffer.from('<svg/>'))).status, 400);
  assert.equal((await send('../../etc/passwd', Buffer.from('%PDF'))).status, 400);
  assert.equal((await send('cv.pdf', Buffer.from('%PDF-1.7 hello'))).status, 200);
  assert.equal((await send('big.pdf', Buffer.concat([Buffer.from('%PDF'), Buffer.alloc(3.3 * 1024 * 1024)]))).status, 400);
});

test('careers: stored CV is only reachable by an admin, and is served as a download', async () => {
  const list = await call('applications', req('/api/applications', { headers: auth() }));
  const rec = list.json.items.find((i) => i.fileName === 'cv.pdf');
  assert.ok(rec);
  const id = rec.fileKey.split('/').pop();
  assert.equal((await call('applications', req(`/api/applications?file=${id}`))).status, 401);
  const dl = await H.applications(req(`/api/applications?file=${id}`, { headers: auth() }));
  assert.equal(dl.status, 200); assert.match(dl.headers.get('content-disposition'), /^attachment/); assert.equal(dl.headers.get('x-content-type-options'), 'nosniff');
});

// ───────── 5. IDOR / key tricks ─────────
test('deleting is limited to its own folder (no deleting content, backups or logs via other routes)', async () => {
  const s = util.store();
  await s.setJSON('content', { gallery: [], marker: 1 });
  for (const key of ['content', 'backups/x', 'audit/x', 'enquiries/../content', 'enquiries/a/b', 'applications/../content']) {
    await call('enquiries', req('/api/enquiries?key=' + encodeURIComponent(key), { method: 'DELETE', headers: auth() }));
    await call('applications', req('/api/applications?key=' + encodeURIComponent(key), { method: 'DELETE', headers: auth() }));
  }
  assert.ok(await s.get('content', { type: 'json' }), 'content must still exist');
});

test('backups: restore only accepts backup keys', async () => {
  assert.equal((await call('backups', req('/api/backups?key=content', { method: 'PUT', headers: auth() }))).status, 400);
  assert.equal((await call('backups', req('/api/backups?key=audit/x', { method: 'PUT', headers: auth() }))).status, 400);
});

// ───────── 6. CORS / cross-site requests ─────────
test('requests from another website are refused; our own site is allowed; no CORS headers are ever sent', async () => {
  const evil = { origin: 'https://evil.example' };
  assert.equal((await call('contact', req('/api/contact', { method: 'POST', headers: evil, body: { name: 'T', email: 'a@b.co' } }))).status, 403);
  assert.equal((await call('careers', req('/api/careers', { method: 'POST', headers: evil, body: {} }))).status, 403);
  assert.equal((await call('login', req('/api/login', { method: 'POST', headers: evil, body: { action: 'checkId', id: 'x' } }))).status, 403);
  assert.equal((await call('content', req('/api/content', { method: 'PUT', headers: auth(evil), body: { gallery: [] } }))).status, 403);
  assert.equal((await call('media', req('/api/media', { method: 'POST', headers: auth({ ...evil, 'content-type': 'image/png' }), raw: png }))).status, 403);
  assert.equal((await call('enquiries', req('/api/enquiries?key=enquiries/x', { method: 'DELETE', headers: auth(evil) }))).status, 403);
  assert.equal((await call('backups', req('/api/backups', { method: 'POST', headers: auth(evil) }))).status, 403);
  const ok = await call('contact', req('/api/contact', { method: 'POST', headers: { origin: 'https://www.adzonex.in' }, body: { name: 'T', email: 'a@b.co' } }));
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get('access-control-allow-origin'), null);
  assert.equal((await call('contact', req('/api/contact', { method: 'POST', headers: { origin: 'https://www.adzonex.in.evil.com' }, body: { name: 'T', email: 'a@b.co' } }))).status, 403, 'look-alike domain');
  assert.equal((await call('contact', req('/api/contact', { method: 'POST', headers: { origin: 'null' }, body: { name: 'T', email: 'a@b.co' } }))).status, 403);
});

// ───────── 7. Scheduled job ─────────
test('daily backup URL: needs the CRON_SECRET; closed when none is configured', async () => {
  assert.equal((await call('backups-scheduled', req('/api/backups-scheduled'))).status, 401);
  assert.equal((await call('backups-scheduled', req('/api/backups-scheduled', { headers: { authorization: 'Bearer wrong' } }))).status, 401);
  assert.equal((await call('backups-scheduled', req('/api/backups-scheduled', { headers: { authorization: 'Bearer ' + process.env.CRON_SECRET } }))).status, 200);
  const keep = process.env.CRON_SECRET; delete process.env.CRON_SECRET; process.env.ADZONE_LOCAL = '0';
  assert.equal((await call('backups-scheduled', req('/api/backups-scheduled'))).status, 401, 'production without CRON_SECRET must refuse');
  process.env.CRON_SECRET = keep; process.env.ADZONE_LOCAL = '1';
});

// ───────── 8. Audit log ─────────
test('admin actions are written to the audit log', async () => {
  await call('backups', req('/api/backups', { method: 'POST', headers: auth() }));
  await call('content', req('/api/content', { method: 'PUT', headers: auth(), body: { reviews: [] } }));
  const r = await call('audit', req('/api/audit', { headers: auth() }));
  assert.equal(r.status, 200);
  const acts = r.json.items.map((i) => i.action);
  for (const a of ['login.success', 'login.failed', 'media.upload', 'content.save', 'backup.create']) assert.ok(acts.includes(a), 'missing ' + a);
  assert.ok(r.json.items.every((i) => i.at && i.ip));
  assert.ok(!JSON.stringify(r.json).includes(process.env.ADMIN_PASSWORD), 'password must never be logged');
});

// ───────── 9. CAPTCHA (server side) ─────────
test('CAPTCHA: when TURNSTILE_SECRET is set, forms without a valid token are refused', async () => {
  process.env.TURNSTILE_SECRET = 'secret';
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (u, init) => ({ json: async () => ({ success: String(init.body).includes('response=good-token') }) });
  try {
    const mk = (captchaToken) => call('contact', req('/api/contact', { method: 'POST', body: { name: 'T', email: 'a@b.co', captchaToken } }));
    assert.equal((await mk(undefined)).status, 400);
    assert.equal((await mk('bad-token')).status, 400);
    assert.equal((await mk('good-token')).status, 200);
  } finally { globalThis.fetch = realFetch; delete process.env.TURNSTILE_SECRET; }
});

// ───────── 10. Config files (headers, HTTPS, database lock-down, debug) ─────────
const proj = new URL('../', import.meta.url);
const vercel = JSON.parse(fs.readFileSync(new URL('vercel.json', proj), 'utf8'));
const hdr = Object.fromEntries(vercel.headers.find((h) => h.source === '/(.*)').headers.map((h) => [h.key.toLowerCase(), h.value]));
test('security headers are set on every page', () => {
  assert.match(hdr['strict-transport-security'], /max-age=63072000.*includeSubDomains/);
  assert.equal(hdr['x-content-type-options'], 'nosniff');
  assert.equal(hdr['x-frame-options'], 'DENY');
  assert.equal(hdr['cross-origin-opener-policy'], 'same-origin');
  assert.equal(hdr['cross-origin-resource-policy'], 'same-origin');
  assert.match(hdr['referrer-policy'], /strict-origin/);
  assert.match(hdr['permissions-policy'], /camera=\(\)/);
  const csp = hdr['content-security-policy'];
  for (const d of ["default-src 'self'", "script-src 'self'", "object-src 'none'", "base-uri 'none'", "frame-ancestors 'none'", 'upgrade-insecure-requests', "require-trusted-types-for 'script'"]) assert.ok(csp.includes(d), d);
  assert.ok(!/script-src[^;]*'unsafe-(inline|eval)'/.test(csp), 'no unsafe scripts');
  assert.ok(!/\*\s*[;]|\bhttp:/.test(csp.replace(/https:\/\/\*\./g, '')), 'no wildcard / http sources');
});
test('admin and API responses are never cached or indexed', () => {
  const find = (s) => vercel.headers.filter((h) => h.source.startsWith(s)).flatMap((h) => h.headers).map((h) => h.key.toLowerCase());
  assert.ok(find('/admin').includes('x-robots-tag'));
  // API answers set 'cache-control: no-store' themselves (see the next section's test), so no blanket /api rule is needed.
});
test('database: row-level security on, no public access, private bucket', () => {
  const sql = fs.readFileSync(new URL('supabase/setup.sql', proj), 'utf8');
  assert.match(sql, /enable row level security/i); assert.match(sql, /force row level security/i);
  assert.match(sql, /revoke all on public\.kv_store from anon, authenticated/i);
  assert.match(sql, /'media', 'media', false/); assert.match(sql, /public = false/);
  assert.ok(!/create policy/i.test(sql), 'no policy may open the table to anon');
});
test('no secrets are committed; .env and key files are git-ignored', () => {
  const gi = fs.readFileSync(new URL('.gitignore', proj), 'utf8');
  for (const x of ['.env', 'generated-keys', '.local-data', 'node_modules']) assert.ok(gi.includes(x), x);
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.name === 'node_modules' || e.name === 'dist' || e.name === 'tests' || e.name === '.git' ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
  const files = walk(new URL('.', proj).pathname.replace(/^\/([A-Za-z]:)/, '$1')).filter((f) => /\.(m?js|jsx|json|md|sql|html|example)$/.test(f) && !f.endsWith('package-lock.json'));
  const patterns = [/AdZone@2026#Secure/, /Hq7-mV2xT9/, /k9f3Qw-Zr72/, /eyJhbGciOi[A-Za-z0-9_-]{30,}/, /sb_secret_[A-Za-z0-9_-]{10,}/, /-----BEGIN (RSA |EC )?PRIVATE KEY-----/, /[a-z]{16}\s*$/m.source && /SMTP_PASS=\S{8,}/];
  for (const f of files) { const t = fs.readFileSync(f, 'utf8'); for (const p of patterns) assert.ok(!p.test(t), `${path.basename(f)} matches ${p}`); }
});
test('no webhook endpoints exist (nothing to sign) and every api file maps to a guarded handler', () => {
  const api = fs.readdirSync(new URL('api/', proj)).filter((f) => f.endsWith('.js'));
  assert.ok(!api.some((f) => /webhook/i.test(f)));
  for (const f of api) assert.match(fs.readFileSync(new URL('api/' + f, proj), 'utf8'), /server\/handlers\//);
});
test('server code has no SQL strings, eval, or debug output of secrets', () => {
  const dir = new URL('server/', proj);
  const files = [...fs.readdirSync(new URL('handlers/', dir)).map((f) => 'handlers/' + f), ...fs.readdirSync(new URL('lib/', dir)).map((f) => 'lib/' + f)];
  for (const f of files) {
    const t = fs.readFileSync(new URL(f, dir), 'utf8');
    assert.ok(!/\beval\(|new Function\(|child_process|\.rpc\(|\.query\(`|SELECT .* FROM .*\$\{/i.test(t), f);
    assert.ok(!/console\.(log|error|warn)\([^)]*(process\.env\.|\$\{[^}]*(pass|secret|token|service_role)|SMTP_PASS(?! not))/i.test(t), f + ' logs a secret');
  }
});

// ───────── 11. Latest changes: PNG-only client logos, 60-minute session clock, e-mail, links, service pictures ─────────
const rgba = Buffer.concat([Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex'), Buffer.from('0000000a0000000a0806000000', 'hex'), Buffer.alloc(40)]); // colour type 6 = has transparency
const rgb = Buffer.concat([Buffer.from('89504e470d0a1a0a0000000d49484452', 'hex'), Buffer.from('0000000a0000000a0802000000', 'hex'), Buffer.alloc(40)]);  // colour type 2 = no transparency
test('client logos: only PNG files with a transparent background are accepted', async () => {
  const up = (type, body, kind = 'logo') => call('media', req('/api/media', { method: 'POST', headers: auth({ 'content-type': type, 'x-media-kind': kind }), raw: body }));
  assert.equal((await up('image/png', rgba)).status, 200);
  assert.equal((await up('image/png', rgb)).status, 400, 'PNG without transparency');
  assert.equal((await up('image/jpeg', Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]))).status, 400, 'JPG as a logo');
  assert.equal((await up('image/webp', Buffer.from('RIFF0000WEBP'))).status, 400, 'WebP as a logo');
  assert.equal((await up('image/gif', Buffer.from('GIF89a'))).status, 400, 'GIF as a logo');
  assert.equal((await up('image/png', rgb, 'photo')).status, 200, 'normal photos (gallery) are unchanged');
});
test('admin countdown: the server reports its own clock and a 60-minute maximum', async () => {
  const r = await call('login', req('/api/login', { headers: auth() }));
  assert.equal(r.status, 200);
  assert.equal(r.json.maxMs, 60 * 60 * 1000);
  assert.ok(Math.abs(r.json.now - Date.now()) < 5000);
  const left = r.json.exp - r.json.now;
  assert.ok(left > 58 * 60000 && left <= 60 * 60000, `session length ${left / 60000} min`);
});
const src = (f) => fs.readFileSync(new URL(f, proj), 'utf8');
test('enquiry e-mail address is enquiry@adzonex.in everywhere (old address gone)', () => {
  for (const f of ['server/handlers/contact.mjs', 'server/handlers/careers.mjs', 'src/data/services.js', 'index.html', 'SETUP.md']) {
    assert.ok(!/adzonecbe/i.test(src(f)), f + ' still has the old address');
  }
  assert.match(src('server/handlers/contact.mjs'), /OTHER_MAIL = 'enquiry@adzonex\.in'/);
  assert.match(src('server/handlers/careers.mjs'), /CAREERS_MAIL = 'enquiry@adzonex\.in'/);
  assert.match(src('src/data/services.js'), /other: 'enquiry@adzonex\.in'/);
});
test('footer address, map link and social links are the new ones', () => {
  const d = src('src/data/services.js');
  assert.match(d, /132\/2, 2 Street, G\.M Nagar/); assert.match(d, /641001/);
  assert.match(d, /map: 'https:\/\/maps\.app\.goo\.gl\/6Ugmuwh5uUvgbHZu7'/);
  assert.match(d, /name: 'X', url: 'https:\/\/x\.com\/Adzonex'/);
  assert.match(d, /name: 'Telegram', url: 'https:\/\/t\.me\/Adzonexcbe'/);
  const f = src('src/components/Footer.jsx');
  assert.match(f, /href=\{CONTACT_INFO\.map\}/); assert.match(f, /noopener noreferrer/);
});
test('every one of the 30 services has its own picture, and that file exists', () => {
  const d = src('src/data/services.js');
  const found = [...d.matchAll(/name: '([^']+)',[\s\S]*?images: \[([\s\S]*?)\]/g)].map((m) => [m[1], [...m[2].matchAll(/'([^']+)'/g)].map((x) => x[1])]);
  assert.equal(found.length, 30);
  const seen = new Map();
  for (const [name, imgs] of found) {
    assert.ok(imgs.length >= 1, name + ' has no picture');
    for (const i of imgs) {
      assert.ok(fs.existsSync(new URL('img' + i, proj)), name + ': missing file ' + i);
      assert.ok(!seen.has(i), `${name} and ${seen.get(i)} share ${i}`); seen.set(i, name);
    }
  }
});
test('Clients page: rows alternate direction; logos have no box or background', () => {
  const css = src('src/pages/ClientsPage.css'); const jsx = src('src/pages/ClientsPage.jsx');
  assert.match(jsx, /r % 2 === 0 \? 'cl-row--ltr' : 'cl-row--rtl'/);
  assert.match(css, /\.cl-row--ltr \.cl-track \{ animation-direction: reverse; \}/);
  const logo = css.split('\n').find((l) => l.startsWith('.cl-logo > img'));
  assert.match(logo, /background: none/); assert.match(logo, /border: 0/); assert.ok(!/var\(--card\)/.test(logo));
});

// ───────── 12. Search engines, WhatsApp button, design pictures ─────────
test('robots.txt: Google may load the page data and photos; admin and the rest of the API stay closed', () => {
  const r = src('img/robots.txt');
  assert.match(r, /^Allow: \/api\/content$/m); assert.match(r, /^Allow: \/api\/media\/$/m);
  assert.match(r, /^Disallow: \/admin$/m); assert.match(r, /^Disallow: \/api\/$/m);
  assert.match(r, /^Sitemap: https:\/\/www\.adzonex\.in\/sitemap\.xml$/m);
  // "most specific rule wins": the Allow lines are longer than "Disallow: /api/", so Google reads them
  assert.ok('/api/content'.length > '/api/'.length && '/api/media/'.length > '/api/'.length);
});
test('API answers are never cached or indexed; uploaded photos keep their long cache', async () => {
  const r = await call('content', req('/api/content'));
  assert.equal(r.headers.get('cache-control'), 'no-store');
  assert.equal(r.headers.get('x-robots-tag'), 'noindex');
  const up = await call('media', req('/api/media', { method: 'POST', headers: auth({ 'content-type': 'image/png' }), raw: png }));
  const photo = await H.media(req(up.json.url));
  assert.match(photo.headers.get('cache-control'), /max-age=31536000, immutable/);
  assert.ok(!photo.headers.get('x-robots-tag'), 'photos may be indexed');
  assert.ok(!vercel.headers.some((h) => h.source.startsWith('/api/')), 'no blanket /api header that could override the photo cache');
});
test('floating WhatsApp button exists on public pages only and opens the right chat', () => {
  const app = src('src/App.jsx'); const c = src('src/components/FloatingWhatsApp.jsx'); const css = src('src/components/FloatingWhatsApp.css');
  assert.match(app, /<FloatingWhatsApp \/>/);
  assert.match(c, /pathname\.startsWith\('\/admin'\)/);
  assert.match(c, /rel="noopener noreferrer"/); assert.match(c, /aria-label="Chat with AD ZONEX on WhatsApp/);
  assert.match(src('src/data/services.js'), /whatsapp: 'https:\/\/wa\.me\/919342307860'/);
  assert.match(css, /position: fixed; z-index: 90;/); assert.match(css, /right: calc\(18px/); assert.match(css, /bottom: calc\(18px/);
  assert.match(css, /prefers-reduced-motion/);
});
test('all 7 design services have their own new picture', () => {
  const d = src('src/data/services.js');
  for (const f of ['logo-design', 'social-media-post-design', 'product-design', 'flyer-brochure-design', 'business-card-pamphlet-design', 'flex-vinyl-design', 'acp-led-sign-board-design']) {
    assert.ok(d.includes(`'/design/${f}.webp'`), f); assert.ok(fs.existsSync(new URL(`img/design/${f}.webp`, proj)), f + ' file');
  }
});
