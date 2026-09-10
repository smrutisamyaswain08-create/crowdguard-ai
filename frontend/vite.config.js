import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: false,
    cors: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, res) => {
            console.warn('[Vite Proxy Warning] Backend Django server unreachable at http://localhost:8000:', err.message);
            if (res.headersSent) return;
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ 
              status: 'API_OFFLINE', 
              message: 'Django backend server offline. Run: python manage.py runserver',
              incidents: [],
              results: []
            }));
          });
        }
      }
    }
  }
})
