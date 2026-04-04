import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { wifiSn } = req.body;
  if (!wifiSn) {
    return res.status(400).json({ error: 'wifiSn is required' });
  }

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
    res.status(200).json(response.data);
  } catch (error: any) {
    console.error('Error fetching SolaX data:', error.message);
    res.status(error.response?.status || 500).json({ 
      error: 'Error al conectar con SolaX Cloud', 
      details: error.message 
    });
  }
}
