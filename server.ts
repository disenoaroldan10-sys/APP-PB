import express from 'express';
import { createServer as createViteServer } from 'vite';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Proxy endpoint for XM API to avoid CORS issues
  app.post('/api/xm-proxy', async (req, res) => {
    console.log('Proxy Request to /hourly:', JSON.stringify(req.body));
    try {
      const response = await axios.post('https://servapibi.xm.com.co/hourly', req.body, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 60000
      });
      console.log('Proxy Response Status:', response.status);
      res.json(response.data);
    } catch (error: any) {
      console.error('Error in XM Proxy:', error.message);
      if (error.response) {
        console.error('Response data:', JSON.stringify(error.response.data));
      }
      res.status(error.response?.status || 500).json({
        error: 'Error fetching data from XM API',
        details: error.message,
        responseData: error.response?.data
      });
    }
  });

  app.post('/api/xm-proxy-lists', async (req, res) => {
    try {
      const response = await axios.post('https://servapibi.xm.com.co/lists', req.body, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 30000
      });
      res.json(response.data);
    } catch (error: any) {
      res.status(error.response?.status || 500).json({
        error: 'Error fetching lists from XM API',
        details: error.message
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
