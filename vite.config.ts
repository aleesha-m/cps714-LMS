import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Forward API calls to the Express server so the session cookie stays same-origin.
    proxy: { '/api': 'http://localhost:5001' },
  },
})
