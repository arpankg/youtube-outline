import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Expose to all network interfaces
    strictPort: true,
    hmr: {
      clientPort: 443 // Fix for ngrok HTTPS tunneling
    },
    // Allow all hosts - only use during development
    cors: true,
    proxy: {}, // Add any proxy configurations if needed
  },
})
