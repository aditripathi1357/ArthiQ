import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('lucide-react')) return 'vendor-lucide'
            if (id.includes('recharts') || id.includes('d3')) return 'vendor-charts'
            if (id.includes('@supabase') || id.includes('supabase')) return 'vendor-supabase'
            return 'vendor-core'
          }
        },
      },
    },
  },
})
