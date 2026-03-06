export function validateEmail(email: string): { valid: boolean; message?: string } {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!email) return { valid: false, message: '이메일을 입력해주세요.' }
  if (!re.test(email)) return { valid: false, message: '올바른 이메일 형식이 아닙니다.' }
  return { valid: true }
}

export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (!password) return { valid: false, message: '비밀번호를 입력해주세요.' }
  if (password.length < 8 || password.length > 20)
    return { valid: false, message: '비밀번호는 8-20자여야 합니다.' }
  if (!/[a-z]/.test(password)) return { valid: false, message: '소문자를 포함해야 합니다.' }
  if (!/[A-Z]/.test(password)) return { valid: false, message: '대문자를 포함해야 합니다.' }
  if (!/[0-9]/.test(password)) return { valid: false, message: '숫자를 포함해야 합니다.' }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password))
    return { valid: false, message: '특수문자를 포함해야 합니다.' }
  return { valid: true }
}

export function validateNickname(nickname: string): { valid: boolean; message?: string } {
  if (!nickname) return { valid: false, message: '닉네임을 입력해주세요.' }
  if (nickname.length < 2 || nickname.length > 20)
    return { valid: false, message: '닉네임은 2-20자여야 합니다.' }
  if (!/^[가-힣a-zA-Z0-9]+$/.test(nickname))
    return { valid: false, message: '한글, 영문, 숫자만 사용 가능합니다.' }
  return { valid: true }
}
