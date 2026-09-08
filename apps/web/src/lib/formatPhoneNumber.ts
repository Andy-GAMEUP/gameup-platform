// 입력 중인 숫자를 한국 전화번호 형식(02-000-0000, 010-0000-0000 등)으로 자동 변환
export function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)

  if (digits.startsWith('02')) {
    if (digits.length < 3) return digits
    if (digits.length < 6) return `${digits.substr(0, 2)}-${digits.substr(2)}`
    if (digits.length < 10) return `${digits.substr(0, 2)}-${digits.substr(2, 3)}-${digits.substr(5)}`
    return `${digits.substr(0, 2)}-${digits.substr(2, 4)}-${digits.substr(6)}`
  }

  if (digits.length < 4) return digits
  if (digits.length < 7) return `${digits.substr(0, 3)}-${digits.substr(3)}`
  if (digits.length < 11) return `${digits.substr(0, 3)}-${digits.substr(3, 3)}-${digits.substr(6)}`
  return `${digits.substr(0, 3)}-${digits.substr(3, 4)}-${digits.substr(7)}`
}
