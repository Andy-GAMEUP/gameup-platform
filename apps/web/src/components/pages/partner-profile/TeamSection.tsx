'use client'

import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UserPlus, X } from 'lucide-react'
import { partnerService } from '@/services/partnerService'
import { usePartnerProfileCtx } from './PartnerProfileContext'

export default function TeamSection() {
  const { id, partner, isOwnProfile } = usePartnerProfileCtx()
  const queryClient = useQueryClient()

  const [teamSearch, setTeamSearch] = useState('')
  const [teamError, setTeamError] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedUser, setSelectedUser] = useState<{ _id: string; username: string; email: string } | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [debouncedQ, setDebouncedQ] = useState('')

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const { data: searchData } = useQuery({
    queryKey: ['teamUserSearch', debouncedQ],
    queryFn: () => partnerService.searchUsers(debouncedQ),
    enabled: debouncedQ.length >= 1 && !selectedUser,
  })
  const suggestions = searchData?.users || []

  const addMutation = useMutation({
    mutationFn: (username: string) => partnerService.addTeamMember(id, username),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partnerChannel', id] })
      setTeamSearch('')
      setSelectedUser(null)
      setTeamError('')
      setShowSuggestions(false)
    },
    onError: (err: any) => setTeamError(err?.response?.data?.message || '팀원 추가 실패'),
  })

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => partnerService.removeTeamMember(id, memberId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['partnerChannel', id] }),
  })

  if (!isOwnProfile) {
    return <div className="px-5 py-14 text-center text-text-muted text-sm">접근 권한이 없습니다.</div>
  }

  return (
    <div className="space-y-4">
      <div className="bg-bg-card border border-line rounded-xl p-5">
        <h2 className="text-text-primary font-semibold text-lg mb-1">팀원 추가</h2>
        <p className="text-text-muted text-xs mb-4">게임회원의 사용자명 또는 이메일을 입력해 채널 수정 권한을 부여합니다</p>
        <div className="flex gap-2">
          <div ref={searchRef} className="relative flex-1">
            <input
              value={teamSearch}
              onChange={e => {
                const v = e.target.value
                setTeamSearch(v)
                setSelectedUser(null)
                setTeamError('')
                setShowSuggestions(true)
                if (debounceRef.current) clearTimeout(debounceRef.current)
                debounceRef.current = setTimeout(() => setDebouncedQ(v.trim()), 250)
              }}
              onFocus={() => teamSearch && setShowSuggestions(true)}
              onKeyDown={e => {
                if (e.key === 'Enter' && teamSearch.trim()) {
                  addMutation.mutate(selectedUser?.username || teamSearch.trim())
                }
              }}
              placeholder="사용자명 또는 이메일 입력"
              className="w-full bg-bg-tertiary border border-line rounded-lg px-3 py-2 text-sm text-text-primary placeholder-text-muted focus:outline-none focus:border-accent"
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-bg-card border border-line rounded-xl shadow-xl z-50 overflow-hidden">
                {suggestions.map(u => (
                  <button
                    key={u._id}
                    type="button"
                    onMouseDown={e => {
                      e.preventDefault()
                      setTeamSearch(u.username)
                      setSelectedUser(u)
                      setShowSuggestions(false)
                      setTeamError('')
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-bg-tertiary transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded-full bg-accent/40 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                      {u.username[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-text-primary text-sm font-medium">{u.username}</p>
                      <p className="text-text-muted text-xs truncate">{u.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={() => teamSearch.trim() && addMutation.mutate(selectedUser?.username || teamSearch.trim())}
            disabled={addMutation.isPending || !teamSearch.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent-hover text-text-primary text-sm font-medium rounded-lg transition-colors disabled:opacity-50 self-start"
          >
            <UserPlus className="w-4 h-4" />
            추가
          </button>
        </div>
        {teamError && <p className="text-danger text-xs mt-2">{teamError}</p>}
      </div>

      <div className="bg-bg-card border border-line rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-line">
          <h2 className="text-text-primary font-semibold">팀원 목록 ({partner.teamMembers?.length || 0})</h2>
        </div>
        {!partner.teamMembers?.length ? (
          <div className="px-5 py-12 text-center text-text-muted text-sm">등록된 팀원이 없습니다.</div>
        ) : partner.teamMembers.map((m) => (
          <div key={m.userId._id} className="flex items-center justify-between px-5 py-3 border-b border-line/40 last:border-b-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-accent/40 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                {m.userId.profileImage
                  ? <img src={m.userId.profileImage} alt="" className="w-full h-full object-cover rounded-full" />
                  : m.userId.username?.[0]?.toUpperCase()}
              </div>
              <div>
                <p className="text-text-primary text-sm font-medium">{m.userId.username}</p>
                <p className="text-text-muted text-xs">{new Date(m.addedAt).toLocaleDateString('ko-KR')} 추가됨</p>
              </div>
            </div>
            <button
              onClick={() => removeMutation.mutate(m.userId._id)}
              disabled={removeMutation.isPending}
              className="flex items-center gap-1 text-xs text-danger hover:text-danger/80 border border-danger/30 hover:border-danger/60 px-2.5 py-1 rounded-md transition-colors disabled:opacity-50"
            >
              <X className="w-3 h-3" />
              제거
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
