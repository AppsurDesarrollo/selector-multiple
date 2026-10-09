import { defineConfig, devices } from '@playwright/test';

// Solo Chromium: es el motor que usan los proyectos de la empresa para recorrer
// pantallas. La demo se sirve con Vite y las pruebas la manejan con el teclado.
export default defineConfig({
  testDir: 'pruebas',
  // Un solo proceso: Vite optimiza dependencias al primer arranque y recarga la
  // página; con varios a la vez, los primeros fallaban sin motivo real.
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    ...devices['Desktop Chrome'],
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm exec vite',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
});
