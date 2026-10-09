import { json, store, isAdmin } from '../lib/util.mjs';

/** Admin only: list job applications, download a CV (?file=<id>), delete one (?key=<key>). */
export default async (req) => {
  if (!isAdmin(req)) return json({ error: 'Not signed in.' }, 401);
  const s = store();
  const url = new URL(req.url);

  if (req.method === 'GET') {
    const file = url.searchParams.get('file');
    if (file) {
      if (!/^[0-9a-f-]{36}$/.test(file)) return json({ error: 'Not found' }, 404);
      const r = await s.getWithMetadata(`applications-files/${file}`, { type: 'arrayBuffer' });
      if (!r) return json({ error: 'File not found' }, 404);
      const name = String(r.metadata?.name || 'cv').replace(/[^\w.\- ()]/g, '_');
      return new Response(r.data, {
        headers: {
          'content-type': r.metadata?.type || 'application/octet-stream',
          'content-disposition': `attachment; filename="${name}"`,
          'x-content-type-options': 'nosniff',
          'cache-control': 'private, no-store',
        },
      });
    }
    const { blobs } = await s.list({ prefix: 'applications/' });
    const items = (await Promise.all(blobs.map(async (b) => {
      const v = await s.get(b.key, { type: 'json' });
      return v ? { ...v, key: b.key } : null;
    }))).filter(Boolean).sort((a, b) => (a.at < b.at ? 1 : -1));
    return json({ items });
  }

  if (req.method === 'DELETE') {
    const key = url.searchParams.get('key') || '';
    if (key.startsWith('applications/')) {
      const rec = await s.get(key, { type: 'json' });
      if (rec?.fileKey) await s.delete(rec.fileKey);
      await s.delete(key);
    }
    return json({ ok: true });
  }
  return json({ error: 'Method not allowed' }, 405);
};
