import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    {
      name: 'isolate-middleware-dependencies',
      config(config) {
        if (!config.server?.middlewareMode) return
        // SSR test servers must never replace the running app's optimized files.
        config.cacheDir ||= `node_modules/.vite-tests/${process.pid}`
        config.optimizeDeps = { ...config.optimizeDeps, noDiscovery: true, include: [] }
      },
    },
    react(),
    tailwindcss(),
  ],
  optimizeDeps: { include: ['recharts'] },
  server: { proxy: { '^/sitemap.xml$': 'http://localhost:5000' } },
})
