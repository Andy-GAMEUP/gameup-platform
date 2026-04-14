'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface RetentionPoint { day: number; rate: number; cohortSize: number }

export default function RetentionChart({ data }: { data: RetentionPoint[] }) {
  const chartData = data.map(d => ({ name: `D+${d.day}`, rate: d.rate }))
  const cohortSize = data[0]?.cohortSize || 0

  return (
    <div className="bg-bg-secondary border border-line rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold">유저 리텐션 (D+0 ~ D+30)</h3>
          <p className="text-xs text-text-secondary mt-1">코호트 크기: {cohortSize.toLocaleString()}명</p>
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
            <XAxis dataKey="name" stroke="#9ca3af" tick={{ fontSize: 11 }} interval={1} />
            <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} unit="%" />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
              formatter={(v) => [`${v}%`, '리텐션']}
            />
            <Bar dataKey="rate" fill="#10b981" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
