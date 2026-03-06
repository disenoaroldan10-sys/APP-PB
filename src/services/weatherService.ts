import axios from 'axios';

const API_KEY = import.meta.env.VITE_ACCUWEATHER_API_KEY;
const BASE_URL = 'https://dataservice.accuweather.com';

export interface WeatherData {
  locationName: string;
  currentTemp: number;
  uvToday: number;
  uvTomorrow: number;
  uvTodayText: string;
  uvTomorrowText: string;
}

export const getWeatherData = async (lat: number, lon: number): Promise<WeatherData> => {
  if (!API_KEY) {
    throw new Error('AccuWeather API Key is missing. Please add VITE_ACCUWEATHER_API_KEY to your environment variables.');
  }

  try {
    // 1. Get Location Key
    const locationRes = await axios.get(`${BASE_URL}/locations/v1/cities/geoposition/search`, {
      params: {
        apikey: API_KEY,
        q: `${lat},${lon}`,
        language: 'es-es'
      }
    });

    const locationKey = locationRes.data.Key;
    const locationName = locationRes.data.LocalizedName;

    // 2. Get Current Conditions
    const currentRes = await axios.get(`${BASE_URL}/currentconditions/v1/${locationKey}`, {
      params: {
        apikey: API_KEY,
        language: 'es-es'
      }
    });

    const currentTemp = currentRes.data[0].Temperature.Metric.Value;

    // 3. Get 5 Day Forecast (to get today and tomorrow UV)
    const forecastRes = await axios.get(`${BASE_URL}/forecasts/v1/daily/5day/${locationKey}`, {
      params: {
        apikey: API_KEY,
        language: 'es-es',
        details: true,
        metric: true
      }
    });

    const today = forecastRes.data.DailyForecasts[0];
    const tomorrow = forecastRes.data.DailyForecasts[1];

    return {
      locationName,
      currentTemp,
      uvToday: today.AirAndPollen.find((item: any) => item.Name === 'UVIndex')?.Value || 0,
      uvTodayText: today.AirAndPollen.find((item: any) => item.Name === 'UVIndex')?.Category || 'N/A',
      uvTomorrow: tomorrow.AirAndPollen.find((item: any) => item.Name === 'UVIndex')?.Value || 0,
      uvTomorrowText: tomorrow.AirAndPollen.find((item: any) => item.Name === 'UVIndex')?.Category || 'N/A',
    };
  } catch (error: any) {
    console.error('Error fetching AccuWeather data:', error);
    throw error;
  }
};
