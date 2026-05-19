import * as XLSX from 'xlsx'

export interface RetentionPoint { day: number; rate: number; cohortSize: number }
export interface DailyPoint { date: string; dau: number; newMembers: number; payingUsers: number; revenue: number; avgSession?: number; avgSessionPayer?: number; avgSessionNonPayer?: number }

export interface GameAnalyticsExportData {
  gameTitle: string
  from: string
  to: string
  cumulativeMembers: number
  newMembers: number
  avgDau: number
  mau: number
  pur: number
  arppu: number
  arpu: number
  totalRevenue: number
  payingUsers: number
  daily: DailyPoint[]
  retention: RetentionPoint[]
}

export function buildAnalyticsWorkbook(data: GameAnalyticsExportData): Buffer {
  const wb = XLSX.utils.book_new()

  // Sheet 1: Overview
  const overviewRows = [
    { 항목: '게임명', 값: data.gameTitle },
    { 항목: '기간', 값: `${data.from} ~ ${data.to}` },
    { 항목: '누적 회원', 값: data.cumulativeMembers },
    { 항목: '신규 가입', 값: data.newMembers },
    { 항목: 'DAU(평균)', 값: data.avgDau },
    { 항목: 'MAU', 값: data.mau },
    { 항목: 'PUR(%)', 값: data.pur },
    { 항목: 'ARPPU', 값: data.arppu },
    { 항목: 'ARPU', 값: data.arpu },
    { 항목: '총 매출', 값: data.totalRevenue },
    { 항목: '결제 유저 수', 값: data.payingUsers },
  ]
  const overviewSheet = XLSX.utils.json_to_sheet(overviewRows)
  XLSX.utils.book_append_sheet(wb, overviewSheet, 'Overview')

  // Sheet 2: Daily timeseries
  const dailyRows = data.daily.map(d => ({
    날짜: d.date,
    DAU: d.dau,
    '신규 가입': d.newMembers,
    '결제 유저': d.payingUsers,
    매출: d.revenue,
  }))
  const dailySheet = XLSX.utils.json_to_sheet(dailyRows.length ? dailyRows : [{ 날짜: '-', DAU: 0, '신규 가입': 0, '결제 유저': 0, 매출: 0 }])
  XLSX.utils.book_append_sheet(wb, dailySheet, 'Daily')

  // Sheet 3: Retention
  const retentionRows = data.retention.map(r => ({
    Day: `D+${r.day}`,
    'Retention(%)': r.rate,
    '코호트 크기': r.cohortSize,
  }))
  const retentionSheet = XLSX.utils.json_to_sheet(retentionRows.length ? retentionRows : [{ Day: '-', 'Retention(%)': 0, '코호트 크기': 0 }])
  XLSX.utils.book_append_sheet(wb, retentionSheet, 'Retention')

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

export interface DashboardDailyPoint { date: string; revenue: number; dau: number }
export interface DashboardGameRow {
  title: string
  serviceType?: string
  monetization?: string
  revenue: number
  activeUsers: number
  avgDau: number
  pur: number
  arppu: number
  newMembers: number
  cumulativeMembers: number
}
export interface DashboardExportData {
  from: string
  to: string
  summary: { totalRevenue: number; totalActiveUsers: number; totalNewMembers: number; avgPUR: number }
  daily: DashboardDailyPoint[]
  games: DashboardGameRow[]
}

const monetizationLabel = (m?: string) =>
  ({ free: '무료', ad: '광고', paid: '유료', freemium: '프리미엄' }[m || 'free'] || '무료')

export function buildDashboardWorkbook(data: DashboardExportData): Buffer {
  const wb = XLSX.utils.book_new()

  const summaryRows = [
    { 항목: '기간', 값: `${data.from} ~ ${data.to}` },
    { 항목: '총 매출', 값: data.summary.totalRevenue },
    { 항목: '활성 유저', 값: data.summary.totalActiveUsers },
    { 항목: '신규 유저', 값: data.summary.totalNewMembers },
    { 항목: '평균 PUR(%)', 값: data.summary.avgPUR },
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), '요약')

  const dailyRows = data.daily.map(d => ({ 날짜: d.date, 매출: d.revenue, DAU: d.dau }))
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(dailyRows.length ? dailyRows : [{ 날짜: '-', 매출: 0, DAU: 0 }]),
    '일별'
  )

  const gameRows = data.games.map(g => ({
    게임명: g.title,
    서비스: g.serviceType === 'live' ? '라이브' : '베타',
    수익화: monetizationLabel(g.monetization),
    매출: g.revenue,
    '활성 유저': g.activeUsers,
    '평균 DAU': g.avgDau,
    'PUR(%)': g.pur,
    ARPPU: g.arppu,
    '신규 가입': g.newMembers,
    '누적 회원': g.cumulativeMembers,
  }))
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(gameRows.length ? gameRows : [{}]),
    '게임별'
  )

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}
