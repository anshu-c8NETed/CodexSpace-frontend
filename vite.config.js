import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  
  // Development server configuration
  server: {
    port: 5173,
    strictPort: false,
    headers: {
      // Required for WebContainer to work
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
    // Enable CORS for development
    cors: true,
  },
  
  // Preview server configuration (for production builds)
  preview: {
    port: 4173,
    strictPort: false,
    headers: {
      // Required for WebContainer to work
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
    cors: true,
  },
  
  // Build optimizations
  build: {
    target: 'es2015',
    minify: 'esbuild',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'editor': ['@webcontainer/api'],
        }
      }
    }
  },
  
  // Optimizations
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@webcontainer/api'],
  },
})
