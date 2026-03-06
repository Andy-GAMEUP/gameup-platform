export function formatDate(date: Date | string, format: 'full' | 'short' | 'date-only' = 'short'): string {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hours = String(d.getHours()).padStart(2, '0')
  const minutes = String(d.getMinutes()).padStart(2, '0')

  switch (format) {
    case 'full':
      return `${year}년 ${month}월 ${day}일 ${hours}:${minutes}`
    case 'short':
      return `${year}.${month}.${day} ${hours}:${minutes}`
    case 'date-only':
      return `${year}.${month}.${day}`
  }
}

export function formatRelativeTime(date: Date | string): string {
  const now = Date.now()
  const diff = now - new Date(date).getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  if (hours < 24) return `${hours}시간 전`
  if (days < 7) return `${days}일 전`
  return formatDate(date, 'date-only')
}
