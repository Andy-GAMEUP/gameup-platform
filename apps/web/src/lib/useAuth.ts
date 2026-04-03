'use client'
import { useSession, signIn, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function useAuth() {
  const { data: session, status } = useSession()
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
      const sessionRes = await fetch('/api/auth/session')
      const freshSession = await sessionRes.json()
      const token = freshSession?.user?.accessToken
      if (token) localStorage.setItem('token', token)
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
      const sessionRes = await fetch('/api/auth/session')
      const freshSession = await sessionRes.json()
      const token = freshSession?.user?.accessToken
      if (token) localStorage.setItem('token', token)
      router.refresh()
    },
    logout: () => {
      localStorage.removeItem('token')
      signOut({ callbackUrl: '/' })
    },
    updateUser: (_partial: Record<string, any>) => {
      router.refresh()
    },
    loginWithKakao: () => signIn('kakao', { callbackUrl: '/' }),
    loginWithNaver: () => signIn('naver', { callbackUrl: '/' }),
  }
}
