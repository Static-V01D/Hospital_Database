import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// /api is proxied to the ASP.NET backend (backend/Properties/launchSettings.json → http profile).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: process.env.VITE_API_TARGET || 'http://localhost:5198', changeOrigin: true },
    },
  },
})
