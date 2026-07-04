import React from 'react';
import { ResponsiveContainer, LineChart, Line, ReferenceLine, Tooltip } from 'recharts';
import type { GlucoseReading } from '@/entities';
import { readingsToChartPoints } from '@/utils/glucose';

interface GlucoseMiniChartProps {
  readings: GlucoseReading[];
  targetMin: number;
  targetMax: number;
}

const CustomDot = (props: { cx?: number; cy?: number; payload?: { status: string } }) => {
  const { cx, cy, payload } = props;
  if (!cx || !cy || !payload) return null;
  
  const colors: Record<string, string> = {
    normal: '#22c55e',
    low: '#f59e0b',
    high: '#f59e0b',
    hypo: '#ef4444',
    severe_hypo: '#dc2626',
    hyper: '#ef4444',
    severe_hyper: '#dc2626',
  };
  
  const color = colors[payload.status] ?? '#22c55e';
  return <circle cx={cx} cy={cy} r={3} fill={color} stroke="none" />;
};

export const GlucoseMiniChart: React.FC<GlucoseMiniChartProps> = ({
  readings,
  targetMin,
  targetMax,
}) => {
  const points = readingsToChartPoints(readings);
  
  if (points.length === 0) return null;
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={points} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        <ReferenceLine
          y={targetMin}
          stroke="rgba(34,197,94,0.25)"
          strokeDasharray="3 3"
          strokeWidth={1}
        />
        <ReferenceLine
          y={targetMax}
          stroke="rgba(34,197,94,0.25)"
          strokeDasharray="3 3"
          strokeWidth={1}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0].payload;
            return (
              <div style={{
                background: 'var(--color-bg-overlay)',
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                padding: '6px 10px',
                fontSize: 12,
                color: 'var(--color-text-primary)',
              }}>
                <div style={{ fontWeight: 700 }}>{d.value} mg/dL</div>
                <div style={{ color: 'var(--color-text-muted)' }}>{d.time}</div>
              </div>
            );
          }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#22c55e"
          strokeWidth={2}
          dot={<CustomDot />}
          activeDot={{ r: 5, fill: '#22c55e' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
