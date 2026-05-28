import { DailyPoint } from '@/services/analyticsService'

const DAY = 86400000

export const DUMMY_NEW_USERS_DAILY: DailyPoint[] = Array.from({ length: 30 }, (_, i) => {
  const d    = new Date(Date.now() - (29 - i) * DAY)
  const date = d.toISOString().split('T')[0]

  const wave      = Math.sin(i / 4.2) * 0.3 + Math.sin(i / 1.7) * 0.12
  const dau       = Math.round(3200 + wave * 900 + i * 18)
  const newM      = Math.round(180 + wave * 80 + Math.sin(i * 0.9) * 40)
  const paying    = Math.round(dau * (0.055 + Math.sin(i * 1.3) * 0.012))
  const revenue   = paying * Math.round(12000 + Math.sin(i * 2.1) * 3000)
  const avgSession = Math.round(520 + Math.sin(i * 0.7) * 180)

  return { date, dau, newMembers: newM, payingUsers: paying, revenue, avgSession }
})

export const DUMMY_CUMULATIVE = 24800
