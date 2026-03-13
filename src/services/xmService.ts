import axios from 'axios';
import { startOfMonth, endOfMonth, format, differenceInDays, addDays, parseISO, isAfter } from 'date-fns';

const XM_API_URL = '/api/xm-proxy';

export interface XmPriceData {
  Date: string;
  Hour: string;
  Value: number;
}

export interface XmResponse {
  Items: {
    MetricId: string;
    Entity: string;
    Values: {
      [key: string]: string | number;
    }[];
  }[];
}

const cache = new Map<string, XmPriceData[]>();

const fetchChunk = async (startDate: string, endDate: string): Promise<XmPriceData[]> => {
  const cacheKey = `${startDate}_${endDate}`;
  if (cache.has(cacheKey)) {
    console.log(`Returning cached data for: ${startDate} to ${endDate}`);
    return cache.get(cacheKey)!;
  }

  console.log(`Fetching chunk: ${startDate} to ${endDate}`);
  const response = await axios.post(XM_API_URL, {
    MetricId: 'PrecBolsNaci',
    StartDate: startDate,
    EndDate: endDate,
    Entity: 'Sistema',
  });

  const items = response.data.Items;
  if (!items || items.length === 0) {
    return [];
  }

  const result: XmPriceData[] = [];
  items.forEach((item: any) => {
    const date = item.Date;
    if (item.HourlyEntities && item.HourlyEntities.length > 0) {
      const values = item.HourlyEntities[0].Values;
      if (values) {
        for (let i = 1; i <= 24; i++) {
          const hourKey = `Hour${i.toString().padStart(2, '0')}`;
          if (values[hourKey] !== undefined && values[hourKey] !== null) {
            result.push({
              Date: date,
              Hour: `P${i - 1}`,
              Value: parseFloat(values[hourKey]),
            });
          }
        }
      }
    }
  });
  
  cache.set(cacheKey, result);
  return result;
};

export const fetchPrecioBolsa = async (startDate: string, endDate: string): Promise<XmPriceData[]> => {
  try {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const days = differenceInDays(end, start) + 1;

    // XM API usually allows up to 31 days per request. 
    // Increasing this to 31 allows most months to be fetched in a single request.
    if (days <= 31) {
      return await fetchChunk(startDate, endDate);
    }

    // Split into chunks of 31 days
    const chunks: { start: string; end: string }[] = [];
    let currentStart = start;

    while (!isAfter(currentStart, end)) {
      let currentEnd = addDays(currentStart, 30); // This makes it 31 days total
      if (isAfter(currentEnd, end)) {
        currentEnd = end;
      }

      chunks.push({
        start: format(currentStart, 'yyyy-MM-dd'),
        end: format(currentEnd, 'yyyy-MM-dd')
      });
      
      currentStart = addDays(currentEnd, 1);
    }

    // Fetch all chunks in parallel to significantly reduce total wait time
    const results = await Promise.all(
      chunks.map(chunk => fetchChunk(chunk.start, chunk.end))
    );

    return results.flat();
  } catch (error: any) {
    console.error('Error fetching XM data:', error);
    throw error;
  }
};

export const getMonthlyPrices = async (year: number, month: number) => {
  const { start, end } = getMonthRange(year, month);
  const data = await fetchPrecioBolsa(start, end);
  
  // Group by hour and average
  const hourlyAverages = Array.from({ length: 24 }, (_, hour) => {
    const hourKey = `P${hour}`;
    const values = data.filter(d => d.Hour === hourKey).map(d => d.Value);
    const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
    return { hour, price: avg };
  });

  return hourlyAverages;
};

export const listMetrics = async (): Promise<any> => {
  try {
    const response = await axios.post('/api/xm-proxy-lists', {
      MetricId: 'ListadoMetricas'
    });
    return response.data;
  } catch (error) {
    console.error('Error listing metrics:', error);
    return null;
  }
};

export const getMonthRange = (year: number, month: number) => {
  const date = new Date(year, month);
  return {
    start: format(startOfMonth(date), 'yyyy-MM-dd'),
    end: format(endOfMonth(date), 'yyyy-MM-dd'),
  };
};

export const xmService = {
  fetchPrecioBolsa,
  getMonthlyPrices,
  listMetrics,
  getMonthRange
};
