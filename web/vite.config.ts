import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'build',
  },
  server: {
    proxy: {
      '/api/terminals/ws': {
        target: 'http://mesos-term:3000',
        ws: true,
      },
      '/api/': {
        target: 'http://mesos-term:3000',
      },
    },
  },
});
