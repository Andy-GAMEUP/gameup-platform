'use client'
import { useState } from 'react'
import { Search, Download, UserCheck, UserX, MessageSquare, Star } from 'lucide-react'

type TesterStatus = '승인됨' | '대기중' | '거절됨'

interface Tester {
  id: number
  name: string
  email: string
  game: string
  status: TesterStatus
  feedback: number
  bugs: number
  rating: number
  joinDate: string
}

const initialTesters: Tester[] = [
  { id: 1, name: '김게이머',   email: 'gamer@example.com',  game: 'Cyber Nexus',     status: '승인됨', feedback: 45, bugs: 12, rating: 4.8, joinDate: '2026-01-20' },
  { id: 2, name: '이플레이어', email: 'player@example.com', game: 'Stellar Warfare', status: '승인됨', feedback: 32, bugs: 8,  rating: 4.5, joinDate: '2026-01-22' },
  { id: 3, name: '박유저',     email: 'user@example.com',   game: 'Mystic Realms',   status: '대기중', feedback: 0,  bugs: 0,  rating: 0,   joinDate: '2026-02-01' },
  { id: 4, name: '최테스터',   email: 'tester@example.com', game: 'Racing Legends',  status: '승인됨', feedback: 67, bugs: 23, rating: 4.9, joinDate: '2026-01-15' },
  { id: 5, name: '정베타',     email: 'beta@example.com',   game: 'Cyber Nexus',     status: '거절됨', feedback: 0,  bugs: 0,  rating: 0,   joinDate: '2026-01-28' },
]

const GAMES = ['Cyber Nexus', 'Stellar Warfare', 'Mystic Realms', 'Racing Legends']

const statusClass: Record<TesterStatus, string> = {
  '승인됨': 'bg-accent-light text-accent border border-accent-muted',
  '대기중': 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50',
  '거절됨': 'bg-red-500/20 text-red-400 border border-red-500/50',
}

const STATS = [
  { label: '총 테스터', value: '12,450', color: 'text-text-primary' },
  { label: '승인됨',   value: '10,230', color: 'text-accent' },
  { label: '대기중',   value: '1,850',  color: 'text-yellow-400' },
  { label: '거절됨',   value: '370',    color: 'text-red-400' },
]

export default function TesterManagementPage() {
  const [testers, setTesters] = useState<Tester[]>(initialTesters)
  const [search, setSearch] = useState('')
  const [filterGame, setFilterGame] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  const updateStatus = (id: number, status: TesterStatus) => {
    setTesters(prev => prev.map(t => t.id === id ? { ...t, status } : t))
  }

  const filtered = testers.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
                        t.email.toLowerCase().includes(search.toLowerCase())
    const matchGame   = filterGame   === 'all' || t.game   === filterGame
    const matchStatus = filterStatus === 'all' || t.status === filterStatus
    return matchSearch && matchGame && matchStatus
  })

  const handleExportCSV = () => {
    const headers = ['이름', '이메일', '게임', '상태', '피드백', '버그', '평점', '가입일']
    const rows = filtered.map(t =>
      [t.name, t.email, t.game, t.status, t.feedback, t.bugs, t.rating || '-', t.joinDate].join(',')
    )
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = 'testers.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold mb-1">테스터 관리</h1>
        <p className="text-text-secondary">베타 테스터 신청을 검토하고 관리하세요</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STATS.map(s => (
          <div key={s.label} className="bg-bg-secondary border border-line rounded-lg p-4">
            <div className={`text-2xl font-bold mb-1 ${s.color}`}>{s.value}</div>
            <div className="text-sm text-text-secondary">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-bg-secondary border border-line rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
            <input type="text" placeholder="테스터 검색..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-bg-tertiary border border-line rounded-md text-sm focus:outline-none focus:border-accent" />
          </div>
          <select value={filterGame} onChange={e => setFilterGame(e.target.value)}
            className="w-full px-3 py-2 bg-bg-tertiary border border-line rounded-md text-sm focus:outline-none focus:border-accent">
            <option value="all">모든 게임</option>
            {GAMES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2 bg-bg-tertiary border border-line rounded-md text-sm focus:outline-none focus:border-accent">
            <option value="all">모든 상태</option>
            <option value="승인됨">승인됨</option>
            <option value="대기중">대기중</option>
            <option value="거절됨">거절됨</option>
          </select>
        </div>
      </div>

      <div className="bg-bg-secondary border border-line rounded-lg overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-line">
          <h2 className="text-lg font-semibold">테스터 목록 ({filtered.length})</h2>
          <button onClick={handleExportCSV}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-line rounded-md hover:bg-bg-tertiary transition-colors">
            <Download className="w-4 h-4" /> CSV 내보내기
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line text-left">
                {['테스터', '게임', '상태', '피드백', '버그 리포트', '평점', '가입일', '작업'].map(h => (
                  <th key={h} className="px-4 py-3 text-sm text-text-secondary font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(tester => (
                <tr key={tester.id} className="border-b border-line hover:bg-bg-tertiary/30 transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {tester.name[0]}
                      </div>
                      <div>
                        <div className="font-semibold">{tester.name}</div>
                        <div className="text-sm text-text-secondary">{tester.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="text-xs px-2 py-1 rounded-full border border-accent-muted text-accent">{tester.game}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${statusClass[tester.status]}`}>{tester.status}</span>
                  </td>
                  <td className="px-4 py-4">
                    <span className="flex items-center gap-1 text-text-secondary text-sm">
                      <MessageSquare className="w-4 h-4" />{tester.feedback}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-text-secondary text-sm">{tester.bugs}</td>
                  <td className="px-4 py-4">
                    {tester.rating > 0
                      ? <span className="flex items-center gap-1 text-sm"><Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />{tester.rating}</span>
                      : <span className="text-text-muted">-</span>}
                  </td>
                  <td className="px-4 py-4 text-text-secondary text-sm">{tester.joinDate}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      {tester.status === '대기중' && (
                        <>
                          <button onClick={() => updateStatus(tester.id, '승인됨')}
                            className="flex items-center gap-1 px-2 py-1.5 text-xs bg-accent hover:bg-accent-hover rounded-md transition-colors">
                            <UserCheck className="w-3 h-3" /> 승인
                          </button>
                          <button onClick={() => updateStatus(tester.id, '거절됨')}
                            className="flex items-center gap-1 px-2 py-1.5 text-xs border border-red-500/50 text-red-400 hover:bg-red-500/10 rounded-md transition-colors">
                            <UserX className="w-3 h-3" /> 거절
                          </button>
                        </>
                      )}
                      {tester.status === '승인됨' && (
                        <button className="px-2 py-1.5 text-xs border border-line rounded-md hover:bg-bg-tertiary transition-colors">
                          상세보기
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-text-secondary">검색 결과가 없습니다.</div>
        )}
      </div>
    </div>
  )
}
