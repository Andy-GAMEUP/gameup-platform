'use client'
import { useState } from 'react'
import { AlertCircle, ThumbsUp, MessageSquare, CheckCircle, XCircle, Clock, Search } from 'lucide-react'

// ── 타입 ─────────────────────────────────────────────────────────
type FeedbackType = '버그' | '제안' | '긍정'
type FeedbackStatus = '새로운' | '검토중' | '진행중' | '완료' | '거절됨'
type Priority = 'high' | 'medium' | 'low'

interface Feedback {
  id: number
  game: string
  user: string
  type: FeedbackType
  priority: Priority
  status: FeedbackStatus
  title: string
  description: string
  time: string
  votes: number
  replies: number
}

// ── 더미 데이터 ──────────────────────────────────────────────────
const feedbackData: Feedback[] = [
  {
    id: 1, game: 'Cyber Nexus', user: '김게이머', type: '버그', priority: 'high',
    status: '진행중', title: '레벨 15에서 캐릭터가 벽을 통과하는 버그',
    description: '특정 스킬 사용 후 벽을 통과할 수 있습니다.', time: '30분 전', votes: 24, replies: 5,
  },
  {
    id: 2, game: 'Stellar Warfare', user: '이플레이어', type: '제안', priority: 'medium',
    status: '검토중', title: '무기 밸런스 조정 제안',
    description: '현재 저격총이 너무 강력합니다. 데미지 조정이 필요할 것 같습니다.', time: '1시간 전', votes: 18, replies: 3,
  },
  {
    id: 3, game: 'Mystic Realms', user: '박유저', type: '긍정', priority: 'low',
    status: '완료', title: '스토리라인이 정말 흥미진진합니다!',
    description: '메인 퀘스트 스토리가 매우 잘 짜여져 있어요. 계속 플레이하고 싶게 만듭니다.', time: '2시간 전', votes: 45, replies: 12,
  },
  {
    id: 4, game: 'Racing Legends', user: '최테스터', type: '버그', priority: 'high',
    status: '새로운', title: '트랙 3에서 게임이 크래시됨',
    description: '트랙 3 진입 시 게임이 강제 종료됩니다.', time: '3시간 전', votes: 31, replies: 8,
  },
  {
    id: 5, game: 'Cyber Nexus', user: '정베타', type: '제안', priority: 'low',
    status: '거절됨', title: 'UI 개선 제안',
    description: '인벤토리 UI가 너무 복잡합니다. 단순화가 필요합니다.', time: '5시간 전', votes: 9, replies: 2,
  },
]

const GAMES = ['Cyber Nexus', 'Stellar Warfare', 'Mystic Realms', 'Racing Legends']

// ── 헬퍼 ─────────────────────────────────────────────────────────
const statusClass: Record<FeedbackStatus, string> = {
  '새로운':  'bg-blue-500/20 text-blue-400 border border-blue-500/50',
  '검토중':  'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50',
  '진행중':  'bg-purple-500/20 text-purple-400 border border-purple-500/50',
  '완료':    'bg-green-500/20 text-green-400 border border-green-500/50',
  '거절됨':  'bg-red-500/20 text-red-400 border border-red-500/50',
}

const typeClass: Record<FeedbackType, string> = {
  '버그': 'bg-red-500/20 text-red-400 border border-red-500/50',
  '제안': 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50',
  '긍정': 'bg-green-500/20 text-green-400 border border-green-500/50',
}

const priorityColor: Record<Priority, string> = {
  high:   'text-red-400',
  medium: 'text-yellow-400',
  low:    'text-blue-400',
}

// ── 통계 수치 ─────────────────────────────────────────────────────
const STATS = [
  { label: '총 피드백', value: '3,842', color: 'text-white' },
  { label: '새로운',   value: '892',   color: 'text-blue-400' },
  { label: '검토중',   value: '645',   color: 'text-yellow-400' },
  { label: '진행중',   value: '1,234', color: 'text-purple-400' },
  { label: '완료',     value: '1,071', color: 'text-green-400' },
]

