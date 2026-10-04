import { defineConfig } from 'vitest/config';

// './' makes every asset URL relative, so the same build works at
// http://localhost:5173/ and at https://<user>.github.io/<repo>/.
export default defineConfig({
  base: process.env.VITE_BASE ?? './',
  test: { include: ['tests/**/*.test.ts'], testTimeout: 120000 },
});
