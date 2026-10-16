import crypto from 'node:crypto';
import { json, store, isAdmin, sameOrigin, forbidden, audit } from '../lib/util.mjs';

const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const ID = /^[0-9a-f-]{36}$/;
// The first bytes of the file must really be that image type (a renamed script or SVG is refused).
const MAGIC = {
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b.subarray(0, 8).toString('hex') === '89504e470d0a1a0a',
  'image/gif': (b) => ['GIF87a', 'GIF89a'].includes(b.subarray(0, 6).toString('latin1')),
  'image/webp': (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP',
};

export default async (req) => {
  const s = store();
  const id = new URL(req.url).pathname.split('/').pop();

  if (req.method === 'GET') {
    if (!ID.test(id)) return new Response('Not found', { status: 404 });
    const r = await s.getWithMetadata(`media/${id}`, { type: 'arrayBuffer' });
    if (!r) return new Response('Not found', { status: 404 });
    return new Response(r.data, {
      headers: {
        'content-type': r.metadata?.type || 'image/jpeg',
        'cache-control': 'public, max-age=31536000, immutable',
        'x-content-type-options': 'nosniff',
        'content-security-policy': "default-src 'none'; sandbox",
      },
    });
  }

  if (!isAdmin(req)) return json({ error: 'Not signed in.' }, 401);
  if (!sameOrigin(req)) return forbidden();

  if (req.method === 'POST') {
    const type = (req.headers.get('content-type') || '').split(';')[0];
    if (!TYPES.includes(type)) return json({ error: 'Only JPG, PNG, WEBP or GIF images.' }, 400);
    const buf = await req.arrayBuffer();
    if (!buf.byteLength || buf.byteLength > 4.2 * 1024 * 1024) return json({ error: 'Image too large (max ~4 MB).' }, 400);
    // Client logos (header x-media-kind: logo) must be PNG files that really have transparency.
    if (req.headers.get('x-media-kind') === 'logo') {
      const b = Buffer.from(buf);
      if (type !== 'image/png') return json({ error: 'Client logos must be PNG files.' }, 400);
      const colorType = b[25]; // PNG header: 4 = grey+alpha, 6 = RGBA, 3 = palette (needs a tRNS chunk)
      const hasAlpha = colorType === 4 || colorType === 6 || b.includes(Buffer.from('tRNS'));
      if (MAGIC['image/png'](b) && !hasAlpha) return json({ error: 'That PNG has no transparent background. Please upload a logo with a transparent background.' }, 400);
    }
    if (!MAGIC[type](Buffer.from(buf))) return json({ error: 'That file is not really a ' + type.split('/')[1].toUpperCase() + ' image.' }, 400);
    const newId = crypto.randomUUID();
    await s.set(`media/${newId}`, buf, { metadata: { type } });
    await audit(req, 'media.upload', `${newId} ${type} ${buf.byteLength}b`);
    return json({ url: `/api/media/${newId}` });
  }

  if (req.method === 'DELETE') {
    if (ID.test(id)) { await s.delete(`media/${id}`); await audit(req, 'media.delete', id); }
    return json({ ok: true });
  }
  return json({ error: 'Method not allowed' }, 405);
};
