import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 9002,
    host: true,
    proxy: {
      '/api/agent-security': {
        target: 'http://localhost:9003',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:9001',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
