'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import communityService from '@/services/communityService'
import { useAuth } from '@/lib/useAuth'
import { Plus, Trash2, Link as LinkIcon, ImagePlus, Tag, Loader2, ArrowLeft } from 'lucide-react'

const CATEGORIES = [
  { value: 'general',    label: '자유 게시판' },
  { value: 'bug',        label: '버그 리포트' },
  { value: 'suggestion', label: '건의 / 개선' },
  { value: 'review',     label: '게임 리뷰' },
  { value: 'notice',     label: '공지 (관리자/개발사)' },
]

export default function CommunityWritePage() {
  const { id } = useParams<{ id?: string }>()
  const router = useRouter()
  const { user, isAuthenticated } = useAuth()
  const isEdit = !!id

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('general')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [links, setLinks] = useState<{ url: string; label: string }[]>([])
  const [images, setImages] = useState<string[]>([])
  const [imageInput, setImageInput] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isAuthenticated) { router.push('/login'); return }
    if (isEdit) {
      communityService.getPost(id!).then(p => {
        setTitle(p.title)
        setContent(p.content)
        setCategory(p.category)
        setTags(p.tags || [])
        setLinks(p.links?.map(l => ({ url: l.url, label: l.label || '' })) || [])
        setImages(p.images || [])
      }).catch(() => router.push('/community'))
    }
  }, [id, isAuthenticated])

  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, '')
    if (t && !tags.includes(t) && tags.length < 10) {
      setTags([...tags, t])
      setTagInput('')
    }
  }

  const addLink = () => setLinks([...links, { url: '', label: '' }])
  const addImage = () => {
    if (imageInput.trim() && images.length < 10) {
      setImages([...images, imageInput.trim()])
      setImageInput('')
    }
  }

  const handleSubmit = async () => {
    if (!title.trim()) { setError('제목을 입력해주세요'); return }
    if (!content.trim()) { setError('내용을 입력해주세요'); return }
    setError('')
    setSubmitting(true)
    try {
      const payload = { title: title.trim(), content: content.trim(), category, tags, links: links.filter(l=>l.url.trim()), images }
      if (isEdit) {
        await communityService.updatePost(id!, payload)
        router.push(`/community/${id}`)
      } else {
        const post = await communityService.createPost(payload)
        router.push(`/community/${post._id}`)
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || '저장 실패')
    } finally {
      setSubmitting(false)
    }
  }

  const canWriteNotice = user?.role === 'admin' || user?.role === 'developer'

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-8">
        <button onClick={() => router.back()} className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> 뒤로
        </button>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-5">
          <h1 className="text-white text-xl font-bold">{isEdit ? '게시글 수정' : '새 글 작성'}</h1>

          {error && <p className="bg-red-900/30 border border-red-700/40 text-red-300 text-sm px-4 py-3 rounded-xl">{error}</p>}

          {/* 카테고리 */}
          <div>
            <label className="text-slate-400 text-sm mb-2 block">카테고리</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.filter(c => c.value !== 'notice' || canWriteNotice).map(c => (
                <button key={c.value} onClick={() => setCategory(c.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${category===c.value?'bg-cyan-600/20 border-cyan-500/40 text-cyan-300':'border-slate-700 text-slate-400 hover:border-slate-600 hover:text-white'}`}>
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* 제목 */}
          <div>
            <label className="text-slate-400 text-sm mb-2 block">제목 <span className="text-red-400">*</span></label>
            <input value={title} onChange={e=>setTitle(e.target.value)} maxLength={200}
              placeholder="제목을 입력하세요"
              className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-cyan-500 transition-colors"
            />
            <p className="text-slate-600 text-xs mt-1 text-right">{title.length}/200</p>
          </div>

          {/* 내용 */}
          <div>
            <label className="text-slate-400 text-sm mb-2 block">내용 <span className="text-red-400">*</span></label>
            <textarea value={content} onChange={e=>setContent(e.target.value)} maxLength={10000}
              rows={12}
              placeholder="내용을 입력하세요"
              className="w-full bg-slate-800 border border-slate-700 text-white px-4 py-3 rounded-xl resize-none focus:outline-none focus:border-cyan-500 transition-colors"
            />
            <p className="text-slate-600 text-xs mt-1 text-right">{content.length}/10000</p>
          </div>

          {/* 이미지 URL */}
          <div>
            <label className="text-slate-400 text-sm mb-2 flex items-center gap-1.5">
              <ImagePlus className="w-4 h-4"/> 이미지 URL ({images.length}/10)
            </label>
            <div className="flex gap-2 mb-2">
              <input value={imageInput} onChange={e=>setImageInput(e.target.value)}
                onKeyDown={e => e.key==='Enter' && addImage()}
                placeholder="이미지 URL 입력 후 Enter"
                className="flex-1 bg-slate-800 border border-slate-700 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-cyan-500"
              />
              <button onClick={addImage} disabled={!imageInput.trim()||images.length>=10}
                className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-lg disabled:opacity-50 transition-colors">
                <Plus className="w-4 h-4"/>
              </button>
            </div>
            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {images.map((img,i) => (
                  <div key={i} className="relative group">
                    <img src={img} alt="" className="w-full h-20 object-cover rounded-lg border border-slate-700" onError={e=>(e.currentTarget.src='https://via.placeholder.com/80x80?text=Error')} />
                    <button onClick={() => setImages(images.filter((_,j)=>j!==i))}
                      className="absolute top-1 right-1 bg-red-700/80 rounded p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-3 h-3 text-white"/>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 하이퍼링크 */}
          <div>
            <label className="text-slate-400 text-sm mb-2 flex items-center gap-1.5">
              <LinkIcon className="w-4 h-4"/> 하이퍼링크
            </label>
            {links.map((l,i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input value={l.url} onChange={e => setLinks(links.map((x,j)=>j===i?{...x,url:e.target.value}:x))}
                  placeholder="https://..."
                  className="flex-1 bg-slate-800 border border-slate-700 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-cyan-500"
                />
                <input value={l.label} onChange={e => setLinks(links.map((x,j)=>j===i?{...x,label:e.target.value}:x))}
                  placeholder="표시 텍스트 (선택)"
                  className="w-32 bg-slate-800 border border-slate-700 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-cyan-500"
                />
                <button onClick={() => setLinks(links.filter((_,j)=>j!==i))}
                  className="text-red-400 hover:text-red-300 p-2 rounded-lg hover:bg-red-900/20 transition-colors">
                  <Trash2 className="w-4 h-4"/>
                </button>
              </div>
            ))}
            {links.length < 10 && (
              <button onClick={addLink} className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors mt-1">
                <Plus className="w-4 h-4"/> 링크 추가
              </button>
            )}
          </div>

          {/* 태그 */}
          <div>
            <label className="text-slate-400 text-sm mb-2 flex items-center gap-1.5">
              <Tag className="w-4 h-4"/> 태그 ({tags.length}/10)
            </label>
            <div className="flex gap-2 mb-2">
              <input value={tagInput} onChange={e=>setTagInput(e.target.value)}
                onKeyDown={e => e.key==='Enter' && addTag()}
                placeholder="#태그 입력 후 Enter"
                className="flex-1 bg-slate-800 border border-slate-700 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-cyan-500"
              />
              <button onClick={addTag} disabled={!tagInput.trim()||tags.length>=10}
                className="bg-slate-700 hover:bg-slate-600 text-white p-2 rounded-lg disabled:opacity-50 transition-colors">
                <Plus className="w-4 h-4"/>
              </button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tags.map(t => (
                  <span key={t} className="bg-slate-800 text-slate-300 text-xs px-2 py-1 rounded-full flex items-center gap-1.5">
                    #{t}
                    <button onClick={() => setTags(tags.filter(x=>x!==t))} className="text-slate-500 hover:text-white transition-colors">✕</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* 제출 */}
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
            <button onClick={() => router.back()} className="px-5 py-2.5 text-sm text-slate-400 border border-slate-700 rounded-xl hover:bg-slate-800 transition-colors">
              취소
            </button>
            <button onClick={handleSubmit} disabled={submitting}
              className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
              {submitting && <Loader2 className="w-4 h-4 animate-spin"/>}
              {isEdit ? '수정 완료' : '게시하기'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
