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
    
    if (!apiKey || apiKey === 'your_api_key_here' || apiKey.startsWith('TODO')) {
      return res.status(500).json({ 
        error: 'Configuración incompleta', 
        details: 'La clave API de Gemini (GEMINI_API_KEY) no está configurada o es inválida. Si estás en Vercel, asegúrate de añadirla en las variables de entorno del proyecto.' 
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          parts: [
            {
              text: "Analiza esta factura de energía (ejemplo EPM) y extrae los siguientes campos en formato JSON. Sé extremadamente preciso.\n\nInstrucciones visuales y críticas:\n- Contrato: Busca el número que aparece en color VERDE (o resaltado), usualmente en una fuente más grande, ubicado justo ENCIMA del 'Referente de pago'. El texto dice 'Contrato' seguido de un número de 7 u 8 dígitos (ej: 'Contrato 13263357'). Extrae solo el número.\n- Cliente: Nombre completo de la empresa o persona (ej: 'Precolombina De Turismo Especializado Sa').\n- FNCER Capacidad instalada: Valor numérico en kW.\n- Importó/consumo: Valor de energía activa o consumo importado (ej: 3.634 kWh).\n- Excedentes: Valor de energía exportada o excedentes.\n- Saldo: Saldo a favor o pendiente de meses anteriores.\n- Comercialización: Valor del componente C (Comercialización).\n- Generación: Valor del componente G (Generación).\n- Total Energía: El valor específico del concepto de Energía (ej: $3.185.154,79) o el total facturado."
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
