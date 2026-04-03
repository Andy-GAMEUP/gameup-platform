'use client'
import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { useRouter, useParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import communityService from '@/services/communityService'
import Editor from '@/components/Editor'
import { useAuth } from '@/lib/useAuth'
import {
  Plus, Trash2, Link as LinkIcon, Tag, Loader2, ArrowLeft, Save,
  Upload, Film, AlertTriangle, Star, ImageIcon
} from 'lucide-react'

const CATEGORIES = [
  { value: 'new-game-intro', label: '신작게임소개', desc: '새로운 게임을 소개해보세요', icon: '🆕' },
  { value: 'beta-game', label: '베타게임', desc: '베타 테스트 중인 게임에 대해 작성', icon: '🧪' },
  { value: 'live-game', label: '라이브게임', desc: '출시된 게임에 대해 작성', icon: '🎮' },
  { value: 'free', label: '자유게시판', desc: '자유롭게 이야기를 나눠보세요', icon: '💬' },
]

export default function CommunityWritePage() {
  const { id } = useParams<{ id?: string }>()
  const router = useRouter()
  const { user, isAuthenticated, isLoading } = useAuth()
  const isEdit = !!id
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [channel, setChannel] = useState('new-game-intro')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [links, setLinks] = useState<{ url: string; label: string }[]>([])
  const [images, setImages] = useState<string[]>([])
  const [thumbnailIndex, setThumbnailIndex] = useState(0)
  const [videoUrl, setVideoUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [tempSaving, setTempSaving] = useState(false)
  const [error, setError] = useState('')
  const [tempSaveMsg, setTempSaveMsg] = useState('')

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) { router.push('/login'); return }
    if (isEdit) {
      communityService.getPost(id!).then(p => {
        setTitle(p.title)
        setContent(p.content)
        // 레거시 채널 매핑
        const channelMap: Record<string, string> = {
          'general': 'free', 'dev': 'free', 'daily': 'free',
          'game-talk': 'free', 'info-share': 'live-game', 'new-game': 'beta-game'
        }
        setChannel(channelMap[p.channel] || p.channel)
        setTags(p.tags || [])
        setLinks(p.links?.map(l => ({ url: l.url, label: l.label || '' })) || [])
        setImages(p.images || [])
        setVideoUrl(p.videoUrl || '')
        setThumbnailIndex(p.thumbnailIndex || 0)
      }).catch(() => router.push('/community'))
    }
  }, [id, isAuthenticated, isLoading])

  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, '')
    if (t && !tags.includes(t) && tags.length < 10) {
      setTags([...tags, t])
      setTagInput('')
    }
  }

  const addLink = () => setLinks([...links, { url: '', label: '' }])

  // 이미지 파일 업로드
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const remaining = 5 - images.length
    if (remaining <= 0) { setError('이미지는 최대 5개까지 업로드 가능합니다'); return }

    const filesToUpload = Array.from(files).slice(0, remaining)
    setUploading(true)
    setError('')
    try {
      const result = await communityService.uploadImages(filesToUpload)
      setImages(prev => [...prev, ...result.images])
    } catch {
      setError('이미지 업로드에 실패했습니다')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async () => {
    if (!title.trim()) { setError('제목을 입력해주세요'); return }
    if (!content || content === '<p></p>') { setError('내용을 입력해주세요'); return }
    setError('')
    setSubmitting(true)
    try {
      const payload = {
        title: title.trim(), content, channel, tags,
        links: links.filter(l => l.url.trim()),
        images, videoUrl: videoUrl.trim(), thumbnailIndex
      }
      if (isEdit) {
        await communityService.updatePost(id!, payload)
        router.push(`/community/${id}`)
      } else {
        const post = await communityService.createPost(payload)
        router.push(`/community/${post._id}`)
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setError(err?.response?.data?.message || '저장 실패')
    } finally {
      setSubmitting(false)
    }
  }

  const handleTempSave = async () => {
    setTempSaving(true)
    setTempSaveMsg('')
    try {
      await communityService.tempSave({ title: title.trim() || '임시저장', content, channel, tags })
      setTempSaveMsg('임시저장 완료')
      setTimeout(() => setTempSaveMsg(''), 3000)
    } catch {
      setTempSaveMsg('임시저장 실패')
      setTimeout(() => setTempSaveMsg(''), 3000)
    } finally {
      setTempSaving(false)
    }
  }

  const canWriteNotice = user?.role === 'admin' || user?.role === 'developer'

  return (
    <div className="min-h-screen bg-bg-primary accent-violet community-accent">
      <Navbar />
      <div className="max-w-3xl lg:max-w-4xl mx-auto px-4 py-8">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-text-muted hover:text-text-primary text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> 취소
        </button>

        <div className="bg-bg-card border border-line rounded-2xl p-5 sm:p-6 lg:p-8 space-y-6">
          <h1 className="text-text-primary text-xl font-bold">{isEdit ? '게시글 수정' : '게시글 작성'}</h1>

          {error && <p className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700/40 text-red-600 dark:text-red-300 text-sm px-4 py-3 rounded-xl">{error}</p>}

          {/* 카테고리 카드형 선택 */}
          <div>
            <label className="text-text-secondary text-sm mb-3 block font-medium">카테고리 <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {CATEGORIES.map(cat => (
                <button key={cat.value} onClick={() => setChannel(cat.value)}
                  className={`text-left p-4 rounded-xl border-2 transition-all ${
                    channel === cat.value
                      ? 'border-accent-muted bg-accent-light'
                      : 'border-line hover:border-text-muted'
                  }`}>
                  <div className="text-lg mb-1">{cat.icon}</div>
                  <p className={`text-sm font-semibold ${channel === cat.value ? 'text-accent' : 'text-text-primary'}`}>
                    {cat.label}
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5">{cat.desc}</p>
                </button>
              ))}
            </div>
            {/* 공지사항 (관리자/개발사 전용) */}
            {canWriteNotice && (
              <button onClick={() => setChannel('notice')}
                className={`mt-3 w-full text-left p-3 rounded-xl border-2 transition-all flex items-center gap-2 ${
                  channel === 'notice'
                    ? 'border-accent-muted bg-accent-light'
                    : 'border-line hover:border-text-muted'
                }`}>
                <Star className="w-4 h-4 text-accent" />
                <span className={`text-sm font-semibold ${channel === 'notice' ? 'text-accent' : 'text-text-secondary'}`}>공지사항</span>
                <span className="text-xs text-text-secondary ml-1">관리자/개발사 전용</span>
              </button>
            )}
          </div>

          {/* 제목 */}
          <div>
            <label className="text-text-secondary text-sm mb-2 block font-medium">제목 <span className="text-red-500">*</span></label>
            <input value={title} onChange={e => setTitle(e.target.value)} maxLength={200}
              placeholder="제목을 입력하세요"
              className="w-full bg-bg-secondary border border-line text-text-primary px-4 py-3 rounded-xl focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-colors"
            />
            <p className="text-text-secondary text-xs mt-1 text-right">{title.length}/200</p>
          </div>

          {/* 내용 */}
          <div>
            <label className="text-text-secondary text-sm mb-2 block font-medium">내용 <span className="text-red-500">*</span></label>
            <Editor content={content} onChange={setContent} placeholder="내용을 입력하세요..." />
          </div>

          {/* 이미지 업로드 */}
          <div>
            <label className="text-text-secondary text-sm mb-2 flex items-center gap-1.5 font-medium">
              <ImageIcon className="w-4 h-4" /> 이미지 ({images.length}/5)
            </label>
            <input ref={fileInputRef} type="file" accept="image/*" multiple
              onChange={handleImageUpload}
              className="hidden" />
            <div className="flex flex-wrap gap-3 mb-2">
              {images.map((img, i) => (
                <div key={i} className="relative group">
                  <Image src={img} alt="" width={120} height={80} className="w-[120px] h-20 object-cover rounded-xl border border-line" unoptimized />
                  {/* 대표 이미지 선택 */}
                  <button onClick={() => setThumbnailIndex(i)}
                    className={`absolute bottom-1 left-1 p-1 rounded text-xs ${
                      thumbnailIndex === i
                        ? 'bg-accent text-text-primary'
                        : 'bg-bg-overlay text-text-primary/70 opacity-0 group-hover:opacity-100'
                    } transition-opacity`}
                    title="대표 이미지로 설정">
                    <Star className="w-3 h-3" />
                  </button>
                  {/* 삭제 */}
                  <button onClick={() => {
                    setImages(images.filter((_, j) => j !== i))
                    if (thumbnailIndex >= images.length - 1) setThumbnailIndex(Math.max(0, images.length - 2))
                  }}
                    className="absolute top-1 right-1 bg-red-600/80 rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-3 h-3 text-text-primary" />
                  </button>
                </div>
              ))}
              {images.length < 5 && (
                <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                  className="w-[120px] h-20 border-2 border-dashed border-line rounded-xl flex flex-col items-center justify-center text-text-secondary hover:border-accent hover:text-accent transition-colors">
                  {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
                  <span className="text-xs mt-1">{uploading ? '업로드 중' : `추가 (${5 - images.length})`}</span>
                </button>
              )}
            </div>
            {images.length > 0 && (
              <p className="text-xs text-text-secondary">⭐ 별 아이콘을 클릭하여 대표 이미지를 선택하세요. 목록에서 썸네일로 표시됩니다.</p>
            )}
          </div>

          {/* 동영상 링크 */}
          <div>
            <label className="text-text-secondary text-sm mb-2 flex items-center gap-1.5 font-medium">
              <Film className="w-4 h-4" /> 동영상 링크 (선택)
            </label>
            <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)}
              placeholder="YouTube, Twitch 등의 동영상 링크를 입력하세요"
              className="w-full bg-bg-secondary border border-line text-text-primary text-sm px-4 py-2.5 rounded-xl focus:outline-none focus:border-accent transition-colors"
            />
            <p className="text-xs text-text-secondary mt-1">동영상은 링크 형태로 추가됩니다. 게시글에서 링크를 클릭하여 시청할 수 있습니다.</p>
          </div>

          {/* 하이퍼링크 */}
          <div>
            <label className="text-text-secondary text-sm mb-2 flex items-center gap-1.5 font-medium">
              <LinkIcon className="w-4 h-4" /> 하이퍼링크
            </label>
            {links.map((l, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input value={l.url} onChange={e => setLinks(links.map((x, j) => j === i ? { ...x, url: e.target.value } : x))}
                  placeholder="https://..."
                  className="flex-1 bg-bg-secondary border border-line text-text-primary text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-accent"
                />
                <input value={l.label} onChange={e => setLinks(links.map((x, j) => j === i ? { ...x, label: e.target.value } : x))}
                  placeholder="표시 텍스트"
                  className="w-32 bg-bg-secondary border border-line text-text-primary text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-accent"
                />
                <button onClick={() => setLinks(links.filter((_, j) => j !== i))}
                  className="text-red-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {links.length < 10 && (
              <button onClick={addLink} className="flex items-center gap-1.5 text-text-secondary hover:text-accent text-sm transition-colors mt-1">
                <Plus className="w-4 h-4" /> 링크 추가
              </button>
            )}
          </div>

          {/* 태그 */}
          <div>
            <label className="text-text-secondary text-sm mb-2 flex items-center gap-1.5 font-medium">
              <Tag className="w-4 h-4" /> 태그 ({tags.length}/10)
            </label>
            <div className="flex gap-2 mb-2">
              <input value={tagInput} onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addTag()}
                placeholder="#태그 입력 후 Enter"
                className="flex-1 bg-bg-secondary border border-line text-text-primary text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-accent"
              />
              <button onClick={addTag} disabled={!tagInput.trim() || tags.length >= 10}
                className="bg-bg-tertiary hover:bg-bg-secondary text-text-primary p-2 rounded-lg disabled:opacity-50 transition-colors">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map(t => (
                  <span key={t} className="bg-accent-light text-accent text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5">
                    #{t}
                    <button onClick={() => setTags(tags.filter(x => x !== t))} className="text-accent hover:text-text-primary transition-colors">✕</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 작성 안내 경고 박스 */}
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-xl px-4 py-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">작성 안내</span>
            </div>
            <ul className="text-xs text-amber-600 dark:text-amber-400 space-y-1 pl-6 list-disc">
              <li>커뮤니티 가이드라인을 준수해주세요</li>
              <li>게임 개발사는 공지사항 작성 시 고정 옵션을 사용할 수 있습니다</li>
              <li>허위 정보나 스팸성 게시글은 삭제될 수 있습니다</li>
            </ul>
          </div>

          {/* 제출 영역 */}
          <div className="space-y-3 pt-2 border-t border-line">
            <div className="flex gap-3">
              <button onClick={handleSubmit} disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-text-primary py-3 rounded-xl text-sm font-semibold transition-colors">
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {isEdit ? '수정 완료' : '게시글 작성'}
              </button>
              <button onClick={() => router.back()} className="px-6 py-3 text-sm text-text-muted border border-line rounded-xl hover:bg-bg-tertiary transition-colors">
                취소
              </button>
            </div>
            {!isEdit && (
              <div className="flex items-center gap-3">
                <button onClick={handleTempSave} disabled={tempSaving}
                  className="flex items-center gap-2 text-sm text-text-secondary hover:text-accent transition-colors">
                  {tempSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  임시저장
                </button>
                {tempSaveMsg && (
                  <span className={`text-xs ${tempSaveMsg.includes('실패') ? 'text-red-500' : 'text-green-500'}`}>{tempSaveMsg}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
