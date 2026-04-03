'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronDown, ChevronUp, Check, Gamepad2 } from 'lucide-react'

type AgreementKey = 'terms' | 'privacy' | 'marketing'

interface AgreementSection {
  key: AgreementKey
  title: string
  required: boolean
  content: string
}

const AGREEMENT_SECTIONS: AgreementSection[] = [
  {
    key: 'terms',
    title: '이용약관',
    required: true,
    content: `제1조 (목적)
본 약관은 GAMEUP(이하 "회사")이 제공하는 게임 플랫폼 서비스(이하 "서비스")의 이용과 관련하여 회사와 이용자의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.

제2조 (정의)
① "서비스"란 회사가 제공하는 게임 검색, 평가, 개발자 지원 등 모든 온라인 서비스를 의미합니다.
② "이용자"란 본 약관에 따라 회사가 제공하는 서비스를 받는 회원 및 비회원을 말합니다.
③ "회원"이란 회사에 개인정보를 제공하여 회원등록을 한 자로서 서비스를 계속적으로 이용할 수 있는 자를 말합니다.

제3조 (약관의 효력 및 변경)
① 본 약관은 서비스 화면에 게시하거나 기타의 방법으로 공지함으로써 효력이 발생합니다.
② 회사는 합리적인 사유가 발생한 경우에는 이 약관을 변경할 수 있으며, 변경된 약관은 서비스 내 공지사항을 통해 공지합니다.

제4조 (서비스의 제공 및 변경)
회사는 다음과 같은 서비스를 제공합니다.
- 게임 탐색 및 검색 서비스
- 게임 평가 및 리뷰 서비스
- 게임 개발자 지원 및 수익화 서비스
- 기타 회사가 정하는 서비스`,
  },
  {
    key: 'privacy',
    title: '개인정보 처리방침',
    required: true,
    content: `1. 개인정보의 수집 및 이용 목적
회사는 다음의 목적을 위하여 개인정보를 처리합니다.
- 회원 가입 및 관리: 회원제 서비스 이용에 따른 본인 확인, 개인 식별, 불량 회원의 부정 이용 방지
- 서비스 제공: 게임 서비스 제공, 콘텐츠 제공, 맞춤형 서비스 제공
- 마케팅 및 광고에의 활용: 신규 서비스 개발 및 맞춤 서비스 제공

2. 수집하는 개인정보의 항목
필수 항목: 이메일 주소, 비밀번호, 사용자명
선택 항목: 프로필 이미지, 자기소개, 관심 장르

3. 개인정보의 보유 및 이용 기간
회원 탈퇴 시까지 보유하며, 관련 법령에 따라 일정 기간 보관이 필요한 경우 해당 기간 동안 보관합니다.

4. 개인정보의 제3자 제공
회사는 원칙적으로 이용자의 개인정보를 외부에 제공하지 않습니다. 다만, 이용자의 동의가 있는 경우 또는 법령의 규정에 의한 경우에는 예외로 합니다.

5. 개인정보 보호책임자
담당자: 개인정보보호팀 | 이메일: privacy@gameup.com`,
  },
  {
    key: 'marketing',
    title: '마케팅 수신 동의',
    required: false,
    content: `마케팅 정보 수신 동의 (선택)

회사는 다음과 같은 마케팅 정보를 발송할 수 있습니다.
- 신규 게임 출시 알림
- 이벤트 및 프로모션 정보
- 개인화된 게임 추천
- 서비스 업데이트 소식

수신 채널: 이메일, 앱 푸시 알림

본 동의는 선택사항이며, 동의하지 않으셔도 서비스 이용에 제한이 없습니다.
마케팅 수신 동의는 언제든지 설정 페이지에서 철회할 수 있습니다.`,
  },
]

