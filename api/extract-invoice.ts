import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { base64, mimeType } = req.body;

  // Log request size for debugging in Vercel
  const sizeInMB = Buffer.from(base64 || '', 'base64').length / (1024 * 1024);
  console.log(`Extract invoice request: ${mimeType}, size: ${sizeInMB.toFixed(2)} MB`);

  if (!base64 || !mimeType) {
    return res.status(400).json({ error: 'Missing base64 data or mimeType' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY or VITE_GEMINI_API_KEY is not set on the server');
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              text: "Analiza esta factura de energía y extrae los siguientes campos en formato JSON. Sé extremadamente preciso con los valores numéricos y nombres. Si no encuentras un valor exacto, pon 'No especificado'.\n\nCampos específicos a buscar:\n- Cliente: (Nombre del titular o cliente)\n- Contrato: (Número de contrato, cuenta o NIU)\n- FNCER Capacidad instalada: (Capacidad en kW)\n- Importó/consumo: (Valor de consumo o energía importada)\n- Excedentes: (Energía exportada o excedentes)\n- Saldo: (Saldo anterior o pendiente)\n- Comercialización: (Componente de comercialización C)\n- Generación: (Componente de generación G)\n- Total Energía: (Valor total facturado o total energía)"
            },
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
          properties: {
            cliente: { type: Type.STRING },
            contrato: { type: Type.STRING },
            capacidadInstalada: { type: Type.STRING },
            importoConsumo: { type: Type.STRING },
            excedentes: { type: Type.STRING },
            saldo: { type: Type.STRING },
            comercializacion: { type: Type.STRING },
            generacion: { type: Type.STRING },
            totalEnergia: { type: Type.STRING }
          },
          required: ["cliente", "contrato", "capacidadInstalada", "importoConsumo", "excedentes", "saldo", "comercializacion", "generacion", "totalEnergia"]
        }
      }
    });

    let text = response.text || '{}';
    // Remove markdown code blocks if present
    if (text.includes('```json')) {
      text = text.split('```json')[1].split('```')[0].trim();
    } else if (text.includes('```')) {
      text = text.split('```')[1].split('```')[0].trim();
    }

    const data = JSON.parse(text);
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('Error in Gemini extraction:', error.message);
    return res.status(500).json({ 
      error: 'Error extracting data from invoice', 
      details: error.message 
    });
  }
}
