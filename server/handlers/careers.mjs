import crypto from 'node:crypto';
import nodemailer from 'nodemailer';
import { json, store, clip } from '../lib/util.mjs';

// Job applications go to the general inbox (design enquiries have their own).
const CAREERS_MAIL = 'adzonecbe@outlook.com';
const MAX_BYTES = 3.2 * 1024 * 1024; // keeps the base64 request under Vercel's 4.5 MB body limit

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Allowed documents. The file's first bytes must match its extension, so a renamed .exe is rejected.
const TYPES = {
  pdf: { mime: 'application/pdf', ok: (b) => b.subarray(0, 4).toString('latin1') === '%PDF' },
  doc: { mime: 'application/msword', ok: (b) => b.subarray(0, 4).toString('hex') === 'd0cf11e0' },
  docx: { mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', ok: (b) => b.subarray(0, 2).toString('latin1') === 'PK' },
  odt: { mime: 'application/vnd.oasis.opendocument.text', ok: (b) => b.subarray(0, 2).toString('latin1') === 'PK' },
  rtf: { mime: 'application/rtf', ok: (b) => b.subarray(0, 5).toString('latin1') === '{\\rtf' },
  txt: { mime: 'text/plain', ok: (b) => !b.subarray(0, 2000).includes(0) },
};

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);
  let b;
  try { b = await req.json(); } catch { return json({ error: 'Bad request' }, 400); }
  if (b.website) return json({ ok: true, emailed: true }); // honeypot

  const name = clip(b.name, 100).trim();
  const email = clip(b.email, 150).trim();
  const phone = clip(b.phone, 40).trim();
  const position = clip(b.position, 100).trim();
  const experience = clip(b.experience, 60).trim();
  const message = clip(b.message, 4000).trim();
  if (!name || !/\S+@\S+\.\S+/.test(email)) return json({ error: 'Name and a valid email are required.' }, 400);

  // ── the CV ──
  const fileName = clip(b.fileName, 150).replace(/[^\w.\- ()]/g, '_');
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  const type = TYPES[ext];
  if (!b.fileData || !type) return json({ error: 'Please attach your CV as a PDF or Word document (PDF, DOC, DOCX, ODT, RTF or TXT).' }, 400);
  const file = Buffer.from(String(b.fileData), 'base64');
  if (!file.length || file.length > MAX_BYTES) return json({ error: 'The file is too large. Please keep it under 3 MB.' }, 400);
  if (!type.ok(file)) return json({ error: 'That file does not look like a real document of that type.' }, 400);

  const id = crypto.randomUUID();
  const at = new Date().toISOString();
  const record = { id, at, name, email, phone, position, experience, message, fileName, fileSize: file.length, fileKey: `applications-files/${id}`, sentTo: CAREERS_MAIL, emailed: false };

  // 1) Save first so an application can never be lost.
  let s = null;
  const key = `applications/${Date.now()}-${id}`;
  try {
    s = store();
    await s.set(record.fileKey, file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength), { metadata: { name: fileName, type: type.mime } });
    await s.setJSON(key, record);
  } catch (err) { s = null; console.error('Could not save application:', err.message); }

  // 2) Email it, with the CV attached.
  const { SMTP_USER, SMTP_PASS } = process.env;
  if (SMTP_USER && SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT || 465),
        secure: Number(process.env.SMTP_PORT || 465) === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      });
      const rows = [['Name', name], ['Email', email], ['Phone', phone || '—'], ['Applying for', position || 'General application'], ['Experience', experience || '—']];
      await transporter.sendMail({
        from: `"AD ZONEX Website" <${SMTP_USER}>`,
        to: CAREERS_MAIL,
        replyTo: `"${name.replace(/"/g, '')}" <${email}>`,
        subject: `[Careers] ${position || 'General application'} — ${name}`,
        text: `${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\nCover note:\n${message || '—'}`,
        html: `<table cellpadding="6" style="font-family:Arial,sans-serif">${rows.map(([k, v]) => `<tr><td><b>${k}</b></td><td>${esc(v)}</td></tr>`).join('')}</table><p style="font-family:Arial,sans-serif"><b>Cover note</b><br>${esc(message || '—').replace(/\n/g, '<br>')}</p>`,
        attachments: [{ filename: fileName, content: file, contentType: type.mime }],
      });
      record.emailed = true;
      if (s) await s.setJSON(key, record).catch(() => {});
    } catch (err) { console.error('Application email failed:', err); }
  } else {
    console.warn('SMTP_USER / SMTP_PASS not set — application saved but not emailed.');
  }

  if (!s && !record.emailed) return json({ error: 'Could not save your application. Please call or WhatsApp us on +91 93423 07860.' }, 500);
  return json({ ok: true, emailed: record.emailed });
};
