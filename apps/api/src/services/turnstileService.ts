const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export const verifyTurnstileToken = async (token: string | undefined, remoteIp?: string): Promise<boolean> => {
  if (!token) return false

  const secretKey = process.env.TURNSTILE_SECRET_KEY
  if (!secretKey) return true // 키 미설정 시(로컬 등) 캡차 검증을 건너뜀

  try {
    const params = new URLSearchParams()
    params.append('secret', secretKey)
    params.append('response', token)
    if (remoteIp) params.append('remoteip', remoteIp)

    const res = await fetch(VERIFY_URL, { method: 'POST', body: params })
    const data = await res.json() as { success?: boolean }
    return data.success === true
  } catch {
    return false
  }
}
