import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import * as cfg from './admin-config.mjs';

// ── Storage ─────────────────────────────────────────────────────
// On Vercel, data lives in Supabase (see the Supabase adapter below).
// With plain `npm run dev` the same API is backed by the .local-data folder.
function localStore() {
  const dir = path.join(process.cwd(), '.local-data');
  const file = (k) => path.join(dir, Buffer.from(k).toString('base64url'));
  const readMeta = async (k) => { try { return JSON.parse(await fs.readFile(file(k) + '.meta', 'utf8')); } catch { return null; } };
  return {
    async get(k, opts = {}) {
      try {
        const buf = await fs.readFile(file(k));
        return opts.type === 'json' ? JSON.parse(buf.toString('utf8'))
          : opts.type === 'arrayBuffer' ? buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
          : buf.toString('utf8');
      } catch { return null; }
    },
    async getWithMetadata(k, opts = {}) {
      const data = await this.get(k, opts);
      return data === null ? null : { data, metadata: (await readMeta(k)) || {} };
    },
    async set(k, data, opts = {}) {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(file(k), typeof data === 'string' ? data : Buffer.from(data));
      if (opts.metadata) await fs.writeFile(file(k) + '.meta', JSON.stringify(opts.metadata));
    },
    async setJSON(k, v) { return this.set(k, JSON.stringify(v)); },
    async delete(k) { await fs.rm(file(k), { force: true }); await fs.rm(file(k) + '.meta', { force: true }); },
    async list({ prefix = '' } = {}) {
      await fs.mkdir(dir, { recursive: true });
      const names = (await fs.readdir(dir)).filter((n) => !n.endsWith('.meta'));
      const keys = names.map((n) => Buffer.from(n, 'base64url').toString()).filter((k) => k.startsWith(prefix));
      return { blobs: keys.map((key) => ({ key })) };
    },
  };
}
// ── Supabase adapter (same tiny API as localStore) ──────────────
// Text/JSON data -> table  public.kv_store (key text primary key, value jsonb)
// Photos         -> private Storage bucket "media"
// The server uses the SERVICE ROLE key (env only, never in the browser).
const BUCKET = 'media';
const isMedia = (k) => k.startsWith('media/');
const missing = (e) => /not.?found|does not exist|404|400/i.test(`${e?.statusCode} ${e?.status} ${e?.message}`);
let client;
async function sb() {
  if (client) return client;
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Storage is not set up: add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel → Settings → Environment Variables, then redeploy.');
  }
  const { createClient } = await import('@supabase/supabase-js');
  client = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}
const fail = (e) => { throw new Error(`Supabase: ${e.message || e}`); };

