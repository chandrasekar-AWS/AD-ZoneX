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
