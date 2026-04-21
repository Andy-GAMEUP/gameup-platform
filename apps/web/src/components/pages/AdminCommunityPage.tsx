'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import AdminLayout from '@/components/AdminLayout'
import adminService from '@/services/adminService'
import communityService from '@/services/communityService'
import {
  Search, ShieldOff, ShieldCheck, Trash2, ChevronLeft, ChevronRight,
  Loader2, AlertCircle, CheckCircle, MessageSquare, PenSquare, X,
  ImagePlus, Link2, Hash, Eye, EyeOff, Pin, Flame,
} from 'lucide-react'

const FEEDBACK_LABELS: Record<string, { label: string; cls: string }> = {
  general:    { label: '일반',  cls: 'bg-bg-muted/40 text-text-secondary' },
  bug:        { label: '버그',  cls: 'bg-accent-light text-accent-text border border-accent-muted' },
  suggestion: { label: '건의',  cls: 'bg-blue-600/20 text-blue-300 border border-blue-500/30' },
  praise:     { label: '칭찬',  cls: 'bg-accent-light text-accent border border-green-500/30' },
}

const CHANNELS = [
  { value: 'notice', label: '공지사항' },
  { value: 'new-game-intro', label: '신작게임소개' },
  { value: 'beta-game', label: '베타게임' },
  { value: 'live-game', label: '라이브게임' },
  { value: 'free', label: '자유게시판' },
]

function ConfirmModal({ msg, onConfirm, onCancel, danger = true, requireReason = false }: {
  msg: string; onConfirm: (r?: string) => void; onCancel: () => void
  danger?: boolean; requireReason?: boolean
}) {
  const [reason, setReason] = useState('')
  return (
    <div className="fixed inset-0 bg-bg-overlay z-50 flex items-center justify-center p-4">
      <div className="bg-bg-secondary border border-line rounded-xl w-full max-w-sm p-5 shadow-2xl">
        <p className="text-text-primary text-sm mb-4">{msg}</p>
        {requireReason && (
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2}
            placeholder="차단 사유 (선택)"
            className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none mb-3 resize-none" />
        )}
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-3 py-1.5 text-sm text-text-secondary border border-line rounded-lg hover:bg-bg-tertiary transition-colors">취소</button>
          <button onClick={() => onConfirm(reason)}
            className={`px-3 py-1.5 text-sm text-text-primary rounded-lg transition-colors ${danger ? 'bg-red-700 hover:bg-red-800' : 'bg-green-700 hover:bg-green-800'}`}>
            확인
          </button>
        </div>
      </div>
    </div>
  )
}

// ────────── 글쓰기 모달 ──────────

function WritePostModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [channel, setChannel] = useState('notice')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [links, setLinks] = useState<{ url: string; label: string }[]>([])
  const [images, setImages] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [linkLabel, setLinkLabel] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    if (images.length + files.length > 5) { setError('이미지는 최대 5개까지 가능합니다'); return }
    setUploading(true)
    try {
      const data = await communityService.uploadImages(Array.from(files))
      setImages(prev => [...prev, ...(data.images || [])])
    } catch { setError('이미지 업로드 실패') }
    finally { setUploading(false) }
  }

  const handleAddTag = () => {
    const tag = tagInput.replace(/^#/, '').trim()
    if (!tag || tags.length >= 10) return
    if (!tags.includes(tag)) setTags(prev => [...prev, tag])
    setTagInput('')
  }

  const handleAddLink = () => {
    if (!linkUrl.trim() || links.length >= 10) return
    setLinks(prev => [...prev, { url: linkUrl.trim(), label: linkLabel.trim() || linkUrl.trim() }])
    setLinkUrl(''); setLinkLabel(''); setShowLinkInput(false)
  }

  const handleSubmit = async () => {
    if (!title.trim()) { setError('제목을 입력해주세요'); return }
    if (!content.trim()) { setError('내용을 입력해주세요'); return }
    setSubmitting(true); setError('')
    try {
      await communityService.createPost({
        title: title.trim(),
        content: content.trim(),
        channel,
        images,
        videoUrl: videoUrl.trim() || undefined,
        links: links.length > 0 ? links : undefined,
        tags: tags.length > 0 ? tags : undefined,
      })
      onSuccess()
    } catch { setError('게시글 작성에 실패했습니다') }
    finally { setSubmitting(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-bg-primary border border-line rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="p-5 border-b border-line flex items-center justify-between flex-shrink-0">
          <h2 className="text-text-primary font-bold text-lg flex items-center gap-2">
            <PenSquare className="w-5 h-5 text-accent" /> 관리자 콘텐츠 작성
          </h2>
          <button onClick={onClose} className="p-2 text-text-muted hover:text-text-primary transition-colors"><X className="w-5 h-5" /></button>
        </div>

        {/* 본문 */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
            </div>
          )}

          {/* 채널 선택 */}
          <div>
            <label className="text-text-secondary text-sm font-medium mb-1.5 block">게시판</label>
            <div className="flex flex-wrap gap-2">
              {CHANNELS.map(ch => (
                <button key={ch.value} onClick={() => setChannel(ch.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    channel === ch.value
                      ? 'bg-accent text-white'
                      : 'bg-bg-tertiary text-text-secondary hover:text-text-primary border border-line'
                  }`}>
                  {ch.label}
                </button>
              ))}
            </div>
          </div>

          {/* 제목 */}
          <div>
            <label className="text-text-secondary text-sm font-medium mb-1.5 block">제목 <span className="text-red-500">*</span></label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} maxLength={200}
              placeholder="게시글 제목을 입력하세요"
              className="w-full bg-bg-tertiary border border-line rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
            <p className="text-text-muted text-xs mt-1 text-right">{title.length}/200</p>
          </div>

          {/* 내용 */}
          <div>
            <label className="text-text-secondary text-sm font-medium mb-1.5 block">내용 <span className="text-red-500">*</span></label>
            <textarea value={content} onChange={e => setContent(e.target.value)}
              rows={10} placeholder="게시글 내용을 입력하세요..."
              className="w-full bg-bg-tertiary border border-line rounded-lg px-4 py-3 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent resize-none" />
          </div>

          {/* 이미지 */}
          <div>
            <label className="text-text-secondary text-sm font-medium mb-1.5 block">이미지 (최대 5개)</label>
            <input type="file" ref={fileRef} onChange={handleImageUpload} accept="image/*" multiple className="hidden" />
            <div className="flex flex-wrap gap-2">
              {images.map((img, i) => (
                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-line group">
                  <img src={img.startsWith('http') ? img : `${process.env.NEXT_PUBLIC_UPLOADS_URL || 'http://localhost:5000'}${img}`} alt="" className="w-full h-full object-cover" />
                  <button onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                    className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
              {images.length < 5 && (
                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="w-20 h-20 rounded-lg border-2 border-dashed border-line flex flex-col items-center justify-center text-text-muted hover:text-text-secondary hover:border-text-muted transition-colors">
                  {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ImagePlus className="w-5 h-5" /><span className="text-xs mt-1">추가</span></>}
                </button>
              )}
            </div>
          </div>

          {/* 영상 URL */}
          <div>
            <label className="text-text-secondary text-sm font-medium mb-1.5 block">영상 URL (선택)</label>
            <input type="url" value={videoUrl} onChange={e => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/... 또는 https://twitch.tv/..."
              className="w-full bg-bg-tertiary border border-line rounded-lg px-4 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent" />
          </div>

          {/* 링크 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-text-secondary text-sm font-medium">링크 (최대 10개)</label>
              {links.length < 10 && (
                <button onClick={() => setShowLinkInput(true)} className="text-accent text-xs hover:underline flex items-center gap-1">
                  <Link2 className="w-3 h-3" /> 추가
                </button>
              )}
            </div>
            {links.length > 0 && (
              <div className="space-y-1.5 mb-2">
                {links.map((l, i) => (
                  <div key={i} className="flex items-center gap-2 bg-bg-tertiary rounded-lg px-3 py-1.5 text-sm">
                    <Link2 className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                    <span className="text-accent truncate flex-1">{l.label}</span>
                    <button onClick={() => setLinks(prev => prev.filter((_, j) => j !== i))} className="text-text-muted hover:text-text-primary"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
            )}
            {showLinkInput && (
              <div className="flex gap-2">
                <input type="url" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="URL" className="flex-1 bg-bg-tertiary border border-line rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none" />
                <input type="text" value={linkLabel} onChange={e => setLinkLabel(e.target.value)} placeholder="라벨 (선택)" className="w-32 bg-bg-tertiary border border-line rounded-lg px-3 py-1.5 text-sm text-text-primary focus:outline-none" />
                <button onClick={handleAddLink} className="px-3 py-1.5 bg-accent text-white rounded-lg text-sm">추가</button>
                <button onClick={() => { setShowLinkInput(false); setLinkUrl(''); setLinkLabel('') }} className="px-2 text-text-muted"><X className="w-4 h-4" /></button>
              </div>
            )}
          </div>

          {/* 태그 */}
          <div>
            <label className="text-text-secondary text-sm font-medium mb-1.5 block">태그 (최대 10개)</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag() } }}
                  placeholder="태그 입력 후 Enter"
                  className="w-full pl-9 pr-3 py-2 bg-bg-tertiary border border-line rounded-lg text-sm text-text-primary focus:outline-none" />
              </div>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {tags.map(tag => (
                  <span key={tag} className="flex items-center gap-1 px-2 py-0.5 bg-accent/10 text-accent rounded-full text-xs">
                    #{tag}
                    <button onClick={() => setTags(prev => prev.filter(t => t !== tag))}><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 푸터 */}
        <div className="p-5 border-t border-line flex items-center justify-between flex-shrink-0">
          <p className="text-text-muted text-xs">관리자 계정으로 게시됩니다</p>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 border border-line rounded-lg text-sm text-text-secondary hover:bg-bg-tertiary transition-colors">취소</button>
            <button onClick={handleSubmit} disabled={submitting || !title.trim() || !content.trim()}
              className="flex items-center gap-2 px-5 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PenSquare className="w-4 h-4" />}
              게시하기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ────────── 메인 페이지 ──────────

export default function AdminCommunityPage() {
  const searchParams = useSearchParams()
  const [reviews, setReviews] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filterBlocked, setFilterBlocked] = useState(searchParams.get('filter') === 'blocked' ? 'true' : '')
  const [gameIdFilter] = useState(searchParams.get('gameId') || '')
  const [loading, setLoading] = useState(true)
  const [actionId, setActionId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [confirm, setConfirm] = useState<any>(null)
  const [showWriteModal, setShowWriteModal] = useState(false)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await adminService.getAllReviews({
        page, search, isBlocked: filterBlocked || undefined, gameId: gameIdFilter || undefined
      })
      setReviews(data.reviews || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 1)
    } catch { showToast('불러오기 실패', false) }
    finally { setLoading(false) }
  }, [page, search, filterBlocked, gameIdFilter])

  useEffect(() => { load() }, [load])

  const handleBlock = (r: any) => {
    const blocking = !r.isBlocked
    setConfirm({
      msg: blocking ? `"${r.title}" 리뷰를 차단하시겠습니까?` : `"${r.title}" 차단을 해제하시겠습니까?`,
      danger: blocking,
      requireReason: blocking,
      onConfirm: async (reason: string) => {
        setConfirm(null)
        setActionId(r._id)
        try {
          await adminService.blockReview(r._id, { isBlocked: blocking, blockReason: reason })
          showToast(blocking ? '차단되었습니다' : '차단이 해제되었습니다')
          load()
        } catch { showToast('처리 실패', false) }
        finally { setActionId(null) }
      }
    })
  }

  const handleDelete = (r: any) => {
    setConfirm({
      msg: `"${r.title}" 리뷰를 영구 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
      danger: true,
      onConfirm: async () => {
        setConfirm(null)
        setActionId(r._id)
        try {
          await adminService.deleteReview(r._id)
          showToast('리뷰가 삭제되었습니다')
          load()
        } catch { showToast('삭제 실패', false) }
        finally { setActionId(null) }
      }
    })
  }

  const handlePostSuccess = () => {
    setShowWriteModal(false)
    showToast('게시글이 작성되었습니다')
  }

  const blockedCount = reviews.filter((r) => r.isBlocked).length

  return (
    <AdminLayout>
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${toast.ok ? 'bg-accent' : 'bg-red-600'} text-text-primary`}>
          {toast.ok ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}
      {confirm && <ConfirmModal {...confirm} onCancel={() => setConfirm(null)} />}
      {showWriteModal && <WritePostModal onClose={() => setShowWriteModal(false)} onSuccess={handlePostSuccess} />}

      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-text-primary text-xl font-bold flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-purple-400" /> 커뮤니티 모니터링
          </h2>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowWriteModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors">
              <PenSquare className="w-4 h-4" /> 콘텐츠 작성
            </button>
            <div className="flex gap-3 text-sm">
              <span className="text-text-secondary">{loading ? '로딩 중...' : <>총 <span className="text-text-primary font-semibold">{total}</span>개</>}</span>
              {blockedCount > 0 && <span className="text-accent-text">이 페이지 차단: {blockedCount}개</span>}
            </div>
          </div>
        </div>

        {/* 필터 */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="리뷰 제목·내용 검색..."
              className="w-full bg-bg-tertiary border border-line rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-line" />
          </div>
          <select value={filterBlocked} onChange={(e) => { setFilterBlocked(e.target.value); setPage(1) }}
            className="bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none">
            <option value="">전체</option>
            <option value="false">정상</option>
            <option value="true">차단됨</option>
          </select>
        </div>

        {/* 리뷰 목록 */}
        {loading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="w-6 h-6 animate-spin text-text-secondary" /></div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-16 text-text-muted">리뷰가 없습니다</div>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => {
              const fb = FEEDBACK_LABELS[r.feedbackType] || FEEDBACK_LABELS.general
              const isActioning = actionId === r._id
              return (
                <div key={r._id} className={`bg-bg-secondary border rounded-xl p-4 transition-all ${r.isBlocked ? 'border-red-800/50 bg-red-950/10' : 'border-line'} ${isActioning ? 'opacity-60 pointer-events-none' : ''}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-bg-tertiary rounded-full flex items-center justify-center text-sm font-bold text-text-primary flex-shrink-0">
                      {(r.userId?.username || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-2 mb-1">
                        <span className="text-text-secondary text-sm font-medium">{r.userId?.username}</span>
                        <span className="text-yellow-400 text-xs">{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${fb.cls}`}>{fb.label}</span>
                        {r.isVerifiedTester && <span className="bg-accent-light text-accent text-xs px-1.5 rounded border border-green-500/30">인증테스터</span>}
                        {r.isBlocked && <span className="bg-accent-light text-accent-text text-xs px-1.5 rounded border border-accent-muted">차단됨</span>}
                        {r.gameId && (
                          <Link href={`/admin/metrics/${r.gameId._id}`} className="text-text-muted hover:text-cyan-300 text-xs transition-colors">
                            🎮 {r.gameId.title}
                          </Link>
                        )}
                      </div>
                      <p className={`text-sm font-semibold mb-0.5 ${r.isBlocked ? 'line-through text-text-muted' : 'text-text-primary'}`}>{r.title}</p>
                      <p className={`text-xs line-clamp-2 ${r.isBlocked ? 'text-text-muted' : 'text-text-secondary'}`}>{r.content}</p>
                      {r.isBlocked && r.blockReason && (
                        <p className="text-accent-text text-xs mt-1">차단 사유: {r.blockReason}</p>
                      )}
                      <p className="text-text-muted text-xs mt-1">
                        {new Date(r.createdAt).toLocaleDateString('ko-KR')} · 도움됨 {r.helpfulCount || 0}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => handleBlock(r)}
                        className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${
                          r.isBlocked
                            ? 'bg-green-700/20 text-accent border-green-600/40 hover:bg-accent-hover/40'
                            : 'bg-orange-700/20 text-orange-300 border-orange-600/40 hover:bg-orange-700/40'
                        }`}>
                        {r.isBlocked ? <><ShieldCheck className="w-3 h-3" /> 해제</> : <><ShieldOff className="w-3 h-3" /> 차단</>}
                      </button>
                      <button onClick={() => handleDelete(r)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs border bg-red-700/20 text-accent-text border-red-600/40 hover:bg-red-700/40 transition-colors">
                        <Trash2 className="w-3 h-3" /> 삭제
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p-1))} disabled={page===1}
              className="w-8 h-8 rounded-full bg-bg-tertiary hover:bg-line-light flex items-center justify-center disabled:opacity-40 transition-colors">
              <ChevronLeft className="w-4 h-4 text-text-primary" />
            </button>
            <span className="text-text-secondary text-sm">{page} / {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p+1))} disabled={page===totalPages}
              className="w-8 h-8 rounded-full bg-bg-tertiary hover:bg-line-light flex items-center justify-center disabled:opacity-40 transition-colors">
              <ChevronRight className="w-4 h-4 text-text-primary" />
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
