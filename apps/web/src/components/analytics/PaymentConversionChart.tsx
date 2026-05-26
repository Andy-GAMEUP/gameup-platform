'use client'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { DailyPoint } from '@/services/analyticsService'

export default function PaymentConversionChart({ data }: { data: DailyPoint[] }) {
  const chartData = data.map(d => ({
    date: d.date,
    pur:  d.dau > 0 ? Number(((d.payingUsers / d.dau) * 100).toFixed(2)) : 0,
  }))

  return (
    <div className="bg-bg-secondary border border-line rounded-lg p-6">
      <h3 className="text-lg font-bold mb-4">결제 전환율</h3>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 0, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 10 }} />
            <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} width={52} tickFormatter={v => `${v}%`} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }}
              formatter={(v) => [`${v}%`, '결제 전환율']}
            />
            <Line type="monotone" dataKey="pur" name="결제 전환율" stroke="#f59e0b" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
