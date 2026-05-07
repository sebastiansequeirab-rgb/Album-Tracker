import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    // Code-split: separar libs pesadas en chunks aparte para que el bundle
    // inicial sea más liviano y las libs se cacheen entre deploys.
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase':     ['@supabase/supabase-js'],
          'motion':       ['framer-motion'],
        },
      },
    },
    // Subir el warning threshold ahora que tenemos chunks bien separados.
    chunkSizeWarningLimit: 600,
  },
})
