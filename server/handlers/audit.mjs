import { json, store, isAdmin } from '../lib/util.mjs';

/** Admin only: the most recent admin actions (newest first). */
export default async (req) => {
  if (!isAdmin(req)) return json({ error: 'Not signed in.' }, 401);
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405);
  const s = store();
  const { blobs } = await s.list({ prefix: 'audit/' });
  const keys = blobs.map((b) => b.key).sort().reverse().slice(0, 200);
  const items = (await Promise.all(keys.map((k) => s.get(k, { type: 'json' })))).filter(Boolean);
  return json({ items });
};