// ── 피드백 카드 ───────────────────────────────────────────────────
function FeedbackCard({
  feedback,
  onApprove,
  onReview,
  onReject,
}: {
  feedback: Feedback
  onApprove: (id: number) => void
  onReview: (id: number) => void
  onReject: (id: number) => void
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 hover:border-green-500/50 transition-colors rounded-lg p-6">
      <div className="flex items-start gap-4">
        {/* 우선순위 아이콘 */}
        <AlertCircle className={`w-5 h-5 mt-1 flex-shrink-0 ${priorityColor[feedback.priority]}`} />

        <div className="flex-1 min-w-0">
          {/* 제목 + 배지 */}
          <h3 className="font-semibold mb-2">{feedback.title}</h3>
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="text-xs px-2 py-0.5 rounded-full border border-green-500/50 text-green-400">
              {feedback.game}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${typeClass[feedback.type]}`}>
              {feedback.type}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${statusClass[feedback.status]}`}>
              {feedback.status}
            </span>
          </div>

          <p className="text-sm text-slate-400 mb-4">{feedback.description}</p>

          {/* 하단 메타 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <span className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center text-xs font-bold">
                {feedback.user[0]}
              </span>
              <span>{feedback.user}</span>
              <span>•</span>
              <span>{feedback.time}</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-400">
              <span className="flex items-center gap-1"><ThumbsUp className="w-4 h-4" />{feedback.votes}</span>
              <span className="flex items-center gap-1"><MessageSquare className="w-4 h-4" />{feedback.replies}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 새로운 항목 액션 버튼 */}
      {feedback.status === '새로운' && (
        <div className="flex gap-2 mt-4 pt-4 border-t border-slate-800">
          <button
            onClick={() => onApprove(feedback.id)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-600 hover:bg-green-700 rounded-md transition-colors"
          >
            <CheckCircle className="w-4 h-4" /> 승인
          </button>
          <button
            onClick={() => onReview(feedback.id)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm border border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10 rounded-md transition-colors"
          >
            <Clock className="w-4 h-4" /> 검토
          </button>
          <button
            onClick={() => onReject(feedback.id)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm border border-red-500/50 text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
          >
            <XCircle className="w-4 h-4" /> 거절
          </button>
        </div>
      )}
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────
type TabKey = 'all' | 'bugs' | 'suggestions' | 'positive'

export default function FeedbackManagementPage() {
  const [items, setItems] = useState<Feedback[]>(feedbackData)
  const [search, setSearch] = useState('')
  const [filterGame, setFilterGame] = useState('all')
  const [activeTab, setActiveTab] = useState<TabKey>('all')

  const updateStatus = (id: number, status: FeedbackStatus) => {
    setItems(prev => prev.map(f => f.id === id ? { ...f, status } : f))
  }

  const filtered = items.filter(f => {
    const matchSearch = f.title.toLowerCase().includes(search.toLowerCase()) ||
                        f.user.toLowerCase().includes(search.toLowerCase())
    const matchGame = filterGame === 'all' || f.game === filterGame
    return matchSearch && matchGame
  })

  const tabFiltered = filtered.filter(f => {
    if (activeTab === 'bugs')        return f.type === '버그'
    if (activeTab === 'suggestions') return f.type === '제안'
    if (activeTab === 'positive')    return f.type === '긍정'
    return true
  })

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'all',         label: '전체' },
    { key: 'bugs',        label: '버그' },
    { key: 'suggestions', label: '제안' },
    { key: 'positive',    label: '긍정' },
  ]

  return (
    <div className="space-y-6 p-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold mb-1">피드백 관리</h1>
        <p className="text-slate-400">테스터 피드백과 버그 리포트를 관리하세요</p>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {STATS.map(s => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className={`text-2xl font-bold mb-1 ${s.color}`}>{s.value}</div>
            <div className="text-sm text-slate-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* 필터 */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="피드백 검색..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm focus:outline-none focus:border-green-500"
            />
          </div>
          <select
            value={filterGame}
            onChange={e => setFilterGame(e.target.value)}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-md text-sm focus:outline-none focus:border-green-500"
          >
            <option value="all">모든 게임</option>
            {GAMES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 w-fit">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`px-4 py-2 text-sm rounded-md transition-colors ${
              activeTab === t.key
                ? 'bg-green-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 피드백 목록 */}
      <div className="space-y-4">
        {tabFiltered.length > 0 ? (
          tabFiltered.map(f => (
            <FeedbackCard
              key={f.id}
              feedback={f}
              onApprove={id => updateStatus(id, '진행중')}
              onReview={id => updateStatus(id, '검토중')}
              onReject={id => updateStatus(id, '거절됨')}
            />
          ))
        ) : (
          <div className="text-center py-12 text-slate-400">검색 결과가 없습니다.</div>
        )}
      </div>
    </div>
  )
}
