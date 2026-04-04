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
    const { files, invoiceType } = req.body;
    
    // Log request size for debugging
    const sizeInMB = JSON.stringify(files || []).length / (1024 * 1024);
    console.log(`Extract invoice request: ${files?.length} files, type: ${invoiceType}, size: ${sizeInMB.toFixed(2)} MB`);

    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: 'Missing files data' });
    }

    try {
      // Prioritize a custom key name to bypass platform-locked secrets
      const apiKey = process.env.MI_CLAVE_GEMINI || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
      
      console.log('API Key detection:', {
        hasCustomKey: !!process.env.MI_CLAVE_GEMINI,
        hasGeminiKey: !!process.env.GEMINI_API_KEY,
        hasViteKey: !!process.env.VITE_GEMINI_API_KEY,
        usingKeySource: process.env.MI_CLAVE_GEMINI ? 'MI_CLAVE_GEMINI' : (process.env.GEMINI_API_KEY ? 'GEMINI_API_KEY' : 'VITE_GEMINI_API_KEY'),
        keyLength: apiKey?.length || 0
      });

      if (!apiKey || apiKey === 'your_api_key_here' || apiKey.includes('Free Tier')) {
        console.error('GEMINI_API_KEY or VITE_GEMINI_API_KEY is missing or invalid');
        return res.status(500).json({ 
          error: 'Configuración de API incompleta',
          details: 'No se encontró una clave de API válida. Por favor, añade GEMINI_API_KEY en los Secrets de AI Studio con tu clave de Google AI Studio.'
        });
      }

      const ai = new GoogleGenAI({ apiKey });
      
      let prompt = "";
      let properties: any = {};
      let requiredFields: string[] = [];

      if (invoiceType === 'CONVENCIONAL') {
        prompt = `Analiza esta factura de energía CONVENCIONAL (puede estar dividida en varias imágenes) y extrae los siguientes campos en formato JSON. Si no encuentras un valor, pon 'No especificado'. 

Campos específicos:
- Numero de contrato: El número de contrato o cuenta.
- Cliente: Nombre del titular.
- Energia: El consumo de energía activa en kWh del periodo actual. Busca el valor numérico bajo la columna 'consumo' en la sección de 'Energía' (por ejemplo, '23 kWh').
- Energia PROM: El promedio de consumo de energía en kWh. Busca el gráfico de barras 'Histórico de consumos (kWh) y promedio'. En la parte inferior de las barras están los meses, luego 'Actual' y al final 'PROM'. Encuentra la barra que dice 'PROM' en la base, extrae el número que está escrito en la parte superior de esa barra amarilla y añade ' kWh' al final (por ejemplo, '145 kWh'). No extraigas el valor de la barra 'Actual'.
- Comercialización: Valor unitario de comercialización. Búscalo en la sección de 'Costo Unitario de Prestación del Servicio' (CU) o 'Tarifa'. Suele estar representado por la letra 'C' o 'Cv' (por ejemplo, '123.45'). Extrae solo el número.
- Generación: Valor unitario de generación. Búscalo en la misma sección de 'Costo Unitario'. Suele estar representado por la letra 'G' (por ejemplo, '345.67'). Extrae solo el número.
- Total Energia: El valor total a pagar por el concepto de energía (por ejemplo, '$ 16.797,16').`;
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
        prompt = "Analiza esta factura de energía AGPE (Autogeneración a Pequeña Escala) (puede estar dividida en varias imágenes) y extrae los siguientes campos en formato JSON. Si no encuentras un valor, pon 'No especificado'. Campos: Cliente, Capacidad instalada, Importo/consumo, Excedentes, Saldo, Comercialización, Generación, Numero de contrato, Total a pagar.";
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

      // Retry logic for 429 errors
      let attempts = 0;
      const maxAttempts = 3;
      let lastError = null;

      const parts: any[] = [{ text: prompt }];
      for (const file of files) {
        parts.push({
          inlineData: {
            mimeType: file.mimeType,
            data: file.base64
          }
        });
      }

      while (attempts < maxAttempts) {
        try {
          const response = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite-preview",
            contents: [
              {
                parts: parts
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
          return res.json(data);
        } catch (error: any) {
          lastError = error;
          attempts++;
          
          // Check if it's a quota error (429)
          const isQuotaError = error.message?.includes('429') || error.message?.includes('quota') || error.status === 'RESOURCE_EXHAUSTED';
          
          if (isQuotaError && attempts < maxAttempts) {
            console.log(`Quota exceeded (429). Attempt ${attempts} of ${maxAttempts}. Retrying in 3 seconds...`);
            await new Promise(resolve => setTimeout(resolve, 3000));
            continue;
          }
          
          // If not a quota error or we've reached max attempts, break and handle error
          break;
        }
      }

      // If we get here, all attempts failed
      console.error('Error in Gemini extraction after retries:', lastError?.message);
      
      if (lastError?.message?.includes('429') || lastError?.status === 'RESOURCE_EXHAUSTED') {
        return res.status(429).json({ 
          error: 'Límite de cuota excedido', 
          details: 'Has alcanzado el límite de peticiones gratuitas de Gemini. Por favor, espera unos minutos o intenta de nuevo mañana. También puedes usar tu propia API Key en los ajustes para evitar este límite.' 
        });
      }

      res.status(500).json({ error: 'Error al extraer datos de la factura', details: lastError?.message });
    } catch (error: any) {
      console.error('Unexpected error in extraction route:', error.message);
      res.status(500).json({ error: 'Error inesperado en el servidor', details: error.message });
    }
  });

  // Proxy endpoint for SolaX API
  app.post('/api/solax/realtime', async (req, res) => {
    const { wifiSn } = req.body;
    if (!wifiSn) return res.status(400).json({ error: 'wifiSn is required' });

    const tokenId = process.env.SOLAX_TOKEN_ID;
    if (!tokenId) {
      return res.status(500).json({ 
        error: 'Configuración incompleta',
        details: 'SOLAX_TOKEN_ID no está configurado en las variables de entorno del servidor.' 
      });
    }

    try {
      // Using global.solaxcloud.com as per API documentation
      const response = await axios.get(`https://global.solaxcloud.com/proxyApp/proxy/api/getRealtimeInfo.do?tokenId=${tokenId}&sn=${wifiSn}`);
      
      // The API returns 200 OK but the payload contains success boolean
      res.json(response.data);
    } catch (error: any) {
      console.error('Error fetching SolaX data:', error.message);
      res.status(error.response?.status || 500).json({ 
        error: 'Error al conectar con SolaX Cloud', 
        details: error.message 
      });
    }
  });

  // Proxy endpoint for SolaX History API V2
  app.post('/api/solax/history', async (req, res) => {
    const { wifiSn, date } = req.body;
    if (!wifiSn || !date) return res.status(400).json({ error: 'wifiSn and date are required' });

    const tokenId = process.env.SOLAX_TOKEN_ID;
    if (!tokenId) {
      return res.status(500).json({ 
        error: 'Configuración incompleta',
        details: 'SOLAX_TOKEN_ID no está configurado en las variables de entorno del servidor.' 
      });
    }

    try {
      const response = await axios.post(
        'https://global.solaxcloud.com/api/v2/dataAccess/historyInfo/get',
        { sn: wifiSn, date },
        { headers: { tokenId } }
      );
      console.log('SolaX History Response:', JSON.stringify(response.data));
      res.json(response.data);
    } catch (error: any) {
      console.error('Error fetching SolaX history data:', error.message);
      if (error.response) {
        console.error('SolaX API Error Response:', JSON.stringify(error.response.data));
      }
      res.status(error.response?.status || 500).json({ 
        error: 'Error al conectar con SolaX Cloud', 
        details: error.message 
      });
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
