import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { existsSync } from 'node:fs'

// Relative base so the same build works on <user>.github.io/<repo>/,
// on a custom domain, and from the local `dist` folder.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  define: {
    'import.meta.env.VITE_GRAFANA_SHOT_AVAILABLE': existsSync(new URL('./public/shots/grafana.webp', import.meta.url)),
  },
  build: { outDir: 'dist', assetsDir: 'assets', sourcemap: false },
})
