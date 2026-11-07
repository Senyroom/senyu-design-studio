import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, path.resolve(process.cwd(), '../..'), '');
  const api = env.API_INTERNAL_URL || 'http://127.0.0.1:4000';
  return {
    plugins: [react()],
    base: '/admin/',
    server: { proxy: { '/api': { target: api }, '/media': { target: api } } },
  };
});
