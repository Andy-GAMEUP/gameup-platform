'use client'
import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import AdminLayout from '@/components/AdminLayout'
import minihomeService, { MiniHome } from '@/services/minihomeService'
import { ChevronLeft, ChevronRight, Loader2, Search, Trash2, Building2 } from 'lucide-react'

export default function AdminMiniHomePage() {
  const [minihomes, setMinihomes] = useState<MiniHome[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [visibility, setVisibility] = useState('all')
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const [updating, setUpdating] = useState<string | null>(null)

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok })
    setTimeout(() => setToast(null), 3000)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params: { page: number; limit: number; search?: string; from?: string; to?: string; visibility?: string } = {
        page, limit: 20,
      }
      if (search) params.search = search
      if (fromDate) params.from = fromDate
      if (toDate) params.to = toDate
      if (visibility !== 'all') params.visibility = visibility
      const data = await minihomeService.admin.getList(params)
      setMinihomes(data.minihomes)
      setTotalPages(data.totalPages)
      setTotal(data.total)
    } catch {
      showToast('불러오기 실패', false)
    } finally {
      setLoading(false)
    }
  }, [page, search, fromDate, toDate, visibility])

  useEffect(() => { load() }, [load])

  const handleVisibilityToggle = async (mh: MiniHome) => {
    setUpdating(mh._id)
    try {
      await minihomeService.admin.updateVisibility(mh._id, !mh.isPublic)
      setMinihomes(prev => prev.map(m => m._id === mh._id ? { ...m, isPublic: !mh.isPublic } : m))
      showToast('공개 설정이 변경되었습니다')
    } catch {
      showToast('변경 실패', false)
    } finally {
      setUpdating(null)
    }
  }

  const handleRecommendedToggle = async (mh: MiniHome) => {
    setUpdating(mh._id + 'rec')
    try {
      await minihomeService.admin.updateRecommended(mh._id, !mh.isRecommended)
      setMinihomes(prev => prev.map(m => m._id === mh._id ? { ...m, isRecommended: !mh.isRecommended } : m))
      showToast('추천 설정이 변경되었습니다')
    } catch {
      showToast('변경 실패', false)
    } finally {
      setUpdating(null)
    }
  }

  const handleDelete = async (mh: MiniHome) => {
    if (!confirm(`"${mh.companyName}" 미니홈을 삭제하시겠습니까?`)) return
    try {
      await minihomeService.admin.delete(mh._id)
      setMinihomes(prev => prev.filter(m => m._id !== mh._id))
      showToast('삭제되었습니다')
    } catch {
      showToast('삭제 실패', false)
    }
  }

  const handleSearch = () => {
    setSearch(searchInput)
    setPage(1)
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-white font-bold text-xl">미니홈 관리</h1>
          <p className="text-slate-400 text-sm mt-1">총 {total}개의 미니홈</p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="flex gap-2 flex-1 min-w-48">
            <input
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSearch() }}
              placeholder="회사명 / 사용자명 검색"
              className="flex-1 bg-slate-800 border border-slate-700 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-slate-500 transition-colors"
            />
            <button onClick={handleSearch} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors">
              <Search className="w-4 h-4" />
            </button>
          </div>
          <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1) }}
            className="bg-slate-800 border border-slate-700 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-slate-500 transition-colors" />
          <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setPage(1) }}
            className="bg-slate-800 border border-slate-700 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-slate-500 transition-colors" />
          <select value={visibility} onChange={e => { setVisibility(e.target.value); setPage(1) }}
            className="bg-slate-800 border border-slate-700 text-white text-sm px-3 py-2 rounded-lg focus:outline-none focus:border-slate-500 transition-colors">
            <option value="all">전체</option>
            <option value="public">공개</option>
            <option value="private">비공개</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left text-slate-400 text-xs uppercase tracking-wider px-4 py-3 font-medium w-10">번호</th>
                    <th className="text-left text-slate-400 text-xs uppercase tracking-wider px-4 py-3 font-medium">개설자</th>
                    <th className="text-left text-slate-400 text-xs uppercase tracking-wider px-4 py-3 font-medium">회사명</th>
                    <th className="text-left text-slate-400 text-xs uppercase tracking-wider px-4 py-3 font-medium">대표게임</th>
                    <th className="text-left text-slate-400 text-xs uppercase tracking-wider px-4 py-3 font-medium w-16">공개</th>
                    <th className="text-left text-slate-400 text-xs uppercase tracking-wider px-4 py-3 font-medium w-16">추천</th>
                    <th className="text-left text-slate-400 text-xs uppercase tracking-wider px-4 py-3 font-medium">개설시간</th>
                    <th className="w-10 px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {minihomes.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-slate-400 text-sm">
                        <Building2 className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                        결과가 없습니다
                      </td>
                    </tr>
                  ) : (
                    minihomes.map((mh, idx) => (
                      <tr key={mh._id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 text-slate-500 text-sm">{(page - 1) * 20 + idx + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {mh.userId?.profileImage ? (
                              <Image src={mh.userId.profileImage} alt="" width={24} height={24} className="w-6 h-6 rounded-full object-cover" unoptimized />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center">
                                <span className="text-slate-400 text-xs">{mh.userId?.username?.[0]?.toUpperCase()}</span>
                              </div>
                            )}
                            <span className="text-white text-sm">{mh.userId?.username}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {mh.profileImage && (
                              <Image src={mh.profileImage} alt="" width={24} height={24} className="w-6 h-6 rounded object-cover" unoptimized />
                            )}
                            <span className="text-white text-sm font-medium">{mh.companyName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {mh.representativeGameId ? (
                            <div className="flex items-center gap-2">
                              {mh.representativeGameId.iconUrl && (
                                <Image src={mh.representativeGameId.iconUrl} alt="" width={20} height={20} className="w-5 h-5 rounded object-cover" unoptimized />
                              )}
                              <span className="text-slate-300 text-sm">{mh.representativeGameId.title}</span>
                            </div>
                          ) : (
                            <span className="text-slate-500 text-sm">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleVisibilityToggle(mh)}
                            disabled={updating === mh._id}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${mh.isPublic ? 'bg-green-600' : 'bg-slate-600'}`}
                          >
                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${mh.isPublic ? 'translate-x-4' : 'translate-x-1'}`} />
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleRecommendedToggle(mh)}
                            disabled={updating === mh._id + 'rec'}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${mh.isRecommended ? 'bg-red-600' : 'bg-slate-600'}`}
                          >
                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${mh.isRecommended ? 'translate-x-4' : 'translate-x-1'}`} />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-sm">
                          {new Date(mh.createdAt).toLocaleDateString('ko-KR')}
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => handleDelete(mh)}
                            className="p-1 text-red-400 hover:text-red-300 transition-colors" title="삭제">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className={`w-8 h-8 rounded-lg text-sm transition-colors ${p === page ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                      {p}
                    </button>
                  )
                })}
                <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                  className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg text-sm text-white shadow-lg z-50 ${toast.ok ? 'bg-green-700' : 'bg-red-700'}`}>
          {toast.msg}
        </div>
      )}
    </AdminLayout>
  )
}
