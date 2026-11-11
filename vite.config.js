import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import adzoneApi from './vite-api-plugin.mjs';

// Adds <link rel="preload"> for the fonts used above the fold, so text appears in the right font straight away
// (no flash of a different font, less layout shift).
const preloadFonts = () => ({
  name: 'adzone-preload-fonts',
  transformIndexHtml: {
    order: 'post',
    handler(html, ctx) {
      if (!ctx.bundle) return html;
      const want = [/poppins-latin-600-normal/, /poppins-latin-700-normal/, /open-sans-latin-400-normal/];
      const links = Object.keys(ctx.bundle)
        .filter((f) => f.endsWith('.woff2') && want.some((re) => re.test(f)))
        .map((f) => `    <link rel="preload" href="/${f}" as="font" type="font/woff2" crossorigin />`)
        .join('\n');
      return links ? html.replace('</head>', `${links}\n  </head>`) : html;
    },
  },
});

export default defineConfig({
  plugins: [react(), adzoneApi(), preloadFonts()],
  // Your existing "img" folder (demo/img/...) is served as-is at the site root,
  // e.g. demo/img/logo/logo.png -> https://.../logo/logo.png
  // (see src/data/services.js and index.html for matching "/logo/..." paths)
  publicDir: 'img',
  build: {
    sourcemap: true,          // lets PageSpeed / browser dev tools map the code back to the source
    cssCodeSplit: true,
    target: 'es2020',
    chunkSizeWarningLimit: 600,
  },
  server: {
    port: 5173,
    open: true,
  },
});
