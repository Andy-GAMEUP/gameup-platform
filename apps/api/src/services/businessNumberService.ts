const STATUS_URL = 'https://api.odcloud.kr/api/nts-businessman/v1/status'

export interface BusinessNumberCheckResult {
  valid: boolean
  reason?: 'not_found' | 'closed' | 'suspended'
}

// 국세청 사업자등록번호 상태조회 (공공데이터포털) - 번호가 실존하고 휴폐업 상태가 아닌지만 확인
export const checkBusinessNumber = async (businessNumber: string): Promise<BusinessNumberCheckResult> => {
  const serviceKey = process.env.BUSINESS_NUMBER_API_KEY
  if (!serviceKey) return { valid: true } // 키 미설정 시(로컬 등) 검증을 건너뜀

  const bNo = businessNumber.replace(/-/g, '')

  try {
    const res = await fetch(`${STATUS_URL}?serviceKey=${encodeURIComponent(serviceKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ b_no: [bNo] }),
    })
    const data = await res.json() as { data?: { b_no: string; b_stt_cd?: string }[] }
    const entry = data.data?.[0]

    if (!entry || !entry.b_stt_cd) return { valid: false, reason: 'not_found' }
    if (entry.b_stt_cd === '01') return { valid: true }
    if (entry.b_stt_cd === '02') return { valid: false, reason: 'suspended' }
    return { valid: false, reason: 'closed' }
  } catch {
    // 외부 API 오류 시에는 가입을 막지 않음(가용성 우선)
    return { valid: true }
  }
}
