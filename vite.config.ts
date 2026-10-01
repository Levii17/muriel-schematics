import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// base './' keeps asset URLs relative so the build works under any GitHub Pages sub-path.
// The '@' alias points at src/ (kept in sync with "paths" in tsconfig.json).
export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: { alias: { '@': '/src' } },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
})
