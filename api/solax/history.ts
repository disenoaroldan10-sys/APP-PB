import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { wifiSn, date } = req.body;
  if (!wifiSn || !date) {
    return res.status(400).json({ error: 'wifiSn and date are required' });
  }

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
      { wifiSn, date },
      { headers: { tokenId } }
    );
    res.status(200).json(response.data);
  } catch (error: any) {
    console.error('Error fetching SolaX history data:', error.message);
    res.status(error.response?.status || 500).json({ 
      error: 'Error al conectar con SolaX Cloud', 
      details: error.message 
    });
  }
}
