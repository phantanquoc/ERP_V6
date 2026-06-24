import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface TrendPoint {
  month: string; // 'YYYY-MM'
  count: number;
}

interface FaultTrendChartProps {
  data: TrendPoint[];
}

// Format 'YYYY-MM' → 'Th.M/YYYY' for display on X-axis
const formatMonth = (value: string): string => {
  const [year, month] = value.split('-');
  return `Th.${parseInt(month, 10)}/${year?.slice(2)}`;
};

const FaultTrendChart = ({ data }: FaultTrendChartProps) => {
  if (!data || data.length === 0) {
    return (
      <p className="text-sm text-gray-400">Chưa có dữ liệu xu hướng.</p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 4, right: 16, left: -8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis
          dataKey="month"
          tickFormatter={formatMonth}
          tick={{ fontSize: 11, fill: '#6b7280' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: '#6b7280' }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          formatter={(value: number) => [value, 'Số lỗi']}
          labelFormatter={(label: string) => formatMonth(label)}
          contentStyle={{ fontSize: 12, borderRadius: 6 }}
        />
        <Line
          type="monotone"
          dataKey="count"
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ r: 3, fill: '#3b82f6' }}
          activeDot={{ r: 5 }}
          name="Số lỗi"
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default FaultTrendChart;
