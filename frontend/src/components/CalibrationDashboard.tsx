import React, { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts';
import { AlertTriangle, TrendingUp, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { CalibrationHeatmap, InflationAlert } from '../services/employeeEvaluationService';

interface CalibrationDashboardProps {
  data: CalibrationHeatmap;
  month: number;
  year: number;
}

const SCORE_BANDS = [
  { key: 'd0_20', label: '0-20', color: '#ef4444' },
  { key: 'd21_40', label: '21-40', color: '#f97316' },
  { key: 'd41_60', label: '41-60', color: '#eab308' },
  { key: 'd61_80', label: '61-80', color: '#22c55e' },
  { key: 'd81_100', label: '81-100', color: '#3b82f6' },
];

const InflationAlertBanner: React.FC<{ alerts: InflationAlert[] }> = ({ alerts }) => {
  const [expanded, setExpanded] = useState(false);

  if (alerts.length === 0) return null;

  return (
    <div className="border border-orange-300 bg-orange-50 rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-600" />
          <span className="text-sm font-semibold text-orange-800">
            Cảnh báo điểm lạm phát ({alerts.length} quản lý)
          </span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-orange-500" /> : <ChevronDown className="w-4 h-4 text-orange-500" />}
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-2">
          {alerts.map(alert => (
            <div key={alert.supervisorId} className="flex items-center justify-between text-sm bg-white border border-orange-200 rounded p-2">
              <div>
                <span className="font-medium text-gray-800">{alert.supervisorName}</span>
                <span className="text-xs text-gray-500 ml-1">— {alert.departmentName}</span>
              </div>
              <div className="text-right">
                <span className="text-orange-700 font-semibold">{alert.inflationRate.toFixed(1)}%</span>
                <span className="text-xs text-gray-400 ml-1">trên P80</span>
                <span className="text-xs text-gray-400 ml-2">(n={alert.sampleSize})</span>
              </div>
            </div>
          ))}
          <p className="text-xs text-gray-500 mt-1">
            Cảnh báo khi &gt;70% điểm của cấp dưới nằm trên P80 phòng ban, với ít nhất 5 người.
          </p>
        </div>
      )}
    </div>
  );
};

const EMPTY_DIST = { d0_20: 0, d21_40: 0, d41_60: 0, d61_80: 0, d81_100: 0 };

const CalibrationDashboard: React.FC<CalibrationDashboardProps> = ({ data, month, year }) => {
  const supervisors = data.supervisors ?? [];
  const departmentBenchmarks = data.departmentBenchmarks ?? [];
  const trend = data.trend ?? [];
  const inflationAlerts = data.inflationAlerts ?? [];

  // Build heatmap data for stacked bar chart
  const heatmapChartData = supervisors.map(sup => {
    const dist = sup.distribution ?? EMPTY_DIST;
    return {
      name: sup.supervisorName.split(' ').slice(-1)[0], // Last name for brevity
      fullName: sup.supervisorName,
      n: sup.subordinateCount,
      avgScore: sup.avgScore,
      ...SCORE_BANDS.reduce((acc, band) => {
        acc[band.key] = dist[band.key as keyof typeof dist] ?? 0;
        return acc;
      }, {} as Record<string, number>),
    };
  });

  const trendChartData = trend.map(t => ({
    period: t.period,
    avgScore: Number(t.avgScore.toFixed(1)),
    completionRate: Number(t.completionRate.toFixed(1)),
  }));

  const formatPeriod = (period: string) => {
    const [y, m] = period.split('-');
    return `T${m}/${y}`;
  };

  return (
    <div className="space-y-6">
      {/* Inflation alert banner */}
      <InflationAlertBanner alerts={inflationAlerts} />

      {/* Heatmap — supervisor × score distribution */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-blue-600" />
          <h4 className="text-sm font-semibold text-gray-800">
            Phân bố điểm theo quản lý — Tháng {month}/{year}
          </h4>
        </div>

        {supervisors.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Chưa có dữ liệu.</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={heatmapChartData} margin={{ top: 4, right: 16, left: 0, bottom: 24 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#6b7280' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} tickLine={false} axisLine={false} />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const entry = heatmapChartData.find(d => d.name === label);
                    return (
                      <div className="bg-white border border-gray-200 rounded shadow-md p-3 text-xs">
                        <p className="font-semibold text-gray-800 mb-1">{entry?.fullName}</p>
                        <p className="text-gray-500 mb-1">n={entry?.n} — TB: {entry?.avgScore?.toFixed(1)}</p>
                        {SCORE_BANDS.map(band => {
                          const val = payload.find(p => p.dataKey === band.key)?.value ?? 0;
                          return val > 0 ? (
                            <p key={band.key} style={{ color: band.color }}>
                              {band.label}: {val} người
                            </p>
                          ) : null;
                        })}
                      </div>
                    );
                  }}
                />
                {SCORE_BANDS.map(band => (
                  <Bar key={band.key} dataKey={band.key} stackId="a" fill={band.color} name={band.label} />
                ))}
              </BarChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="flex flex-wrap gap-3 mt-2 justify-center">
              {SCORE_BANDS.map(band => (
                <div key={band.key} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm" style={{ background: band.color }} />
                  <span className="text-xs text-gray-600">{band.label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Department benchmarks */}
      {departmentBenchmarks.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h4 className="text-sm font-semibold text-gray-800 mb-3">Chuẩn phòng ban (P20 / P50 / P80)</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Phòng ban</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-600">P20</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-600">P50</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-600">P80</th>
                </tr>
              </thead>
              <tbody>
                {departmentBenchmarks.map(bench => (
                  <tr key={bench.departmentName} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-800">{bench.departmentName}</td>
                    <td className="px-3 py-2 text-center text-gray-700">{bench.p20.toFixed(1)}</td>
                    <td className="px-3 py-2 text-center font-medium text-gray-800">{bench.p50.toFixed(1)}</td>
                    <td className="px-3 py-2 text-center text-blue-700">{bench.p80.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 12-period trend chart */}
      {trendChartData.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <h4 className="text-sm font-semibold text-gray-800">Xu hướng 12 kỳ gần nhất</h4>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendChartData} margin={{ top: 4, right: 16, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis
                dataKey="period"
                tickFormatter={formatPeriod}
                tick={{ fontSize: 10, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="score"
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                yAxisId="rate"
                orientation="right"
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(value, name) => [
                  `${value}${name === 'avgScore' ? '' : '%'}`,
                  name === 'avgScore' ? 'Điểm TB' : 'Tỷ lệ hoàn thành',
                ]}
                labelFormatter={formatPeriod}
              />
              <Legend
                formatter={(value) => value === 'avgScore' ? 'Điểm TB' : 'Tỷ lệ HT (%)'}
              />
              <Line
                yAxisId="score"
                type="monotone"
                dataKey="avgScore"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
              <Line
                yAxisId="rate"
                type="monotone"
                dataKey="completionRate"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ r: 3 }}
                strokeDasharray="4 2"
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default CalibrationDashboard;
