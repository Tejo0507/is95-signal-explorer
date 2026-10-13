import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * The base path differs by host:
 *
 *   Vercel / Netlify / local preview  →  served from the domain root, base '/'
 *   GitHub Pages project site         →  served from /<repo>/, so base must match
 *
 * Rather than hard-coding one and breaking the other, the base comes from the
 * BASE_PATH environment variable and defaults to '/'. The GitHub Pages workflow
 * in .github/workflows/deploy.yml sets BASE_PATH=/<repo>/ before building.
 */
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
  build: {
    outDir: 'dist',
    // Every diagram on this site is inline SVG, so the bundle is JS + one CSS
    // file. Raising the warning limit avoids noise over a single ~250 kB chunk
    // that is not worth code-splitting for a five-page site.
    chunkSizeWarningLimit: 700,
  },
});
