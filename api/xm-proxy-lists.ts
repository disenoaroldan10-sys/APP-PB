import type { VercelRequest, VercelResponse } from '@vercel/node';
import axios from 'axios';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await axios.post('https://servapibi.xm.com.co/lists', req.body, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 30000
    });
    return res.status(200).json(response.data);
  } catch (error: any) {
    console.error('Error in XM Proxy Lists:', error.message);
    return res.status(error.response?.status || 500).json({
      error: 'Error fetching lists from XM API',
      details: error.message
    });
  }
}
