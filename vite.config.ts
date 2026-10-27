import { defineConfig, type Connect, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { GET as liveHandler } from './api/live';

// Serves the Vercel /api/live function from the Vite dev & preview servers
const liveApi = (): Plugin => {
  const middleware: Connect.NextHandleFunction = async (req, res) => {
    const response = await liveHandler(new Request(new URL(req.originalUrl || req.url || '', 'http://localhost')));
    res.statusCode = response.status;
    response.headers.forEach((value, key) => res.setHeader(key, value));
    res.end(await response.text());
  };
  return {
    name: 'live-api',
    configureServer: (server) => void server.middlewares.use('/api/live', middleware),
    configurePreviewServer: (server) => void server.middlewares.use('/api/live', middleware),
  };
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), liveApi()],
  optimizeDeps: {
  },
});
