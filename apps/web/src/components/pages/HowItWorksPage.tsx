'use client'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Button from '@/components/Button'
import Badge from '@/components/Badge'
import { Card } from '@/components/Card'
import {
  UserPlus,
  Search,
  Play,
  MessageCircle,
  Trophy,
  Shield,
  Star,
  Gift,
  ChevronRight,
  Gamepad2,
} from 'lucide-react'

export default function HowItWorksPage() {
  const steps = [
    {
      icon: <UserPlus className="w-8 h-8" />,
      title: "1. 가입하기",
      description: "무료로 계정을 만들고 프로필을 설정하세요",
      details: [
        "이메일 또는 소셜 계정으로 간편 가입",
        "관심 게임 장르 선택",
        "플레이 스타일 및 경험 설정",
        "베타 테스트 알림 설정",
      ],
    },
    {
      icon: <Search className="w-8 h-8" />,
      title: "2. 게임 탐색",
      description: "다양한 베타 테스트 게임을 둘러보세요",
      details: [
        "장르별, 플랫폼별 게임 검색",
        "게임 상세 정보 및 트레일러 확인",
        "다른 테스터들의 리뷰 읽기",
        "테스트 일정 및 조건 확인",
      ],
    },
    {
      icon: <Play className="w-8 h-8" />,
      title: "3. 베타 참여",
      description: "선정되면 게임을 다운로드하고 플레이하세요",
      details: [
        "원하는 게임에 베타 신청",
        "선정 결과 이메일 확인",
        "게임 클라이언트 다운로드",
        "베타 테스트 가이드 숙지",
      ],
    },
    {
      icon: <MessageCircle className="w-8 h-8" />,
      title: "4. 피드백 제공",
      description: "경험을 공유하고 게임 개선에 기여하세요",
      details: [
        "버그 및 이슈 리포트 작성",
        "게임 플레이 피드백 제출",
        "개발진과 직접 소통",
        "설문조사 및 인터뷰 참여",
      ],
    },
  ]

  const benefits = [
    {
      icon: <Trophy className="w-6 h-6" />,
      title: "조기 액세스",
      description: "정식 출시 전 게임을 먼저 경험하세요",
    },
    {
      icon: <Gift className="w-6 h-6" />,
      title: "특별 보상",
      description: "베타 전용 아이템과 특전을 받으세요",
    },
    {
      icon: <MessageCircle className="w-6 h-6" />,
      title: "개발진 소통",
      description: "게임 개발자와 직접 대화하세요",
    },
    {
      icon: <Star className="w-6 h-6" />,
      title: "게임에 영향력",
      description: "여러분의 의견이 게임을 만들어갑니다",
    },
  ]

  const requirements = [
    {
      title: "시스템 요구사항",
      items: [
        "안정적인 인터넷 연결",
        "게임별 최소 사양 충족",
        "충분한 저장 공간",
      ],
    },
    {
      title: "테스터 자격",
      items: [
        "만 14세 이상",
        "게임에 대한 열정",
        "건설적인 피드백 제공 의지",
      ],
    },
    {
      title: "참여 의무",
      items: [
        "정기적인 플레이",
        "피드백 제출",
        "NDA(비밀유지계약) 준수",
      ],
    },
  ]

  const faqs = [
    {
      question: "베타 테스트 참여는 무료인가요?",
      answer:
        "네, 모든 베타 테스트는 완전 무료입니다. 오히려 참여에 대한 보상을 받으실 수 있습니다.",
    },
    {
      question: "모든 게임에 참여할 수 있나요?",
      answer:
        "각 게임마다 테스터 수가 제한되어 있어 선착순 또는 선발 과정을 거칩니다. 프로필을 잘 작성하면 선정 확률이 높아집니다.",
    },
    {
      question: "베타 테스트 기간은 얼마나 되나요?",
      answer:
        "게임마다 다르지만 일반적으로 2주에서 3개월 사이입니다. 각 게임의 상세 페이지에서 확인하실 수 있습니다.",
    },
    {
      question: "모바일 게임도 테스트할 수 있나요?",
      answer:
        "네, PC, 콘솔, 모바일 등 다양한 플랫폼의 게임이 있습니다. 원하는 플랫폼으로 필터링할 수 있습니다.",
    },
  ]

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <Navbar />

      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 bg-purple-500/20 text-purple-300 border-purple-500/50">
              가이드
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              베타 테스트 참여 방법
            </h1>
            <p className="text-xl text-text-secondary max-w-2xl mx-auto">
              4단계로 간단하게 시작하고 게임의 미래를 함께 만들어가세요
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-12 mb-20">
            {steps.map((step, index) => (
              <div
                key={index}
                className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center"
              >
                <div className={index % 2 === 1 ? "lg:order-2" : ""}>
                  <Card className="bg-bg-secondary border-line h-full">
                    <div className="p-8">
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center mb-6">
                        {step.icon}
                      </div>
                      <h2 className="text-2xl font-bold mb-4">{step.title}</h2>
                      <p className="text-text-secondary mb-6">{step.description}</p>
                      <ul className="space-y-3">
                        {step.details.map((detail, idx) => (
                          <li key={idx} className="flex items-start gap-3">
                            <ChevronRight className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                            <span className="text-text-secondary">{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </Card>
                </div>
                <div className={index % 2 === 1 ? "lg:order-1" : ""}>
                  <div className="text-center lg:text-left">
                    <div className="text-8xl md:text-9xl font-bold text-purple-500/10 select-none">
                      0{index + 1}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Benefits */}
          <section className="mb-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                베타 테스터의 혜택
              </h2>
              <p className="text-text-secondary">
                단순한 게임 플레이를 넘어선 특별한 경험
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {benefits.map((benefit, index) => (
                <Card
                  key={index}
                  className="bg-bg-secondary border-line hover:border-purple-500/50 transition-all"
                >
                  <div className="p-6 text-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                      {benefit.icon}
                    </div>
                    <h3 className="font-bold mb-2">{benefit.title}</h3>
                    <p className="text-sm text-text-secondary">{benefit.description}</p>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* Requirements */}
          <section className="mb-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">참여 요건</h2>
              <p className="text-text-secondary">베타 테스트 참여를 위한 기본 조건</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {requirements.map((req, index) => (
                <Card key={index} className="bg-bg-secondary border-line">
                  <div className="p-6">
                    <h3 className="font-bold mb-4 text-purple-400">
                      {req.title}
                    </h3>
                    <ul className="space-y-3">
                      {req.items.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <div className="w-1.5 h-1.5 bg-purple-400 rounded-full mt-2 flex-shrink-0" />
                          <span className="text-text-secondary text-sm">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section className="mb-20">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">자주 묻는 질문</h2>
              <p className="text-text-secondary">궁금한 점을 빠르게 해결하세요</p>
            </div>
            <div className="max-w-3xl mx-auto space-y-4">
              {faqs.map((faq, index) => (
                <Card key={index} className="bg-bg-secondary border-line">
                  <div className="p-6">
                    <h3 className="font-bold mb-3 text-lg">{faq.question}</h3>
                    <p className="text-text-secondary">{faq.answer}</p>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section>
            <Card className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border-purple-500/50">
              <div className="p-12 text-center">
                <Shield className="w-16 h-16 mx-auto mb-6 text-purple-400" />
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  준비되셨나요?
                </h2>
                <p className="text-text-secondary mb-8 max-w-2xl mx-auto">
                  지금 바로 가입하고 흥미진진한 베타 게임을 경험해보세요
                </p>
                <Link href="/register">
                  <Button
                    size="lg"
                    className="bg-white text-text-primary hover:bg-bg-tertiary"
                  >
                    무료로 시작하기
                    <ChevronRight className="w-5 h-5 ml-1" />
                  </Button>
                </Link>
              </div>
            </Card>
          </section>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-bg-secondary border-t border-line mt-20">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-accent to-accent-hover rounded-lg flex items-center justify-center">
                  <Gamepad2 className="w-5 h-5" />
                </div>
                <span className="font-bold">
                  <span className="text-accent">GAME</span>
                  <span className="text-text-primary">UP</span>
                </span>
              </div>
              <p className="text-sm text-text-secondary">
                게임의 미래를 함께 만들어가는 베타 테스트 플랫폼
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-4">플랫폼</h3>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li>
                  <Link href="/" className="hover:text-text-primary transition-colors">
                    베타존
                  </Link>
                </li>
                <li>
                  <Link href="/gameup_platform" className="hover:text-text-primary transition-colors">
                    플랫폼 소개
                  </Link>
                </li>
                <li>
                  <Link href="/community" className="hover:text-text-primary transition-colors">
                    커뮤니티
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">지원</h3>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li>
                  <a href="#" className="hover:text-text-primary transition-colors">
                    FAQ
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-text-primary transition-colors">
                    고객센터
                  </a>
                </li>
                <li>
                  <Link href="/dashboard" className="hover:text-text-primary transition-colors">
                    개발자 센터
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">법적 고지</h3>
              <ul className="space-y-2 text-sm text-text-secondary">
                <li>
                  <a href="#" className="hover:text-text-primary transition-colors">
                    이용약관
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-text-primary transition-colors">
                    개인정보처리방침
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-text-primary transition-colors">
                    쿠키 정책
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-line text-center text-sm text-text-secondary">
            <p>&copy; 2026 GameUP. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
