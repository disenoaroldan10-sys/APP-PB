import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from "@google/genai";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { base64, mimeType, invoiceType } = req.body;

  // Log request size for debugging in Vercel
  const sizeInMB = Buffer.from(base64 || '', 'base64').length / (1024 * 1024);
  console.log(`Extract invoice request: ${mimeType}, size: ${sizeInMB.toFixed(2)} MB, type: ${invoiceType}`);

  if (!base64 || !mimeType) {
    return res.status(400).json({ error: 'Missing base64 data or mimeType' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    
    if (!apiKey || apiKey === 'your_api_key_here' || apiKey.startsWith('TODO') || apiKey.includes('Free Tier')) {
      return res.status(500).json({ 
        error: 'Configuración incompleta', 
        details: 'La clave API de Gemini (GEMINI_API_KEY) no está configurada o es inválida. Si estás en Vercel, asegúrate de añadirla en las variables de entorno del proyecto.' 
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    
    let prompt = "";
    let properties: any = {};
    let requiredFields: string[] = [];

    if (invoiceType === 'CONVENCIONAL') {
      prompt = `Analiza esta factura de energía CONVENCIONAL y extrae los siguientes campos en formato JSON. Si no encuentras un valor, pon 'No especificado'. 

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

    // Retry logic for 429 errors
    let attempts = 0;
    const maxAttempts = 3;
    let lastError = null;

    while (attempts < maxAttempts) {
      try {
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
        return res.status(200).json(data);
      } catch (error: any) {
        lastError = error;
        attempts++;
        
        const isQuotaError = error.message?.includes('429') || error.message?.includes('quota') || error.status === 'RESOURCE_EXHAUSTED';
        
        if (isQuotaError && attempts < maxAttempts) {
          console.log(`Quota exceeded (429). Attempt ${attempts} of ${maxAttempts}. Retrying in 3 seconds...`);
          await new Promise(resolve => setTimeout(resolve, 3000));
          continue;
        }
        
        throw error;
      }
    }

    throw lastError;
  } catch (error: any) {
    console.error('Error in Gemini extraction:', error.message);
    
    if (error.message?.includes('429') || error.message?.includes('quota') || error.status === 'RESOURCE_EXHAUSTED') {
      return res.status(429).json({
        error: 'Límite de peticiones excedido',
        details: 'Has alcanzado el límite de peticiones gratuitas de Gemini. Por favor, espera unos minutos o intenta de nuevo mañana.'
      });
    }

    return res.status(500).json({ 
      error: 'Error extracting data from invoice', 
      details: error.message 
    });
  }
}
