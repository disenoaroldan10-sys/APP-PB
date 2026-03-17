import express from 'express';
import { createServer as createViteServer } from 'vite';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Gemini API endpoint for invoice extraction
  app.post('/api/extract-invoice', async (req, res) => {
    const { base64, mimeType, invoiceType } = req.body;
    
    // Log request size for debugging
    const sizeInMB = Buffer.from(base64 || '', 'base64').length / (1024 * 1024);
    console.log(`Extract invoice request: ${mimeType}, type: ${invoiceType}, size: ${sizeInMB.toFixed(2)} MB`);

    if (!base64 || !mimeType) {
      return res.status(400).json({ error: 'Missing base64 data or mimeType' });
    }

    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY or VITE_GEMINI_API_KEY is not set on the server');
      }

      const ai = new GoogleGenAI({ apiKey });
      
      let prompt = "";
      let properties: any = {};
      let requiredFields: string[] = [];

      if (invoiceType === 'CONVENCIONAL') {
        prompt = "Analiza esta factura de energía CONVENCIONAL y extrae los siguientes campos en formato JSON. Si no encuentras un valor, pon 'No especificado'. Campos: Numero de contrato, Cliente, Energia (Consumo actual), Energia PROM (Promedio de consumo), Comercialización, Generación, Total a pagar.";
        properties = {
          cliente: { type: Type.STRING },
          contrato: { type: Type.STRING },
          energia: { type: Type.STRING },
          energiaProm: { type: Type.STRING },
          comercializacion: { type: Type.STRING },
          generacion: { type: Type.STRING },
          totalEnergia: { type: Type.STRING }
        };
        requiredFields = ["cliente", "contrato", "energia", "energiaProm", "comercializacion", "generacion", "totalEnergia"];
      } else {
        // Default to AGPE
        prompt = "Analiza esta factura de energía AGPE (Autogeneración a Pequeña Escala) y extrae los siguientes campos en formato JSON. Si no encuentras un valor, pon 'No especificado'. Campos: Cliente, Capacidad instalada, Importo/consumo, Excedentes, Saldo, Comercialización, Generación, Numero de contrato, Total a pagar.";
        properties = {
          cliente: { type: Type.STRING },
          capacidadInstalada: { type: Type.STRING },
          importoConsumo: { type: Type.STRING },
          excedentes: { type: Type.STRING },
          saldo: { type: Type.STRING },
          comercializacion: { type: Type.STRING },
          generacion: { type: Type.STRING },
          contrato: { type: Type.STRING },
          totalEnergia: { type: Type.STRING }
        };
        requiredFields = ["cliente", "capacidadInstalada", "importoConsumo", "excedentes", "saldo", "comercializacion", "generacion", "contrato", "totalEnergia"];
      }

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType,
                  data: base64
                }
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties,
            required: requiredFields
          }
        }
      });

      const data = JSON.parse(response.text || '{}');
      res.json(data);
    } catch (error: any) {
      console.error('Error in Gemini extraction:', error.message);
      res.status(500).json({ error: 'Error extracting data from invoice', details: error.message });
    }
  });

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
