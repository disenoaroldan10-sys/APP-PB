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

const fetchChunk = async (startDate: string, endDate: string): Promise<XmPriceData[]> => {
  console.log(`Fetching chunk: ${startDate} to ${endDate}`);
  const response = await axios.post(XM_API_URL, {
    MetricId: 'PrecBolsNaci', // Correct MetricId for "Precio de Bolsa Nacional"
    StartDate: startDate,
    EndDate: endDate,
    Entity: 'Sistema',
  });

  console.log('XM API Response received for chunk');
  const items = response.data.Items;
  if (!items || items.length === 0) {
    console.warn('No items found in XM response');
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
  
  console.log(`Parsed ${result.length} data points for chunk`);
  return result;
};

export const fetchPrecioBolsa = async (startDate: string, endDate: string): Promise<XmPriceData[]> => {
  try {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    const days = differenceInDays(end, start) + 1;

    if (days <= 30) {
      return await fetchChunk(startDate, endDate);
    }

    // Split into chunks of 30 days
    let currentStart = start;
    let allData: XmPriceData[] = [];

    while (!isAfter(currentStart, end)) {
      let currentEnd = addDays(currentStart, 29);
      if (isAfter(currentEnd, end)) {
        currentEnd = end;
      }

      const chunkData = await fetchChunk(
        format(currentStart, 'yyyy-MM-dd'),
        format(currentEnd, 'yyyy-MM-dd')
      );
      allData = [...allData, ...chunkData];
      currentStart = addDays(currentEnd, 1);
    }

    return allData;
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

export interface SINRealTimeData {
  generation: number;
  demand: number;
  lastUpdate: string;
  hourlyData: { hour: string; generation: number; demand: number }[];
}

export const fetchRealTimeSINData = async (): Promise<SINRealTimeData | null> => {
  try {
    const today = new Date();
    const startDate = format(addDays(today, -3), 'yyyy-MM-dd');
    const endDate = format(today, 'yyyy-MM-dd');
    
    // Fetch both metrics with fallbacks
    const results: any = {};
    const fetchMetricWithFallbacks = async (metricIds: string[]) => {
      for (const metricId of metricIds) {
        try {
          console.log(`Attempting to fetch metric: ${metricId}`);
          const response = await axios.post(XM_API_URL, {
            MetricId: metricId,
            StartDate: startDate,
            EndDate: endDate,
            Entity: 'Sistema',
          });

          const items = response.data.Items;
          if (items && items.length > 0) {
            // Find the last item that has values
            let lastDayWithData = null;
            for (let i = items.length - 1; i >= 0; i--) {
              const item = items[i];
              const hasHourly = item.HourlyEntities && item.HourlyEntities.length > 0 && item.HourlyEntities[0].Values;
              const hasDirect = item.Values && Object.keys(item.Values).length > 0;
              
              if (hasHourly || hasDirect) {
                lastDayWithData = item;
                break;
              }
            }

            if (lastDayWithData) {
              const values = lastDayWithData.HourlyEntities ? lastDayWithData.HourlyEntities[0].Values : lastDayWithData.Values;
              let lastValue = 0;
              let lastHour = 0;
              const hourly = [];

              for (let i = 1; i <= 24; i++) {
                const hourKey = `Hour${i.toString().padStart(2, '0')}`;
                const val = values[hourKey] !== undefined && values[hourKey] !== null ? parseFloat(values[hourKey]) : 0;
                hourly.push({ hour: `P${i - 1}`, value: val });
                if (val > 0) {
                  lastValue = val;
                  lastHour = i - 1;
                }
              }
              return { value: lastValue, hour: lastHour, date: lastDayWithData.Date, hourly };
            }
          }
        } catch (e) {
          console.warn(`Failed to fetch ${metricId}:`, e);
        }
      }
      return null;
    };

    results.generation = await fetchMetricWithFallbacks(['Gene', 'Generacion', 'GenReal', 'GeneracionReal', 'GeneracionRealSistema']);
    results.demand = await fetchMetricWithFallbacks(['DemaReal', 'DemandaReal', 'Demanda', 'DemandaRealSistema']);

    if (results.generation && results.demand) {
      const hourlyData = results.generation.hourly.map((g: any, i: number) => ({
        hour: g.hour,
        generation: g.value,
        demand: results.demand.hourly[i].value
      }));

      return {
        generation: results.generation.value,
        demand: results.demand.value,
        lastUpdate: `${results.generation.date} ${results.generation.hour.toString().padStart(2, '0')}:00`,
        hourlyData
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching real-time SIN data:', error);
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
  fetchRealTimeSINData,
  getMonthRange
};
