const KEY = 'adzone_admin_token';
// sessionStorage: closing the tab/browser also ends the admin session.
export const getToken = () => { try { return sessionStorage.getItem(KEY) || ''; } catch { return ''; } };
export const setToken = (t) => { try { t ? sessionStorage.setItem(KEY, t) : sessionStorage.removeItem(KEY); } catch { /* ignore */ } };

/** When the current session ends (ms timestamp), read from the token. 0 if none. */
export const tokenExpiry = () => {
  try {
    const p = getToken().split('.')[0].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(p)).exp || 0;
  } catch { return 0; }
};

/** Manual log out: clears the session and returns to the website's home page. */
export const logOut = () => {
  setToken('');
  window.location.assign('/');
};

export const goToLogin = (expired = false) => {
  setToken('');
  window.location.assign(`/admin/login${expired ? '?expired=1' : ''}`);
};

/** JSON helper. Adds the admin token automatically. */
export async function api(path, { method = 'GET', body, headers = {} } = {}) {
  const token = getToken();
  const res = await fetch(path, {
    method,
    headers: {
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* not json */ }
  if (res.status === 401 && token && path !== '/api/login') { goToLogin(true); }
  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

/**
 * Uploads a photo and returns "/api/media/<id>".
 * Every photo is compressed automatically in the browser first: the longest side is limited to 2000 px and the
 * picture is saved as WebP (about 80% smaller, with transparency kept for logos). Animated GIFs are left alone.
 * If compressing would not make the file smaller, the original is uploaded instead.
 */
const UPLOAD_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const UPLOAD_LIMIT = 4 * 1024 * 1024; // the hosting limit
const MAX_SIDE = 2000;
const QUALITY = 0.82;

const toBlob = (canvas, type, q) => new Promise((r) => canvas.toBlob(r, type, q));

export async function compressImage(file) {
  if (file.type === 'image/gif') return { blob: file, type: file.type }; // keep animation
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  let scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const resized = scale < 1;
  let best = null;
  for (let round = 0; round < 8; round++) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    let blob = await toBlob(canvas, 'image/webp', QUALITY);
    if (!blob || blob.type !== 'image/webp') { // old browsers without WebP encoding → JPEG on white
      const c2 = document.createElement('canvas'); c2.width = canvas.width; c2.height = canvas.height;
      const x = c2.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c2.width, c2.height); x.drawImage(canvas, 0, 0);
      blob = await toBlob(c2, 'image/jpeg', QUALITY);
    }
    best = blob;
    if (blob && blob.size <= UPLOAD_LIMIT) break;
    scale *= 0.85; // still too big → shrink a little more
  }
  bitmap.close?.();
  if (!best || best.size > UPLOAD_LIMIT) throw new Error('This image is too large to upload. Please use a smaller file.');
  // Already small and not resized? Keep the original if it is not bigger than the compressed copy.
  if (!resized && UPLOAD_TYPES.includes(file.type) && file.size <= best.size) return { blob: file, type: file.type };
  return { blob: best, type: best.type };
}

/** Compresses, uploads, and tells you how much was saved: { url, before, after }. */
export async function uploadImageWithStats(file) {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.');
  const { blob, type } = await compressImage(file);
  const res = await fetch('/api/media', {
    method: 'POST',
    headers: { 'content-type': type, authorization: `Bearer ${getToken()}` },
    body: blob,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return { url: data.url, before: file.size, after: blob.size };
}

export const uploadImage = async (file) => (await uploadImageWithStats(file)).url;

export const deleteMedia = (url) =>
  url?.startsWith('/api/media/') ? api(url, { method: 'DELETE' }).catch(() => {}) : Promise.resolve();

/**
 * Client logos must be PNG files with a transparent background (they sit directly on the Clients page, no box behind them).
 * Checks the file, shrinks it if it is huge (still PNG, still transparent) and uploads it.
 */
export async function uploadPngLogo(file) {
  if (file.type !== 'image/png' || !/\.png$/i.test(file.name)) throw new Error(`"${file.name}" is not a PNG. Client logos must be PNG files with a transparent background.`);
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 900 / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale)); const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0, w, h); bitmap.close?.();
  // A logo that has a solid background has opaque, matching pixels in all four corners.
  const px = [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]].map(([x, y]) => ctx.getImageData(x, y, 1, 1).data);
  const opaque = px.every((p) => p[3] > 250);
  const same = px.every((p) => Math.abs(p[0] - px[0][0]) + Math.abs(p[1] - px[0][1]) + Math.abs(p[2] - px[0][2]) < 40);
  if (opaque && same) throw new Error(`"${file.name}" has a solid background. Please upload the PNG with a transparent background.`);
  const blob = file.size > 700 * 1024 || scale < 1 ? await new Promise((r) => canvas.toBlob(r, 'image/png')) : file;
  if (!blob || blob.size > 4 * 1024 * 1024) throw new Error(`"${file.name}" is too large. Please use a smaller PNG.`);
  const res = await fetch('/api/media', { method: 'POST', headers: { 'content-type': 'image/png', 'x-media-kind': 'logo', authorization: `Bearer ${getToken()}` }, body: blob });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return { url: data.url, before: file.size, after: blob.size };
}

