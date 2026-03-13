import axios from 'axios';

export interface GeocodingResult {
  country: string;
  state: string;
  city: string;
  address: string;
}

export interface IrradianceResult {
  average: number;
  unit: string;
  parameterName: string;
}

/**
 * Reverse geocoding using Nominatim (OpenStreetMap)
 */
export const reverseGeocode = async (lat: number, lon: number): Promise<GeocodingResult> => {
  try {
    const response = await axios.get(`https://nominatim.openstreetmap.org/reverse`, {
      params: {
        lat,
        lon,
        format: 'json',
        addressdetails: 1
      },
      headers: {
        'Accept-Language': 'es' // Request results in Spanish
      }
    });

    const address = response.data.address;
    return {
      country: address.country || 'N/A',
      state: address.state || address.region || 'N/A',
      city: address.city || address.town || address.village || address.suburb || 'N/A',
      address: response.data.display_name || 'N/A'
    };
  } catch (error) {
    console.error('Error in reverse geocoding:', error);
    throw new Error('No se pudo obtener la ubicación para estas coordenadas.');
  }
};

/**
 * Fetch monthly irradiance from NASA POWER API
 */
export const fetchNasaIrradiance = async (
  lat: number, 
  lon: number, 
  startYear: number, 
  endYear: number, 
  monthIndex: number | null // 0-11 or null for annual
): Promise<IrradianceResult> => {
  try {
    // NASA API month index is 1-12, but we are fetching monthly averages for a range of years
    // The 'monthly' endpoint returns averages for each month of each year in the range
    // Key suffix "13" represents the annual average for that year.
    const response = await axios.get(`https://power.larc.nasa.gov/api/temporal/monthly/point`, {
      params: {
        parameters: 'ALLSKY_SFC_SW_DWN',
        community: 'RE',
        longitude: lon,
        latitude: lat,
        start: startYear,
        end: endYear,
        format: 'JSON'
      }
    });

    const data = response.data;
    const parameterData = data.properties.parameter['ALLSKY_SFC_SW_DWN'];
    
    // NASA monthly data keys are like "202313" (annual) or "202301" (January)
    // We need to filter for the specific month (or annual) across all years
    const monthStr = monthIndex !== null 
      ? (monthIndex + 1).toString().padStart(2, '0')
      : '13'; // 13 is the annual average key in NASA POWER API
    
    let sum = 0;
    let count = 0;

    for (let year = startYear; year <= endYear; year++) {
      const key = `${year}${monthStr}`;
      const value = parameterData[key];
      
      // NASA uses -999 or similar for missing data
      if (value !== undefined && value !== null && value > -900) {
        sum += value;
        count++;
      }
    }

    if (count === 0) {
      throw new Error(monthIndex !== null 
        ? 'No hay datos disponibles para el mes y rango de años seleccionados.'
        : 'No hay datos anuales disponibles para el rango de años seleccionado.'
      );
    }

    return {
      average: sum / count,
      unit: data.parameters['ALLSKY_SFC_SW_DWN'].units,
      parameterName: data.parameters['ALLSKY_SFC_SW_DWN'].longname
    };
  } catch (error: any) {
    console.error('Error fetching NASA data:', error);
    if (error.response?.status === 400) {
      throw new Error('Coordenadas fuera de rango o parámetros inválidos.');
    }
    throw new Error('Error al consultar la API de la NASA.');
  }
};

export const nasaService = {
  reverseGeocode,
  fetchNasaIrradiance
};