function supabaseStore() {
  return {
    async get(k) {
      const db = await sb();
      const { data, error } = await db.from('kv_store').select('value').eq('key', k).limit(1);
      if (error) fail(error);
      return data?.length ? data[0].value : null;
    },
    async getWithMetadata(k) {
      const db = await sb();
      const { data, error } = await db.storage.from(BUCKET).download(k.replace(/^media\//, ''));
      if (error) { if (missing(error)) return null; fail(error); }
      return { data: await data.arrayBuffer(), metadata: { type: data.type || 'image/jpeg' } };
    },
    async set(k, data, opts = {}) {
      const db = await sb();
      if (isMedia(k)) {
        const { error } = await db.storage.from(BUCKET).upload(k.replace(/^media\//, ''), Buffer.from(data), {
          contentType: opts.metadata?.type || 'image/jpeg', upsert: true,
        });
        if (error) fail(error);
      } else {
        return this.setJSON(k, typeof data === 'string' ? JSON.parse(data) : data);
      }
    },
    async setJSON(k, v) {
      const db = await sb();
      const { error } = await db.from('kv_store').upsert({ key: k, value: v, updated_at: new Date().toISOString() }, { onConflict: 'key' });
      if (error) fail(error);
    },
    async delete(k) {
      const db = await sb();
      const { error } = isMedia(k)
        ? await db.storage.from(BUCKET).remove([k.replace(/^media\//, '')])
        : await db.from('kv_store').delete().eq('key', k);
      if (error && !missing(error)) fail(error);
    },
    async list({ prefix = '' } = {}) {
      const db = await sb();
      const blobs = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await db.from('kv_store').select('key').like('key', `${prefix}%`).order('key').range(from, from + 999);
        if (error) fail(error);
        blobs.push(...data.map((r) => ({ key: r.key })));
        if (data.length < 1000) break;
      }
      return { blobs };
    },
  };
}
export const store = () => (process.env.ADZONE_LOCAL === '1' ? localStore() : supabaseStore());

// ── Admin credentials (environment variables only) ─────────────
// In production a missing secret means the admin area is CLOSED (never a built-in default).
// `npm run dev` (ADZONE_LOCAL=1) uses clearly-marked dev-only values so the project still runs on a laptop.
const DEV = () => process.env.ADZONE_LOCAL === '1';
const DEV_VALUES = { ADMIN_USERNAME: 'dev_admin', ADMIN_PASSWORD: 'dev-only-password-change-me', ADMIN_SECRET: 'dev-only-session-secret', ADMIN_KEY_SECRET: 'dev-only-key-secret' };
export const secretOf = (name) => {
  const v = process.env[name];
  if (v && v.length >= 1) return v;
  return DEV() ? DEV_VALUES[name] : '';
};
const MIN_LEN = { ADMIN_PASSWORD: 12, ADMIN_SECRET: 24, ADMIN_KEY_SECRET: 24 };
/** Returns the names of required admin settings that are missing or too weak (empty list = admin is usable). */
export const adminConfigProblems = () =>
  ['ADMIN_USERNAME', 'ADMIN_PASSWORD', 'ADMIN_SECRET', 'ADMIN_KEY_SECRET']
    .filter((n) => { const v = secretOf(n); return !v || v.length < (MIN_LEN[n] || 1) || (!DEV() && /^(dev-only|adzone_admin$|AdZone@2026)/.test(v)); });
export const adminReady = () => adminConfigProblems().length === 0;
const ID = () => secretOf('ADMIN_USERNAME');
const PASS = () => secretOf('ADMIN_PASSWORD');
export const SESSION_MS = (Number(cfg.SESSION_MINUTES) || 60) * 60 * 1000;
const SECRET = () => `${secretOf('ADMIN_SECRET')}|${PASS()}|${secretOf('ADMIN_KEY_SECRET')}`;
// The built-in example credentials no longer exist; kept so older admin screens do not break.
export const usingDefaults = () => DEV();

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' },
  });

const hash = (v) => crypto.createHash('sha256').update(String(v)).digest();
const same = (a, b) => crypto.timingSafeEqual(hash(a), hash(b));
export const checkId = (id) => same(id, ID());
export const checkPassword = (pass) => same(pass, PASS());

// Brute-force guard: 5 wrong tries -> locked for 10 minutes (per IP).
// Stored in the database so it survives serverless restarts.
const lockKey = (ip) => `lock/${crypto.createHash('sha256').update(String(ip)).digest('hex').slice(0, 32)}`;
const readLock = async (ip) => { try { return (await store().get(lockKey(ip), { type: 'json' })) || { n: 0, until: 0 }; } catch { return { n: 0, until: 0 }; } };
export const lockedFor = async (ip) => {
  const t = await readLock(ip);
  return t.until > Date.now() ? Math.ceil((t.until - Date.now()) / 60000) : 0;
};
export const noteFail = async (ip) => {
  const t = await readLock(ip);
  t.n = t.until && t.until <= Date.now() ? 1 : t.n + 1;
  if (t.n >= 5) { t.until = Date.now() + 10 * 60000; t.n = 0; }
  try { await store().setJSON(lockKey(ip), t); } catch { /* storage down: don't block login */ }
};
export const clearFails = async (ip) => { try { await store().delete(lockKey(ip)); } catch { /* ignore */ } };
export const clientIp = (req) =>
  req.headers.get('x-real-ip') || (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'local';

export function sign(payload) {
  const p = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const s = crypto.createHmac('sha256', SECRET()).update(p).digest('base64url');
  return `${p}.${s}`;
}

export function verify(token, type = 'admin') {
  if (!token) return null;
  const [p, s] = token.split('.');
  if (!p || !s) return null;
  const expected = crypto.createHmac('sha256', SECRET()).update(p).digest('base64url');
  const a = Buffer.from(s);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(p, 'base64url').toString());
    return data.exp > Date.now() && data.t === type ? data : null;
  } catch {
    return null;
  }
}

export const isAdmin = (req) =>
  adminReady() && !!verify((req.headers.get('authorization') || '').replace(/^Bearer\s+/i, ''), 'admin');

// Text from the public: cut to length and remove control characters (no line breaks inside one-line fields).
export const clip = (v, n = 2000) => String(v ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').slice(0, n);
export const oneLine = (v, n = 200) => clip(v, n).replace(/[\r\n\u2028\u2029]+/g, ' ').trim();
// Strict-enough e-mail check: one address, no spaces, commas, quotes or angle brackets.
export const validEmail = (e) => /^[A-Za-z0-9._%+\-]{1,64}@[A-Za-z0-9\-]{1,63}(\.[A-Za-z0-9\-]{1,63})+$/.test(e) && e.length <= 150;

// ── Same-origin guard (CORS lock-down) ──────────────────────────
// Browsers always send Origin on cross-site POST/PUT/DELETE. If it is present it must be this very site.
// (No Access-Control-Allow-Origin header is ever sent, so other sites cannot read our API responses either.)
export const sameOrigin = (req) => {
  const o = req.headers.get('origin');
  if (!o) return true; // not a browser cross-site request (curl, server-to-server, same-origin GET)
  try {
    const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || new URL(req.url).host).split(',')[0].trim();
    return new URL(o).host === host;
  } catch { return false; }
};
export const forbidden = () => json({ error: 'Forbidden.' }, 403);

// ── Rate limiting (per IP, kept in the database so it works across serverless instances) ──
const ipHash = (ip) => crypto.createHash('sha256').update(String(ip)).digest('hex').slice(0, 24);
/** Returns true if this request is allowed. `limit` requests per `windowSec` seconds for this bucket + IP. */
export async function rateLimit(req, bucket, limit, windowSec) {
  const slot = Math.floor(Date.now() / (windowSec * 1000));
  const key = `rl/${bucket}/${ipHash(clientIp(req))}/${slot}`;
  try {
    const s = store();
    const cur = (await s.get(key, { type: 'json' })) || { n: 0 };
    if (cur.n >= limit) return false;
    await s.setJSON(key, { n: cur.n + 1, exp: (slot + 2) * windowSec * 1000 });
    return true;
  } catch { return true; } // storage hiccup: never block real customers
}
export const tooMany = () => json({ error: 'Too many requests. Please wait a few minutes and try again, or call us on +91 93423 07860.' }, 429);

// ── Optional CAPTCHA (Cloudflare Turnstile) — active only when TURNSTILE_SECRET is set ──
export async function captchaOk(token, req) {
  const secret = process.env.TURNSTILE_SECRET;
  if (!secret) return true;
  if (!token || typeof token !== 'string' || token.length > 2048) return false;
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token, remoteip: clientIp(req) }),
    });
    return !!(await r.json()).success;
  } catch { return false; }
}

// ── Audit log of admin actions ─────────────────────────────────
// Saved as audit/<time>-<random>; the newest 1000 are kept. Also printed to Vercel's logs.
export async function audit(req, action, detail = '') {
  const rec = { at: new Date().toISOString(), action, detail: String(detail).slice(0, 300), ip: clientIp(req), ua: String(req.headers.get('user-agent') || '').slice(0, 160) };
  console.log('[audit]', JSON.stringify(rec));
  try {
    const s = store();
    await s.setJSON(`audit/${rec.at}-${crypto.randomBytes(3).toString('hex')}`, rec);
    if (Math.random() < 0.02) { // now and then, trim old entries
      const { blobs } = await s.list({ prefix: 'audit/' });
      const old = blobs.map((b) => b.key).sort().reverse().slice(1000);
      await Promise.all(old.map((k) => s.delete(k)));
    }
  } catch { /* logging must never break the action */ }
}

