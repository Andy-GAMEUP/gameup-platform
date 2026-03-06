'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authService } from '@/services/authService'

interface User {
  id: string
  email: string
  username: string
  role: 'developer' | 'player' | 'admin'
  bio?: string
  favoriteGenres?: string[]
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, username: string, password: string, role: 'developer' | 'player') => Promise<void>
  logout: () => void
  updateUser: (partial: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      authService.getProfile()
        .then((data) => setUser(data.user))
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setIsLoading(false))
    } else {
      setIsLoading(false)
    }
  }, [])

  const login = async (email: string, password: string) => {
    const data = await authService.login({ email, password })
    setUser(data.user)
  }

  const register = async (email: string, username: string, password: string, role: 'developer' | 'player') => {
    const data = await authService.register({ email, username, password, role })
    setUser(data.user)
  }

  const logout = () => {
    authService.logout()
    setUser(null)
  }

  const updateUser = (partial: Partial<User>) => {
    setUser((prev) => prev ? { ...prev, ...partial } : prev)
  }

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      register,
      logout,
      updateUser
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
