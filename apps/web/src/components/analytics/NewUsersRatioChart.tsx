'use client'
import { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { DailyPoint } from '@/services/analyticsService'
import { DUMMY_NEW_USERS_DAILY } from './newUsersDummy'

const fmt = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}`

export default function NewUsersRatioChart({ data }: { data: DailyPoint[] }) {
  const hasReal = data.some(d => d.newMembers > 0 || d.dau > 0)
  const source  = hasReal ? data : DUMMY_NEW_USERS_DAILY
  const isDummy = !hasReal

  const ratioData = useMemo(() =>
    source.map(d => ({
      date:  fmt(new Date(d.date)),
      ratio: d.dau > 0 ? Math.round((d.newMembers / d.dau) * 1000) / 10 : 0,
    })),
  [source])

  return (
    <div className="bg-bg-secondary border border-line rounded-lg p-5 h-full flex flex-col">
      <h3 className="text-base font-bold mb-4">
        신규 유저 비율
        <span className="ml-1.5 text-xs font-normal text-text-secondary">(신규 가입 / DAU)</span>
        {isDummy && <span className="ml-1.5 text-xs font-normal text-text-muted">(더미)</span>}
      </h3>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={ratioData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis
              dataKey="date"
              stroke="#9ca3af"
              tick={{ fontSize: 9 }}
              interval={Math.max(0, Math.floor(ratioData.length / 8))}
            />
            <YAxis
              stroke="#9ca3af"
              tick={{ fontSize: 10 }}
              width={36}
              tickFormatter={v => `${v}%`}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#111827', border: '1px solid #4b5563', borderRadius: 8, fontSize: 11 }}
              labelStyle={{ color: '#f9fafb', fontWeight: 600 }}
              formatter={(v) => [`${v}%`, '신규 비율']}
            />
            <Line type="monotone" dataKey="ratio" stroke="#10b981" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
