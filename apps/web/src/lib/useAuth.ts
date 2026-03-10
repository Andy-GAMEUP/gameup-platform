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
    register: async (email: string, username: string, password: string, role: 'developer' | 'player') => {
      const res = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, username, password, role }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.message || 'Registration failed')
      }
      await signIn('credentials', { email, password, redirect: false })
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
