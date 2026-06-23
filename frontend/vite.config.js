import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // ML / prediction routes → FastAPI (port 8000)
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      // Auth, trips, flags, insights, chat, profile, assessment → Node (port 5000)
      '/auth': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/trips': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/flags': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/insights': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/chat': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/profile': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/assessment': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/feedback': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})
