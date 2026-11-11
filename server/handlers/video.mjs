import { json, isAdmin, sameOrigin, forbidden, audit, createVideoUpload, removeVideo, VIDEO_TYPES, VIDEO_MAX_BYTES } from '../lib/util.mjs';

const EXT = { 'video/mp4': 'mp4', 'video/webm': 'webm' };
const PATH = /^[0-9a-f-]{36}\.(mp4|webm)$/;

/**
 * POST /api/video  {type, size}  -> a one-time upload link for a service video (admin only).
 *   Live site: { mode: 'signed', uploadUrl, publicUrl }  (the browser uploads straight to Supabase Storage)
 *   Local dev: { mode: 'local' }                          (the browser posts the file to /api/media instead)
 * DELETE /api/video?path=<id>.mp4 -> removes an old video file (admin only).
 */
export default async (req) => {
  if (!isAdmin(req)) return json({ error: 'Not signed in.' }, 401);
  if (!sameOrigin(req)) return forbidden();

  if (req.method === 'POST') {
    let b;
    try { b = await req.json(); } catch { return json({ error: 'Bad request' }, 400); }
    if (!VIDEO_TYPES.includes(b.type)) return json({ error: 'Only MP4 or WEBM videos.' }, 400);
    if (!(b.size > 0) || b.size > VIDEO_MAX_BYTES) return json({ error: 'Video too large (max 20 MB after compressing). Please trim it to a shorter clip.' }, 400);
    if (process.env.ADZONE_LOCAL === '1') return json({ mode: 'local' });
    try {
      const u = await createVideoUpload(EXT[b.type]);
      await audit(req, 'video.upload-link', `${u.path} ${b.size}b`);
      return json({ mode: 'signed', uploadUrl: u.uploadUrl, publicUrl: u.publicUrl });
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  }

  if (req.method === 'DELETE') {
    const path = new URL(req.url).searchParams.get('path') || '';
    if (PATH.test(path)) { await removeVideo(path).catch(() => {}); await audit(req, 'video.delete', path); }
    return json({ ok: true });
  }
  return json({ error: 'Method not allowed' }, 405);
};
