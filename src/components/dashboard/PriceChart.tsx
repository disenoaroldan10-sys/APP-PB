import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer
} from 'recharts';
import { TrendingUp, BarChart3 } from 'lucide-react';

interface PriceChartProps {
  isMounted: boolean;
  selectedMonths: any[];
  chartData: any[];
  colors: string[];
}

export const PriceChart: React.FC<PriceChartProps> = ({
  isMounted,
  selectedMonths,
  chartData,
  colors
}) => {
  return (
    <section className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 h-full min-h-[500px] flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Precio de Bolsa Horario</h2>
          <p className="text-sm text-gray-500">Comparativa de precios promedio ponderados por hora [COP/kWh]</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Tendencia del Mercado
          </div>
        </div>
      </div>

      <div className="flex-1 w-full min-h-[400px] relative">
        {isMounted && selectedMonths.some(m => !m.loading && !m.error && m.data.length > 0) ? (
          <ResponsiveContainer key={`resp-cont-${selectedMonths.length}`} width="100%" height="100%" debounce={100}>
            <LineChart 
              key={`chart-${selectedMonths.length}`}
              data={chartData} 
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis 
                dataKey="hour" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                dy={10}
                label={{ value: 'Horas', position: 'insideBottom', offset: -10, fontSize: 12, fontWeight: 600, fill: '#6366f1' }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                tickFormatter={(value) => `${value}`}
                label={{ value: 'COP/kWh', angle: -90, position: 'insideLeft', offset: 10, fontSize: 12, fontWeight: 600, fill: '#6366f1' }}
              />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '16px', 
                  border: 'none', 
                  boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                  padding: '12px'
                }}
                itemStyle={{ fontSize: '12px', fontWeight: '600' }}
              />
              <Legend 
                verticalAlign="top" 
                align="right" 
                iconType="circle"
                wrapperStyle={{ paddingBottom: '20px', fontSize: '11px', fontWeight: '600' }}
              />
              {selectedMonths.map((month, idx) => (
                !month.loading && !month.error && month.data.length > 0 && (
                  <Line
                    key={month.id}
                    type="monotone"
                    dataKey={month.label}
                    stroke={colors[idx % colors.length]}
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2, fill: 'white' }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    animationDuration={1500}
                  />
                )
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-300 space-y-4">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center">
              <BarChart3 className="w-10 h-10" />
            </div>
            <p className="text-sm font-medium text-gray-400">Selecciona meses para visualizar la comparativa</p>
          </div>
        )}
      </div>
    </section>
  );
};
