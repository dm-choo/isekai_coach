import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/slice2/',
  plugins: [react()],
  server: {
    port: 8080,
  },
  build: {
    chunkSizeWarningLimit: 1_500,
  },
});
