import { Resend } from 'resend'

let resend: Resend | null = null
function getResend(): Resend {
  if (!resend) resend = new Resend(process.env.RESEND_API_KEY)
  return resend
}

export async function sendTempPasswordEmail(to: string, username: string, tempPassword: string) {
  const FROM = `GameUp <${process.env.EMAIL_FROM || 'no-reply@gameup.co.kr'}>`
  const { error } = await getResend().emails.send({
    from: FROM,
    to,
    subject: '[GameUp] 임시 비밀번호가 발급되었습니다',
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #111;">임시 비밀번호 발급 안내</h2>
        <p>안녕하세요, ${username}님.</p>
        <p>관리자에 의해 계정 비밀번호가 초기화되어 임시 비밀번호가 발급되었습니다.</p>
        <div style="background: #f4f4f5; border-radius: 8px; padding: 16px; margin: 16px 0; font-size: 18px; font-weight: 600; letter-spacing: 0.5px;">
          ${tempPassword}
        </div>
        <p>로그인 후 반드시 <strong>비밀번호를 새로 변경</strong>해주세요.</p>
        <p style="color: #888; font-size: 13px; margin-top: 24px;">본인이 요청하지 않은 초기화라면 즉시 GameUp 고객센터로 문의해주세요.</p>
      </div>
    `,
  })
  if (error) throw new Error(error.message || '메일 발송 실패')
}
