/**
 * Video compressor for the Admin panel.
 *
 * The owner can pick a huge video (300 MB or more). It is re-encoded inside the browser (WebCodecs, no server and no
 * extra cost) into an H.264 MP4 that is smaller than 20 MB, and only then uploaded. The library is loaded on demand,
 * so visitors of the public website never download it.
 *
 * How the size is controlled: the bitrate is calculated from the video length so the result lands just under the
 * target, and the picture size (1080p / 720p / 540p) is chosen so that bitrate still looks sharp. If the first
 * attempt is a little too big, it is redone with a lower bitrate.
 */
export const VIDEO_INPUT_MAX = 2 * 1024 * 1024 * 1024; // the file picked in Admin (before compressing)
export const VIDEO_OUTPUT_MAX = 20 * 1024 * 1024;       // what is uploaded after compressing
const TARGET_BYTES = 18.5 * 1024 * 1024;                 // aim a little under the limit
const AUDIO_BPS = 96_000;
const MAX_VIDEO_BPS = 10_000_000;
const MAX_ATTEMPTS = 3;

const even = (n) => Math.max(2, Math.round(n / 2) * 2);

/** True when this browser can compress video (Chrome, Edge, Safari 16.4+, Firefox 130+). */
export const canCompressVideo = () => typeof window !== 'undefined' && 'VideoEncoder' in window && 'VideoDecoder' in window;

/** Picture height (the shorter side) that still looks sharp at this bitrate. */
const pickShortSide = (videoBps) => (videoBps >= 2_400_000 ? 1080 : videoBps >= 1_100_000 ? 720 : videoBps >= 600_000 ? 540 : 480);

/**
 * Compresses `file` to an MP4 below 20 MB.
 * @param {File} file
 * @param {{ onProgress?: (p: number, note: string) => void, signal?: AbortSignal }} [opts]
 * @returns {Promise<{ file: File, before: number, after: number, width: number, height: number, skipped: boolean, audioDropped: boolean }>}
 */
export async function compressVideo(file, { onProgress, signal } = {}) {
  if (!canCompressVideo()) {
    throw new Error('This browser cannot compress videos. Please open Admin in the latest Chrome, Edge or Safari.');
  }
  if (file.size > VIDEO_INPUT_MAX) throw new Error(`This video is ${(file.size / 1073741824).toFixed(1)} GB. The limit is 2 GB.`);

  const { Input, Output, Conversion, BlobSource, BufferTarget, Mp4OutputFormat, WebMOutputFormat, ALL_FORMATS, canEncodeVideo } = await import('mediabunny');

  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  try {
    const vTrack = await input.getPrimaryVideoTrack();
    if (!vTrack) throw new Error('No video was found in this file. Please choose a different one.');
    if (!(await vTrack.canDecode())) throw new Error('This video format cannot be read by the browser. Please export it as MP4 (H.264) and try again.');
    const aTrack = await input.getPrimaryAudioTrack();
    const duration = Math.max(1, await input.computeDuration());
    const srcW = vTrack.displayWidth; const srcH = vTrack.displayHeight;

    // Already small enough: upload as is, so a good small file is never degraded.
    if (file.size <= VIDEO_OUTPUT_MAX && ['video/mp4', 'video/webm'].includes(file.type)) {
      return { file, before: file.size, after: file.size, width: srcW, height: srcH, skipped: true, audioDropped: false };
    }

    const stats = await vTrack.computePacketStats(120).catch(() => null);
    const fps = stats?.averagePacketRate || 30;

    // Prefer H.264 MP4 (plays everywhere). Fall back to VP9 WebM if the browser cannot encode H.264.
    const probe = { width: even(Math.min(srcW, 1920)), height: even(Math.min(srcH, 1080)), bitrate: 4_000_000 };
    const useMp4 = await canEncodeVideo('avc', probe).catch(() => false);
    if (!useMp4 && !(await canEncodeVideo('vp9', probe).catch(() => false))) {
      throw new Error('This browser cannot encode video. Please use the latest Chrome, Edge or Safari.');
    }

    let videoBps = Math.min(MAX_VIDEO_BPS, Math.floor((TARGET_BYTES * 8 * 0.96) / duration - (aTrack ? AUDIO_BPS : 0)));
    if (videoBps < 150_000) throw new Error(`This video is ${Math.round(duration / 60)} minutes long, too long to fit in 20 MB with good quality. Please trim it or upload a shorter clip.`);

    let last = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
      const short = pickShortSide(videoBps);
      const scale = Math.min(1, short / Math.min(srcW, srcH));
      const width = even(srcW * scale); const height = even(srcH * scale);
      const note = attempt === 1 ? 'Compressing' : `Compressing again (try ${attempt})`;

      const target = new BufferTarget();
      const output = new Output({
        format: useMp4 ? new Mp4OutputFormat({ fastStart: 'in-memory' }) : new WebMOutputFormat(),
        target,
      });
      const conversion = await Conversion.init({
        input,
        output,
        showWarnings: false,
        video: {
          width, height, fit: 'fill',
          codec: useMp4 ? 'avc' : 'vp9',
          bitrate: videoBps,
          keyFrameInterval: 2,
          ...(fps > 31 ? { frameRate: 30 } : {}),
        },
        audio: { codec: useMp4 ? 'aac' : 'opus', bitrate: AUDIO_BPS, numberOfChannels: 2 },
      });
      if (!conversion.isValid) throw new Error('This video could not be converted. Please export it as MP4 (H.264) and try again.');
      const onAbort = () => conversion.cancel();
      signal?.addEventListener('abort', onAbort, { once: true });
      conversion.onProgress = (p) => onProgress?.(Math.min(1, p), note);
      try {
        await conversion.execute();
      } catch (e) {
        if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
        throw e;
      } finally {
        signal?.removeEventListener('abort', onAbort);
      }

      const buf = target.buffer;
      const audioDropped = !!aTrack && !conversion.utilizedTracks.includes(aTrack);
      last = { buf, width, height, audioDropped };
      if (buf.byteLength <= VIDEO_OUTPUT_MAX) break;
      // Too big: aim lower, in proportion to how far over we were.
      videoBps = Math.floor(videoBps * (TARGET_BYTES / buf.byteLength) * 0.93);
      if (videoBps < 150_000) break;
    }

    if (!last || last.buf.byteLength > VIDEO_OUTPUT_MAX) {
      throw new Error('Could not get this video under 20 MB with good quality. Please trim it to a shorter clip.');
    }
    const base = file.name.replace(/\.[^.]+$/, '') || 'video';
    const type = useMp4 ? 'video/mp4' : 'video/webm';
    const out = new File([last.buf], `${base}.${useMp4 ? 'mp4' : 'webm'}`, { type });
    return { file: out, before: file.size, after: out.size, width: last.width, height: last.height, skipped: false, audioDropped: last.audioDropped };
  } finally {
    input.dispose?.();
  }
}