export default function AgreementPage() {
  const router = useRouter()
  const [agreements, setAgreements] = useState<Record<AgreementKey, boolean>>({
    terms: false,
    privacy: false,
    marketing: false,
  })
  const [expandedSection, setExpandedSection] = useState<AgreementKey | null>(null)

  const allRequired = agreements.terms && agreements.privacy
  const allChecked = agreements.terms && agreements.privacy && agreements.marketing

  const toggleAll = () => {
    const newValue = !allChecked
    setAgreements({ terms: newValue, privacy: newValue, marketing: newValue })
  }

  const toggleAgreement = (key: AgreementKey) => {
    setAgreements(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const toggleSection = (key: AgreementKey) => {
    setExpandedSection(prev => (prev === key ? null : key))
  }

  const handleProceed = () => {
    if (!allRequired) return
    sessionStorage.setItem('gameup_agreements', JSON.stringify(agreements))
    router.push('/register')
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <Gamepad2 className="w-7 h-7 text-text-primary" />
            </div>
            <span className="text-2xl font-bold">
              <span className="text-green-400">GAME</span>
              <span className="text-text-primary">UP</span>
            </span>
          </Link>
          <h1 className="text-3xl font-bold text-text-primary mb-2">서비스 이용 동의</h1>
          <p className="text-text-secondary">회원가입 전 아래 약관에 동의해 주세요</p>
        </div>

        <div className="bg-bg-secondary border border-line rounded-2xl p-6 space-y-4">
          <button
            type="button"
            onClick={toggleAll}
            className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
              allChecked
                ? 'border-emerald-500 bg-emerald-500/10'
                : 'border-line hover:border-line'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                allChecked ? 'bg-emerald-500' : 'bg-bg-tertiary'
              }`}
            >
              {allChecked && <Check className="w-4 h-4 text-text-primary" strokeWidth={3} />}
            </div>
            <span className={`font-semibold text-base ${allChecked ? 'text-emerald-400' : 'text-text-primary'}`}>
              전체 동의
            </span>
            <span className="ml-auto text-xs text-text-muted">(필수 + 선택 포함)</span>
          </button>

          <div className="border-t border-line" />

          <div className="space-y-3">
            {AGREEMENT_SECTIONS.map((section) => (
              <div key={section.key} className="rounded-xl border border-line overflow-hidden">
                <div className="flex items-center gap-3 p-4">
                  <button
                    type="button"
                    onClick={() => toggleAgreement(section.key)}
                    className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors border-2 ${
                      agreements[section.key]
                        ? 'bg-emerald-500 border-emerald-500'
                        : 'bg-transparent border-line hover:border-line'
                    }`}
                  >
                    {agreements[section.key] && (
                      <Check className="w-3 h-3 text-text-primary" strokeWidth={3} />
                    )}
                  </button>
                  <span className="text-text-primary font-medium flex-1">{section.title}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      section.required
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-bg-tertiary text-text-secondary'
                    }`}
                  >
                    {section.required ? '필수' : '선택'}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleSection(section.key)}
                    className="ml-1 text-text-secondary hover:text-text-primary transition-colors"
                  >
                    {expandedSection === section.key ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {expandedSection === section.key && (
                  <div className="px-4 pb-4 border-t border-line">
                    <div className="mt-3 bg-bg-primary rounded-lg p-4 max-h-48 overflow-y-auto">
                      <pre className="text-xs text-text-secondary whitespace-pre-wrap font-sans leading-relaxed">
                        {section.content}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleProceed}
              disabled={!allRequired}
              className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-bg-tertiary disabled:cursor-not-allowed disabled:text-text-muted text-text-primary font-semibold py-3 rounded-xl transition-colors"
            >
              다음
            </button>
            {!allRequired && (
              <p className="text-center text-xs text-text-muted mt-2">
                필수 약관에 동의해야 계속할 수 있습니다
              </p>
            )}
          </div>
        </div>

        <p className="text-center text-sm text-text-muted mt-6">
          이미 계정이 있으신가요?{' '}
          <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-medium">
            로그인하기
          </Link>
        </p>
      </div>
    </div>
  )
}
