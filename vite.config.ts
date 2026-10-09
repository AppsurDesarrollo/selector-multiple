/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

// Misma forma que los proyectos de /nuevo-proyecto (alias `@`, jsdom, globals sin
// setupFiles): así la prueba que viaja con el registro corre igual aquí y allí.
export default defineConfig({
  root: 'demo',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': resolve(import.meta.dirname, 'src') },
  },
  build: { outDir: '../dist', emptyOutDir: true },
  server: { port: 5173, strictPort: true },
  test: {
    root: '.',
    include: ['src/**/*.test.tsx'],
    environment: 'jsdom',
    globals: true,
  },
});
