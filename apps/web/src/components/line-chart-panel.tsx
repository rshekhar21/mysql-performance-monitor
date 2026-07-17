import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import type { TimeSeriesPoint } from '@mysql-monitor/types';

export function LineChartPanel({
  title,
  unit,
  data,
  series
}: {
  title: string;
  unit: string;
  data: TimeSeriesPoint[];
  series: Array<{ key: string; label: string; color: string }>;
}) {
  return (
    <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        <span className="text-xs text-muted">{unit}</span>
      </div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="collectedAt"
              tickFormatter={(value: string) =>
                new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(
                  new Date(value)
                )
              }
              tick={{ fontSize: 12 }}
            />
            <YAxis tick={{ fontSize: 12 }} width={56} />
            <Tooltip
              labelFormatter={(value) =>
                new Intl.DateTimeFormat(undefined, {
                  dateStyle: 'short',
                  timeStyle: 'medium'
                }).format(new Date(String(value)))
              }
            />
            <Legend />
            {series.map((item) => (
              <Line
                key={item.key}
                type="monotone"
                dataKey={item.key}
                name={item.label}
                stroke={item.color}
                strokeWidth={2}
                dot={false}
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
