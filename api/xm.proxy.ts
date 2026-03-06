import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Solo aceptamos POST porque eso es lo que envía tu servicio
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // La URL real de XM a la que quieres llegar
    const XM_URL = 'http://bundle.xm.com.co/bundle/adp/intercambios/precios-bolsa-nacional';

    const response = await axios.post(XM_URL, req.body, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    return res.status(200).json(response.data);
  } catch (error: any) {
    console.error('Error en Proxy:', error.message);
    return res.status(error.response?.status || 500).json(
      error.response?.data || { error: 'Error interno del servidor' }
    );
  }
}