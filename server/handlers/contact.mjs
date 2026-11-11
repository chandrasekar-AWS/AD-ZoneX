import crypto from 'node:crypto';
import nodemailer from 'nodemailer';
import { json, store, clip, oneLine, validEmail, sameOrigin, forbidden, rateLimit, tooMany, captchaOk } from '../lib/util.mjs';

// ── Routing rule ────────────────────────────────────────────────
// Design services  -> designadzonex@gmail.com  (ONLY)
// Everything else  -> enquiry@adzonex.in    (never design)
const DESIGN_MAIL = 'designadzonex@gmail.com';
const OTHER_MAIL = 'enquiry@adzonex.in';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  if (!sameOrigin(req)) return forbidden();
  if (Number(req.headers.get('content-length') || 0) > 64 * 1024) return json({ error: 'Request too large.' }, 413);
  if (!(await rateLimit(req, 'contact', 5, 600))) return tooMany();
  let b;
  try { b = await req.json(); } catch { return json({ error: 'Bad request' }, 400); }

  const name = oneLine(b.name, 100);
  const email = oneLine(b.email, 150);
  const phone = oneLine(b.phone, 40);
  const service = oneLine(b.service, 150);
  const state = oneLine(b.state, 60);
  const city = oneLine(b.city, 60);
  const message = clip(b.message, 4000).trim();
  const category = ['design', 'print', 'signage', 'digital'].includes(b.category) ? b.category : 'general';

  if (b.website) return json({ ok: true, emailed: true }); // honeypot: bots fill hidden fields

  if (!name || !validEmail(email)) return json({ error: 'Name and a valid email are required.' }, 400);
  if (!(await captchaOk(b.captchaToken, req))) return json({ error: 'Please complete the human check and try again.' }, 400);

  const to = category === 'design' ? DESIGN_MAIL : OTHER_MAIL;
  const record = { id: crypto.randomUUID(), at: new Date().toISOString(), name, email, phone, service, state, city, category, message, sentTo: to, emailed: false };

  // 1) Always save the enquiry first so it can never be lost.
  let s = null;
  const key = `enquiries/${Date.now()}-${record.id}`;
  try { s = store(); await s.setJSON(key, record); } catch (err) { s = null; console.error('Could not save enquiry:', err.message); }

  // 2) Email it to the right inbox.
  const { SMTP_USER, SMTP_PASS } = process.env;
  if (SMTP_USER && SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT || 465),
        secure: Number(process.env.SMTP_PORT || 465) === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      });
      const rows = [['Name', name], ['Email', email], ['Phone', phone || '—'], ['Service', service || 'General enquiry'], ['State', state || '—'], ['City', city || '—'], ['Category', category]];
      await transporter.sendMail({
        from: `"AD ZONEX Website" <${SMTP_USER}>`,
        to,
        replyTo: `"${name.replace(/"/g, '')}" <${email}>`,
        subject: `[${category === 'general' ? 'General' : category[0].toUpperCase() + category.slice(1)}] New enquiry: ${service || 'General'} — ${name}`,
        text: `${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\nMessage:\n${message || '—'}`,
        html: `<table cellpadding="6" style="font-family:Arial,sans-serif">${rows.map(([k, v]) => `<tr><td><b>${k}</b></td><td>${esc(v)}</td></tr>`).join('')}</table><p style="font-family:Arial,sans-serif"><b>Message</b><br>${esc(message || '—').replace(/\n/g, '<br>')}</p>`,
      });
      record.emailed = true;
      if (s) await s.setJSON(key, record).catch(() => {});
    } catch (err) {
      console.error('Email failed:', err);
    }
  } else {
    console.warn('SMTP_USER / SMTP_PASS not set — enquiry saved but not emailed.');
  }

  return json({ ok: true, emailed: record.emailed });
};