/**
 * Uploads a service video and returns its address.
 * Any size up to 2 GB can be chosen: the video is first compressed in the browser to an MP4 under 20 MB (see
 * utils/compressVideo.js), then sent straight to Supabase Storage with a one-time upload link (videos are too big for
 * the website's own server). With `npm run dev` the file is posted to /api/media instead.
 * onProgress(stage, 0..1, note) is called while working; stage is 'compress' or 'upload'.
 * Resolves to { url, before, after, width, height, skipped, audioDropped }.
 */
export const VIDEO_MAX = 20 * 1024 * 1024; // what is stored (after compressing)
const xhrSend = (method, url, body, headers, onProgress) => new Promise((resolve, reject) => {
  const x = new XMLHttpRequest();
  x.open(method, url);
  for (const [k, v] of Object.entries(headers)) x.setRequestHeader(k, v);
  x.upload.onprogress = (e) => { if (e.lengthComputable) onProgress?.(e.loaded / e.total); };
  x.onload = () => (x.status >= 200 && x.status < 300 ? resolve(x.responseText) : reject(new Error(`Upload failed (${x.status}). ${x.responseText?.slice(0, 160) || ''}`.trim())));
  x.onerror = () => reject(new Error('Upload failed. Check your internet connection and try again.'));
  x.send(body);
});

export async function uploadVideo(file, onProgress, signal) {
  if (!file.type.startsWith('video/') && !/\.(mp4|mov|m4v|webm|mkv)$/i.test(file.name)) throw new Error('Please choose a video file (MP4, MOV, WEBM or MKV).');
  const { compressVideo } = await import('./compressVideo');
  const c = await compressVideo(file, { signal, onProgress: (p, note) => onProgress?.('compress', p, note) });
  const video = c.file;
  if (video.size > VIDEO_MAX) throw new Error('The compressed video is still above 20 MB. Please trim it to a shorter clip.');
  const link = await api('/api/video', { method: 'POST', body: { type: video.type, size: video.size } });
  let url;
  if (link.mode === 'local') {
    const out = await xhrSend('POST', '/api/media', video, { 'content-type': video.type, authorization: `Bearer ${getToken()}` }, (p) => onProgress?.('upload', p, 'Uploading'));
    url = JSON.parse(out).url;
  } else {
    const form = new FormData();
    form.append('cacheControl', '31536000');
    form.append('', video);
    await xhrSend('PUT', link.uploadUrl, form, {}, (p) => onProgress?.('upload', p, 'Uploading'));
    url = link.publicUrl;
  }
  return { url, before: c.before, after: c.after, width: c.width, height: c.height, skipped: c.skipped, audioDropped: c.audioDropped };
}

/** Removes an old video file from storage (nothing happens for addresses that are not ours). */
export const deleteVideo = (url) => {
  const m = /\/videos\/([0-9a-f-]{36}\.(?:mp4|webm))$/.exec(url || '');
  if (m) return api(`/api/video?path=${m[1]}`, { method: 'DELETE' }).catch(() => {});
  return deleteMedia(url);
};
