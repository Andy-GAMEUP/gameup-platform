'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import AdminLayout from '@/components/AdminLayout'
import partnerService, { PartnerApplication, PartnerPostItem } from '@/services/partnerService'
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronLeft, Loader2, GripVertical, Trash2 } from 'lucide-react'

interface SortablePostRowProps {
  post: PartnerPostItem
  index: number
  onDelete: (id: string) => void
  saving: boolean
}

function SortablePostRow({ post, index, onDelete, saving }: SortablePostRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: post._id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
    >
      <td className="px-3 py-3 w-8">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 text-slate-500 hover:text-slate-400 transition-colors"
          title="드래그하여 순서 변경"
        >
          <GripVertical className="w-4 h-4" />
        </button>
      </td>
      <td className="px-3 py-3 text-slate-400 text-sm">{index + 1}</td>
      <td className="px-3 py-3 text-white text-sm max-w-[200px]">
        <span className="line-clamp-1">{post.title}</span>
      </td>
      <td className="px-3 py-3 text-slate-300 text-sm">{post.topic || '-'}</td>
      <td className="px-3 py-3 text-slate-300 text-sm">{post.views ?? 0}</td>
      <td className="px-3 py-3 text-slate-300 text-sm">{post.likeCount ?? 0}</td>
      <td className="px-3 py-3 text-slate-300 text-sm">{post.commentCount ?? 0}</td>
      <td className="px-3 py-3 text-slate-400 text-sm">
        {new Date(post.createdAt).toLocaleDateString('ko-KR')}
      </td>
      <td className="px-3 py-3">
        <button
          onClick={() => onDelete(post._id)}
          disabled={saving}
          className="p-1.5 text-red-400 hover:text-red-300 disabled:opacity-30 transition-colors"
          title="삭제"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  )
}

export default function AdminPartnerPostsPage() {
  const params = useParams()
  const partnerId = params.partnerId as string
  const router = useRouter()

  const [partner, setPartner] = useState<PartnerApplication | null>(null)
  const [posts, setPosts] = useState<PartnerPostItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    if (!partnerId) return
    setLoading(true)
    try {
      const [partnerData, postsData] = await Promise.all([
        partnerService.admin.getPartnerDetail(partnerId),
        partnerService.admin.getPartnerPosts(partnerId, { limit: 100 }),
      ])
      setPartner(partnerData.partner)
      setPosts(postsData.posts || [])
    } catch {
      showToast('불러오기 실패', false)
    } finally {
      setLoading(false)
    }
  }, [partnerId])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    if (!confirm('이 포스트를 삭제하시겠습니까?')) return
    setSaving(true)
    try {
      await partnerService.admin.deletePartnerPost(id)
      setPosts(prev => prev.filter(p => p._id !== id))
      showToast('삭제되었습니다')
    } catch {
      showToast('삭제 실패', false)
    } finally {
      setSaving(false)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    if (saving) return
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = posts.findIndex(p => p._id === active.id)
    const newIndex = posts.findIndex(p => p._id === over.id)
    const newPosts = arrayMove(posts, oldIndex, newIndex)
    const prevPosts = posts

    setPosts(newPosts)
    setSaving(true)
    try {
      await partnerService.admin.reorderPosts(
        newPosts.map((p, i) => ({ id: p._id, sortOrder: i }))
      )
      showToast('순서가 변경되었습니다')
    } catch {
      setPosts(prevPosts)
      showToast('순서 변경 실패', false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <button
          onClick={() => router.push('/admin/partner-management')}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
        >
          <ChevronLeft className="w-4 h-4" />
          파트너 관리로 돌아가기
        </button>

        {partner && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
            <h1 className="text-white font-bold text-xl">{partner.userId?.username}</h1>
            {partner.slogan && (
              <p className="text-slate-400 text-sm mt-1 italic">&ldquo;{partner.slogan}&rdquo;</p>
            )}
            <p className="text-slate-500 text-sm mt-2">총 {posts.length}개 포스트</p>
          </div>
        )}

        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : posts.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">포스트가 없습니다</div>
          ) : (
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={posts.map(p => p._id)} strategy={verticalListSortingStrategy}>
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="px-3 py-3 text-left text-slate-400 text-xs font-medium w-8"></th>
                      <th className="px-3 py-3 text-left text-slate-400 text-xs font-medium">#</th>
                      <th className="px-3 py-3 text-left text-slate-400 text-xs font-medium">제목</th>
                      <th className="px-3 py-3 text-left text-slate-400 text-xs font-medium">주제</th>
                      <th className="px-3 py-3 text-left text-slate-400 text-xs font-medium">조회</th>
                      <th className="px-3 py-3 text-left text-slate-400 text-xs font-medium">좋아요</th>
                      <th className="px-3 py-3 text-left text-slate-400 text-xs font-medium">댓글</th>
                      <th className="px-3 py-3 text-left text-slate-400 text-xs font-medium">날짜</th>
                      <th className="px-3 py-3 text-left text-slate-400 text-xs font-medium">작업</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posts.map((post, idx) => (
                      <SortablePostRow
                        key={post._id}
                        post={post}
                        index={idx}
                        onDelete={handleDelete}
                        saving={saving}
                      />
                    ))}
                  </tbody>
                </table>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg text-sm text-white shadow-lg z-50 ${toast.ok ? 'bg-green-700' : 'bg-red-700'}`}>
          {toast.msg}
        </div>
      )}
    </AdminLayout>
  )
}
