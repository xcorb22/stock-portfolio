import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { compactUsd, usd } from '../lib/format'

const shortDate = (d) =>
  new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

// data: [{ date, value, cost }] sorted ascending by date.
export default function PerformanceChart({ data }) {
  if (data.length < 2) {
    return (
      <p className="muted small">
        📈 Your value is recorded each day you open the dashboard. The chart appears once there are
        at least two days of history — check back tomorrow!
      </p>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="valueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#232a3a" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={shortDate}
          stroke="#8b93a7"
          fontSize={12}
          tickMargin={8}
        />
        <YAxis
          tickFormatter={(v) => compactUsd(v)}
          stroke="#8b93a7"
          fontSize={12}
          width={64}
          domain={['auto', 'auto']}
        />
        <Tooltip
          contentStyle={{ background: '#1c2230', border: '1px solid #232a3a', borderRadius: 10 }}
          labelFormatter={(d) => shortDate(d)}
          formatter={(v, name) => [usd(v), name === 'value' ? 'Value' : 'Cost']}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="#6366f1"
          strokeWidth={2}
          fill="url(#valueFill)"
        />
        <Line type="monotone" dataKey="cost" stroke="#8b93a7" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
