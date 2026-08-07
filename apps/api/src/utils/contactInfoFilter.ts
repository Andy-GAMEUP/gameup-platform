// 파트너 쪽지에 이메일/전화번호가 포함되면 거래를 플랫폼 밖으로 유도할 수 있어 차단한다
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/
const PHONE_PATTERN = /(\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{4}/

export function containsContactInfo(text: string): boolean {
  return EMAIL_PATTERN.test(text) || PHONE_PATTERN.test(text)
}
