'use client'
import { useState, useEffect, useCallback } from 'react'
import { AlertCircle, ThumbsUp, MessageSquare, CheckCircle, XCircle, Clock, Search, Send, Loader2, HelpCircle } from 'lucide-react'
import { gameService } from '@/services/gameService'

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

interface GameQA {
  _id: string
  gameId: { _id: string; title: string } | string
  userId: { _id: string; username: string; email: string } | string
  question: string
  answer?: string
  answeredAt?: string
  isPublic: boolean
  createdAt: string
  updatedAt: string
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
  '완료':    'bg-accent-light text-accent border border-accent-muted',
  '거절됨':  'bg-red-500/20 text-red-400 border border-red-500/50',
}

const typeClass: Record<FeedbackType, string> = {
  '버그': 'bg-red-500/20 text-red-400 border border-red-500/50',
  '제안': 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50',
  '긍정': 'bg-accent-light text-accent border border-accent-muted',
}

const priorityColor: Record<Priority, string> = {
  high:   'text-red-400',
  medium: 'text-yellow-400',
  low:    'text-blue-400',
}

// ── 통계 수치 ─────────────────────────────────────────────────────
const STATS = [
  { label: '총 피드백', value: '3,842', color: 'text-text-primary' },
  { label: '새로운',   value: '892',   color: 'text-blue-400' },
  { label: '검토중',   value: '645',   color: 'text-yellow-400' },
  { label: '진행중',   value: '1,234', color: 'text-purple-400' },
  { label: '완료',     value: '1,071', color: 'text-accent' },
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
    <div className="bg-bg-secondary border border-line hover:border-accent-muted transition-colors rounded-lg p-6">
      <div className="flex items-start gap-4">
        {/* 우선순위 아이콘 */}
        <AlertCircle className={`w-5 h-5 mt-1 flex-shrink-0 ${priorityColor[feedback.priority]}`} />

        <div className="flex-1 min-w-0">
          {/* 제목 + 배지 */}
          <h3 className="font-semibold mb-2">{feedback.title}</h3>
          <div className="flex flex-wrap gap-2 mb-3">
            <span className="text-xs px-2 py-0.5 rounded-full border border-accent-muted text-accent">
              {feedback.game}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${typeClass[feedback.type]}`}>
              {feedback.type}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${statusClass[feedback.status]}`}>
              {feedback.status}
            </span>
          </div>

          <p className="text-sm text-text-secondary mb-4">{feedback.description}</p>

          {/* 하단 메타 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm text-text-secondary">
              <span className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-xs font-bold">
                {feedback.user[0]}
              </span>
              <span>{feedback.user}</span>
              <span>•</span>
              <span>{feedback.time}</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-text-secondary">
              <span className="flex items-center gap-1"><ThumbsUp className="w-4 h-4" />{feedback.votes}</span>
              <span className="flex items-center gap-1"><MessageSquare className="w-4 h-4" />{feedback.replies}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 새로운 항목 액션 버튼 */}
      {feedback.status === '새로운' && (
        <div className="flex gap-2 mt-4 pt-4 border-t border-line">
          <button
            onClick={() => onApprove(feedback.id)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-accent hover:bg-accent-hover rounded-md transition-colors"
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
type SectionTab = 'feedback' | 'qa'
type TabKey = 'all' | 'bugs' | 'suggestions' | 'positive'
type QAFilter = 'all' | 'unanswered' | 'answered'

export default function FeedbackManagementPage() {
  const [sectionTab, setSectionTab] = useState<SectionTab>('feedback')

  // ── 피드백 상태 ──
  const [items, setItems] = useState<Feedback[]>(feedbackData)
  const [search, setSearch] = useState('')
  const [filterGame, setFilterGame] = useState('all')
  const [activeTab, setActiveTab] = useState<TabKey>('all')

  // ── Q&A 상태 ──
  const [qas, setQas] = useState<GameQA[]>([])
  const [qaTotal, setQaTotal] = useState(0)
  const [qaPage, setQaPage] = useState(1)
  const [qaFilter, setQaFilter] = useState<QAFilter>('all')
  const [qaLoading, setQaLoading] = useState(false)
  const [answeringId, setAnsweringId] = useState<string | null>(null)
  const [answerText, setAnswerText] = useState('')
  const [answerSubmitting, setAnswerSubmitting] = useState(false)

  const loadQAs = useCallback(async () => {
    setQaLoading(true)
    try {
      const params: { page: number; limit: number; answered?: string } = { page: qaPage, limit: 10 }
      if (qaFilter === 'unanswered') params.answered = 'false'
      if (qaFilter === 'answered') params.answered = 'true'
      const data = await gameService.getDeveloperQAs(params)
      setQas(data.qas || [])
      setQaTotal(data.total || 0)
    } catch (err) {
      console.error('Q&A 로드 실패:', err)
    } finally {
      setQaLoading(false)
    }
  }, [qaPage, qaFilter])

  useEffect(() => {
    if (sectionTab === 'qa') {
      loadQAs()
    }
  }, [sectionTab, loadQAs])

  const handleAnswer = async (qaId: string) => {
    if (!answerText.trim()) return
    setAnswerSubmitting(true)
    try {
      await gameService.answerGameQA(qaId, answerText.trim())
      setAnsweringId(null)
      setAnswerText('')
      loadQAs()
    } catch (err) {
      console.error('답변 실패:', err)
    } finally {
      setAnswerSubmitting(false)
    }
  }

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

  const QA_FILTERS: { key: QAFilter; label: string }[] = [
    { key: 'all',        label: '전체' },
    { key: 'unanswered', label: '미답변' },
    { key: 'answered',   label: '답변완료' },
  ]

  const unansweredCount = qas.filter(q => !q.answer).length

  return (
    <div className="space-y-6 p-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-3xl font-bold mb-1">피드백 관리</h1>
        <p className="text-text-secondary">테스터 피드백, 버그 리포트, Q&A를 관리하세요</p>
      </div>

      {/* 섹션 탭: 피드백 / Q&A */}
      <div className="flex gap-1 bg-bg-secondary border border-line rounded-lg p-1 w-fit">
        <button
          onClick={() => setSectionTab('feedback')}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm rounded-md transition-colors ${
            sectionTab === 'feedback' ? 'bg-accent text-text-primary' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <MessageSquare className="w-4 h-4" /> 피드백
        </button>
        <button
          onClick={() => setSectionTab('qa')}
          className={`flex items-center gap-2 px-5 py-2.5 text-sm rounded-md transition-colors relative ${
            sectionTab === 'qa' ? 'bg-accent text-text-primary' : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <HelpCircle className="w-4 h-4" /> Q&A
          {unansweredCount > 0 && sectionTab !== 'qa' && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-text-primary text-xs rounded-full flex items-center justify-center">
              {unansweredCount}
            </span>
          )}
        </button>
      </div>

      {/* ─── 피드백 섹션 ─── */}
      {sectionTab === 'feedback' && (
        <>
          {/* 통계 카드 */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {STATS.map(s => (
              <div key={s.label} className="bg-bg-secondary border border-line rounded-lg p-4">
                <div className={`text-2xl font-bold mb-1 ${s.color}`}>{s.value}</div>
                <div className="text-sm text-text-secondary">{s.label}</div>
              </div>
            ))}
          </div>

          {/* 필터 */}
          <div className="bg-bg-secondary border border-line rounded-lg p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
                <input
                  type="text"
                  placeholder="피드백 검색..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-bg-tertiary border border-line rounded-md text-sm focus:outline-none focus:border-accent"
                />
              </div>
              <select
                value={filterGame}
                onChange={e => setFilterGame(e.target.value)}
                className="w-full px-3 py-2 bg-bg-tertiary border border-line rounded-md text-sm focus:outline-none focus:border-accent"
              >
                <option value="all">모든 게임</option>
                {GAMES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
          </div>

          {/* 탭 */}
          <div className="flex gap-1 bg-bg-secondary border border-line rounded-lg p-1 w-fit">
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={`px-4 py-2 text-sm rounded-md transition-colors ${
                  activeTab === t.key
                    ? 'bg-accent text-text-primary'
                    : 'text-text-secondary hover:text-text-primary'
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
              <div className="text-center py-12 text-text-secondary">검색 결과가 없습니다.</div>
            )}
          </div>
        </>
      )}

      {/* ─── Q&A 섹션 ─── */}
      {sectionTab === 'qa' && (
        <>
          {/* Q&A 통계 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-bg-secondary border border-line rounded-lg p-4">
              <div className="text-2xl font-bold text-text-primary mb-1">{qaTotal}</div>
              <div className="text-sm text-text-secondary">총 Q&A</div>
            </div>
            <div className="bg-bg-secondary border border-line rounded-lg p-4">
              <div className="text-2xl font-bold text-yellow-400 mb-1">
                {qas.filter(q => !q.answer).length}
              </div>
              <div className="text-sm text-text-secondary">미답변</div>
            </div>
            <div className="bg-bg-secondary border border-line rounded-lg p-4">
              <div className="text-2xl font-bold text-accent mb-1">
                {qas.filter(q => !!q.answer).length}
              </div>
              <div className="text-sm text-text-secondary">답변완료</div>
            </div>
          </div>

          {/* Q&A 필터 */}
          <div className="flex gap-1 bg-bg-secondary border border-line rounded-lg p-1 w-fit">
            {QA_FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => { setQaFilter(f.key); setQaPage(1) }}
                className={`px-4 py-2 text-sm rounded-md transition-colors ${
                  qaFilter === f.key
                    ? 'bg-accent text-text-primary'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Q&A 목록 */}
          {qaLoading ? (
            <div className="text-center py-16">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-text-muted" />
            </div>
          ) : qas.length === 0 ? (
            <div className="text-center py-16 text-text-secondary">
              <HelpCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Q&A가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {qas.map((qa) => {
                const gameTitle = typeof qa.gameId === 'object' ? qa.gameId.title : '알 수 없는 게임'
                const userName = typeof qa.userId === 'object' ? qa.userId.username : '알 수 없는 사용자'
                const userEmail = typeof qa.userId === 'object' ? qa.userId.email : ''

                return (
                  <div key={qa._id} className="bg-bg-secondary border border-line rounded-lg p-6 hover:border-line transition-colors">
                    {/* 질문 헤더 */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded-full border border-accent-muted text-accent">
                          {gameTitle}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          qa.answer
                            ? 'bg-accent-light text-accent border border-accent-muted'
                            : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                        }`}>
                          {qa.answer ? '답변완료' : '미답변'}
                        </span>
                      </div>
                      <span className="text-xs text-text-muted">
                        {new Date(qa.createdAt).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* 질문 내용 */}
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {userName[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-text-primary">{userName}</span>
                          {userEmail && <span className="text-xs text-text-muted">{userEmail}</span>}
                        </div>
                        <p className="text-text-secondary text-sm leading-relaxed">{qa.question}</p>
                      </div>
                    </div>

                    {/* 기존 답변 표시 */}
                    {qa.answer && (
                      <div className="ml-11 bg-green-900/20 border border-green-800/30 rounded-lg p-4 mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-6 h-6 rounded-full bg-accent flex items-center justify-center text-xs font-bold">
                            개
                          </div>
                          <span className="text-xs font-medium text-accent">개발사 답변</span>
                          {qa.answeredAt && (
                            <span className="text-xs text-text-muted">
                              {new Date(qa.answeredAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                        <p className="text-text-secondary text-sm leading-relaxed">{qa.answer}</p>
                      </div>
                    )}

                    {/* 답변 작성 영역 */}
                    {!qa.answer && (
                      <div className="ml-11">
                        {answeringId === qa._id ? (
                          <div className="space-y-3">
                            <textarea
                              value={answerText}
                              onChange={(e) => setAnswerText(e.target.value)}
                              placeholder="답변을 작성하세요..."
                              rows={3}
                              maxLength={2000}
                              className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-accent transition-colors resize-none"
                            />
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-text-muted">{answerText.length}/2000</span>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => { setAnsweringId(null); setAnswerText('') }}
                                  className="px-3 py-1.5 text-sm text-text-secondary border border-line rounded-md hover:bg-bg-tertiary transition-colors"
                                >
                                  취소
                                </button>
                                <button
                                  onClick={() => handleAnswer(qa._id)}
                                  disabled={answerSubmitting || !answerText.trim()}
                                  className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-accent hover:bg-accent-hover text-text-primary rounded-md transition-colors disabled:opacity-50"
                                >
                                  {answerSubmitting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Send className="w-4 h-4" />
                                  )}
                                  답변 전송
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setAnsweringId(qa._id); setAnswerText('') }}
                            className="flex items-center gap-1.5 px-4 py-2 text-sm bg-accent-light text-accent border border-green-600/30 rounded-md hover:bg-accent/30 transition-colors"
                          >
                            <Send className="w-4 h-4" /> 답변 작성
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Q&A 페이지네이션 */}
          {qaTotal > 10 && (
            <div className="flex justify-center gap-2 pt-4">
              {Array.from({ length: Math.ceil(qaTotal / 10) }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setQaPage(p)}
                  className={`w-8 h-8 rounded text-sm ${
                    qaPage === p ? 'bg-accent text-text-primary' : 'bg-bg-tertiary text-text-secondary hover:bg-line-light'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
