import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

// In dev the browser calls /api on the Vite origin and Vite forwards it to the backend (default: port 5000).
// For a deployed build, set VITE_API_BASE to the backend's public URL instead.
export default defineConfig({
  plugins:[react()],
  server:{
    host:'0.0.0.0',
    allowedHosts:true,
    proxy:{
      '/api':{
        target:process.env.VITE_PROXY_TARGET||'http://localhost:5000',
        changeOrigin:true
      }
    }
  }
});
