'use client'
import { useState, useEffect } from 'react'
import AdminLayout from '@/components/AdminLayout'
import adminService, { AdminUser } from '@/services/adminService'

const ROLE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  admin: { label: '관리자', color: 'text-red-300', bg: 'bg-red-600/20 border-red-500/30' },
  developer: { label: '개발자', color: 'text-purple-300', bg: 'bg-purple-600/20 border-purple-500/30' },
  player: { label: '플레이어', color: 'text-blue-300', bg: 'bg-blue-600/20 border-blue-500/30' },
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [modalUser, setModalUser] = useState<AdminUser | null>(null)
  const [modalAction, setModalAction] = useState<'role' | 'ban' | null>(null)
  const [newRole, setNewRole] = useState('')
  const [banReason, setBanReason] = useState('')
  const [bannedUntil, setBannedUntil] = useState('')

  const loadUsers = async () => {
    setLoading(true)
    try {
      const params: Record<string, unknown> = { page, limit: 15 }
      if (search) params.search = search
      if (roleFilter !== 'all') params.role = roleFilter

      const data = await adminService.getUsers(params as Parameters<typeof adminService.getUsers>[0])
      setUsers(data.users)
      setTotal(data.total)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadUsers() }, [roleFilter, search, page])

  const handleRoleChange = async () => {
    if (!modalUser || !newRole) return
    try {
      await adminService.updateUserRole(modalUser._id, newRole)
      setModalUser(null)
      loadUsers()
    } catch (err) {
      console.error(err)
    }
  }

  const handleBanToggle = async (activate: boolean) => {
    if (!modalUser) return
    try {
      await adminService.banUser(modalUser._id, {
        isActive: activate,
        banReason: activate ? undefined : banReason,
        bannedUntil: activate ? undefined : bannedUntil || undefined
      })
      setModalUser(null)
      setBanReason('')
      setBannedUntil('')
      loadUsers()
    } catch (err) {
      console.error(err)
    }
  }

  const openModal = (user: AdminUser, action: 'role' | 'ban') => {
    setModalUser(user)
    setModalAction(action)
    setNewRole(user.role)
    setBanReason('')
    setBannedUntil('')
  }

  const totalPages = Math.ceil(total / 15)

  return (
    <AdminLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-white text-xl font-bold">회원 관리</h2>
          <span className="text-slate-400 text-sm">{loading ? '로딩 중...' : `총 ${total}명`}</span>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex gap-2">
            {['all', 'admin', 'developer', 'player'].map((r) => (
              <button
                key={r}
                onClick={() => { setRoleFilter(r); setPage(1) }}
                className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                  roleFilter === r ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                }`}
              >
                {{ all: '전체', admin: '관리자', developer: '개발자', player: '플레이어' }[r]}
              </button>
            ))}
          </div>
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="이름 또는 이메일 검색..."
            className="bg-slate-800 border border-slate-700 text-white rounded px-3 py-1.5 text-sm placeholder-slate-500 flex-1 max-w-xs"
          />
        </div>

        <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="text-left px-4 py-3">사용자명</th>
                <th className="text-left px-4 py-3">이메일</th>
                <th className="text-left px-4 py-3">역할</th>
                <th className="text-left px-4 py-3">상태</th>
                <th className="text-left px-4 py-3">정지 사유</th>
                <th className="text-left px-4 py-3">가입일</th>
                <th className="text-left px-4 py-3">액션</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-8 text-slate-500">로딩 중...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-8 text-slate-500">회원이 없습니다</td></tr>
              ) : users.map((user) => {
                const rl = ROLE_LABELS[user.role] || { label: user.role, color: 'text-slate-400', bg: 'bg-slate-800' }
                return (
                  <tr key={user._id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="px-4 py-3 text-white font-medium">{user.username}</td>
                    <td className="px-4 py-3 text-slate-300">{user.email}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded border ${rl.bg} ${rl.color}`}>{rl.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      {user.isActive ? (
                        <span className="text-green-400 text-xs">활성</span>
                      ) : (
                        <span className="text-red-400 text-xs">정지됨</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{user.banReason || '-'}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">{new Date(user.createdAt).toLocaleDateString('ko-KR')}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button onClick={() => openModal(user, 'role')} className="text-xs bg-purple-600/20 text-purple-400 border border-purple-500/30 px-2 py-1 rounded hover:bg-purple-600/40 transition-colors">역할</button>
                        {user.isActive ? (
                          <button onClick={() => openModal(user, 'ban')} className="text-xs bg-red-600/20 text-red-400 border border-red-500/30 px-2 py-1 rounded hover:bg-red-600/40 transition-colors">정지</button>
                        ) : (
                          <button onClick={() => handleBanToggle(true)} className="text-xs bg-green-600/20 text-green-400 border border-green-500/30 px-2 py-1 rounded hover:bg-green-600/40 transition-colors" onMouseDown={() => setModalUser(user)}>해제</button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex gap-2 justify-center">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded text-sm ${page === p ? 'bg-red-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>{p}</button>
            ))}
          </div>
        )}
      </div>

      {/* 역할 변경 모달 */}
      {modalUser && modalAction === 'role' && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setModalUser(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white font-bold text-lg mb-4">역할 변경</h3>
            <p className="text-slate-400 text-sm mb-4"><span className="text-white">{modalUser.username}</span>의 역할을 변경합니다</p>
            <div className="space-y-2 mb-4">
              {['developer', 'player', 'admin'].map((r) => (
                <label key={r} className={`flex items-center gap-3 p-3 rounded border cursor-pointer transition-colors ${newRole === r ? 'border-red-500/50 bg-red-600/10' : 'border-slate-700 hover:border-slate-600'}`}>
                  <input type="radio" value={r} checked={newRole === r} onChange={() => setNewRole(r)} className="accent-red-500" />
                  <span className="text-slate-300 capitalize">{{ developer: '개발자', player: '플레이어', admin: '관리자' }[r]}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={handleRoleChange} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded text-sm font-medium transition-colors">변경</button>
              <button onClick={() => setModalUser(null)} className="flex-1 border border-slate-700 text-slate-400 hover:text-white py-2 rounded text-sm transition-colors">취소</button>
            </div>
          </div>
        </div>
      )}

      {/* 정지 모달 */}
      {modalUser && modalAction === 'ban' && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setModalUser(null)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-white font-bold text-lg mb-4">사용자 정지</h3>
            <p className="text-slate-400 text-sm mb-4"><span className="text-white">{modalUser.username}</span>을 정지하시겠습니까?</p>
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-slate-400 text-xs mb-1">정지 사유</label>
                <textarea value={banReason} onChange={(e) => setBanReason(e.target.value)} rows={2} className="w-full bg-slate-800 border border-slate-700 text-white rounded px-3 py-2 text-sm" placeholder="정지 사유..." />
              </div>
              <div>
                <label className="block text-slate-400 text-xs mb-1">정지 종료일 (선택, 미입력시 영구 정지)</label>
                <input type="date" value={bannedUntil} onChange={(e) => setBannedUntil(e.target.value)} className="w-full bg-slate-800 border border-slate-700 text-white rounded px-3 py-2 text-sm" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => handleBanToggle(false)} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded text-sm font-medium transition-colors">정지</button>
              <button onClick={() => setModalUser(null)} className="flex-1 border border-slate-700 text-slate-400 hover:text-white py-2 rounded text-sm transition-colors">취소</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
