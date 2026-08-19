import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const viteSlice = (
  globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  }
).process?.env?.VITE_SLICE;
const sliceName = viteSlice === '1'
  ? 'Slice1'
  : viteSlice === '2' || !viteSlice
    ? 'Slice2'
    : '결계의 바깥';
const base = viteSlice === '1' ? '/slice1/' : viteSlice === 'submission' ? '/' : '/slice2/';

export default defineConfig({
  base,
  plugins: [
    react(),
    {
      name: 'slice-document-title',
      transformIndexHtml(html) {
        return html.replace(
          /<title>.*?<\/title>/,
          `<title>${sliceName}</title>`,
        );
      },
    },
  ],
  server: {
    port: 8080,
  },
  build: {
    chunkSizeWarningLimit: 1_500,
  },
});
