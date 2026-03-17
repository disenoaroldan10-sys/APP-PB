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
      const status = error.response?.status || 500;
      const message = error.message;
      const responseData = error.response?.data;

      // Log only if it's not a 400 (which can be expected during fallback/probing)
      // or if we want to see why it's failing
      if (status !== 400) {
        console.error(`Error in XM Proxy (${status}):`, message);
      } else {
        console.warn(`XM API returned 400 for ${req.body.MetricId}:`, JSON.stringify(responseData));
      }

      res.status(status).json({
        error: 'Error fetching data from XM API',
        details: message,
        responseData: responseData
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

  // Growatt API Proxy
  app.all('/api/growatt/*', async (req, res) => {
    const endpoint = req.params[0];
    const growattUrl = process.env.GROWATT_API_URL || 'http://test.growatt.com/v1/';
    const token = process.env.GROWATT_TOKEN || '6eb6f069523055a339d71e5b1f6c88cc';

    try {
      const config: any = {
        method: req.method,
        url: `${growattUrl}${endpoint}`,
        params: { ...req.query, token },
        headers: {
          'Accept': 'application/json',
        },
        timeout: 30000
      };

      if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
        config.data = { ...req.body, token };
      }

      const response = await axios(config);
      res.json(response.data);
    } catch (error: any) {
      console.error(`Growatt Proxy Error (${endpoint}):`, error.message);
      res.status(error.response?.status || 500).json({
        error: 'Error fetching from Growatt API',
        details: error.message,
        responseData: error.response?.data
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
