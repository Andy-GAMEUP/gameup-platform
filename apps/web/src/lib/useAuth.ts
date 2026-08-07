'use client'
import { useSession, signIn, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

async function refreshToken(): Promise<void> {
  const sessionRes = await fetch('/api/auth/session')
  const freshSession = await sessionRes.json()
  const token = freshSession?.user?.accessToken
  if (token) localStorage.setItem('token', token)
}

export function useAuth() {
  const { data: session, status, update } = useSession()
  const router = useRouter()

  const accessToken = (session?.user as any)?.accessToken as string | undefined

  useEffect(() => {
    if (accessToken) {
      localStorage.setItem('token', accessToken)
    }
  }, [accessToken])

  const user = session?.user ? {
    id: session.user.id,
    email: session.user.email ?? '',
    username: (session.user as any).username ?? session.user.name ?? '',
    role: ((session.user as any).role ?? 'player') as 'developer' | 'player' | 'admin',
    adminLevel: ((session.user as any).adminLevel ?? null) as 'super' | 'normal' | 'monitor' | null,
    memberType: ((session.user as any).memberType ?? 'individual') as 'individual' | 'corporate',
    approvalStatus: ((session.user as any).approvalStatus ?? 'pending') as 'pending' | 'approved' | 'rejected',
    companyInfo: (session.user as any).companyInfo as any,
    contactPerson: (session.user as any).contactPerson as any,
    profileImage: (session.user as any).profileImage as string | null,
    level: ((session.user as any).level ?? 1) as number,
    activityScore: ((session.user as any).activityScore ?? 0) as number,
    bio: undefined as string | undefined,
    favoriteGenres: undefined as string[] | undefined,
  } : null

  return {
    user,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
    login: async (email: string, password: string) => {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })
      if (result?.error) throw new Error(result.error)
      await refreshToken()
      router.refresh()
    },
    register: async (data: { email: string; username: string; password: string; role: 'developer' | 'player'; memberType?: string; companyInfo?: any; contactPerson?: any; skipLogin?: boolean }) => {
      const res = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const resData = await res.json()
        throw new Error(resData.message || 'Registration failed')
      }
      // 기업회원은 관리자 승인 전까지 로그인하지 않음
      if (data.skipLogin) return
      await signIn('credentials', { email: data.email, password: data.password, redirect: false })
      await refreshToken()
      router.refresh()
    },
    logout: () => {
      localStorage.removeItem('token')
      signOut({ callbackUrl: '/' })
    },
    updateUser: async (_partial: Record<string, any>) => {
      // update()를 인자 없이 호출하면 트리거 없는 단순 재조회만 발생해
      // auth.ts jwt 콜백의 trigger==='update' 분기(프로필 재조회)가 실행되지 않는다.
      // 빈 객체라도 넘겨야 실제로 서버에서 최신 프로필을 다시 가져온다.
      await update({})
      router.refresh()
    },
    loginWithKakao: () => signIn('kakao', { callbackUrl: '/' }),
    loginWithNaver: () => signIn('naver', { callbackUrl: '/' }),
  }
}
