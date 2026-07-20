import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Split vendor libraries into separate chunks
          if (id.includes('node_modules')) {
            if (id.includes('@mui/material') || id.includes('@mui/icons-material')) {
              return 'mui-core'
            }
            if (id.includes('recharts')) {
              return 'charts'
            }
            if (id.includes('react-router-dom')) {
              return 'router'
            }
            if (id.includes('@supabase/supabase-js')) {
              return 'supabase'
            }
          }
        },
      },
    },
  },
})