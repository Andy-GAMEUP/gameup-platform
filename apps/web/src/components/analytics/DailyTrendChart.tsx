'use client'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'

interface DailyPoint {
  date: string
  dau: number
  newMembers: number
  payingUsers: number
  revenue: number
}

export default function DailyTrendChart({ data }: { data: DailyPoint[] }) {
  return (
    <div className="bg-bg-secondary border border-line rounded-lg p-6">
      <h3 className="text-lg font-bold mb-4">일별 추이</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 10 }} />
            <YAxis yAxisId="left" stroke="#9ca3af" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" tick={{ fontSize: 11 }} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line yAxisId="left" type="monotone" dataKey="dau" name="DAU" stroke="#10b981" strokeWidth={2} dot={false} />
            <Line yAxisId="left" type="monotone" dataKey="newMembers" name="신규" stroke="#3b82f6" strokeWidth={2} dot={false} />
            <Line yAxisId="right" type="monotone" dataKey="revenue" name="매출(₩)" stroke="#f59e0b" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
