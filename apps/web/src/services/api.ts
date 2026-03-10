'use client'
import axios from 'axios'

// Vite 프록시를 사용하므로 상대 경로 사용
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '/api'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Session-based token recovery for hard navigation (page refresh)
// When the page is hard-refreshed, useAuth's useEffect hasn't fired yet
// so localStorage may not have the token. We fetch it from the Auth.js session.
let sessionTokenPromise: Promise<string | null> | null = null

function fetchSessionToken(): Promise<string | null> {
  if (!sessionTokenPromise) {
    sessionTokenPromise = fetch('/api/auth/session')
      .then(res => res.json())
      .then(session => {
        const token = session?.user?.accessToken ?? null
        if (token) localStorage.setItem('token', token)
        return token
      })
      .catch(() => null)
      .finally(() => { sessionTokenPromise = null })
  }
  return sessionTokenPromise
}

apiClient.interceptors.request.use(
  async (config) => {
    let token = localStorage.getItem('token')
    if (!token) {
      token = await fetchSessionToken()
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

export default apiClient
