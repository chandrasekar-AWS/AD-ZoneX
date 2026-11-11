import { json, sign, verify, checkId, checkPassword, usingDefaults, SESSION_MS, lockedFor, noteFail, clearFails, clientIp, adminReady, sameOrigin, forbidden, rateLimit, tooMany, audit } from '../lib/util.mjs';
import { readKeyFile } from '../lib/keyfile.mjs';

const STEP_MS = 5 * 60 * 1000; // each step's ticket is valid for 5 minutes

const fail = async (ip, msg, req) => {
  await noteFail(ip);
  if (req) audit(req, 'login.failed', msg);
  await new Promise((r) => setTimeout(r, 700)); // slows down guessing
  return json({ error: msg }, 401);
};

export default async (req) => {
  // Admin is closed until the secrets are set (no built-in passwords exist).
  if (!adminReady()) return json({ error: 'Admin sign-in is not set up yet.' }, 503);
  // Is my admin session still valid?
  if (req.method === 'GET') {
    const t = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    const d = verify(t, 'admin');
    return d ? json({ ok: true, exp: d.exp, now: Date.now(), maxMs: SESSION_MS, usingDefaults: usingDefaults() }) : json({ ok: false }, 401);
  }
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  if (!sameOrigin(req)) return forbidden();
  const ip = clientIp(req);
  // Overall cap on sign-in requests per IP (on top of the wrong-attempt lock-out below).
  if (!(await rateLimit(req, 'login', 40, 600))) return tooMany();
  const wait = await lockedFor(ip);
  if (wait) return json({ error: `Too many wrong attempts. Try again in ${wait} minute(s).` }, 429);

  let b = {};
  try { b = await req.json(); } catch { /* ignore */ }

  // Step 1 — Admin ID
  if (b.action === 'checkId') {
    if (!checkId(b.id ?? '')) return fail(ip, 'Wrong Admin ID.', req);
    return json({ ok: true, ticket: sign({ t: 'idok', exp: Date.now() + STEP_MS }) });
  }

  // Step 2 — Password (only after a valid ID ticket)
  if (b.action === 'checkPassword') {
    if (!verify(b.ticket, 'idok')) return json({ error: 'Session expired. Start again from the Admin ID.', restart: true }, 401);
    if (!checkPassword(b.password ?? '')) return fail(ip, 'Wrong password.', req);
    return json({ ok: true, ticket: sign({ t: 'pwok', exp: Date.now() + STEP_MS }) });
  }

  // Step 3 — Key file (only after a valid password ticket)
  if (b.action === 'key') {
    if (!verify(b.ticket, 'pwok')) return json({ error: 'Session expired. Start again from the Admin ID.', restart: true }, 401);
    const k = readKeyFile(b.keyFile);
    if (!k) return fail(ip, 'Invalid key file.', req);
    return json({ ok: true, ticket: sign({ t: 'keyok', kid: k.kid, exp: Date.now() + STEP_MS }) });
  }

  // Step 4 — everything already verified in order; issue the session.
  if (b.action === 'login') {
    if (!verify(b.ticket, 'keyok')) return json({ error: 'Session expired. Start again from the Admin ID.', restart: true }, 401);
    await clearFails(ip);
    await audit(req, 'login.success', 'key ' + (verify(b.ticket, 'keyok')?.kid || ''));
    const exp = Date.now() + SESSION_MS; // fixed length — logs out automatically
    return json({ token: sign({ t: 'admin', exp }), exp, now: Date.now(), maxMs: SESSION_MS, usingDefaults: usingDefaults() });
  }

  return json({ error: 'Bad request' }, 400);
};
