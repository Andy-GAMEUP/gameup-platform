'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import Button from '@/components/Button'
import Badge from '@/components/Badge'
import { Card } from '@/components/Card'
import {
  Play,
  Users,
  MessageSquare,
  Trophy,
  Zap,
  Shield,
  Star,
  ChevronRight,
  Heart,
  Gamepad2,
  Loader2,
} from 'lucide-react'
import { gameService } from '@/services/gameService'
import { Game } from '@/types'

const PLACEHOLDER = 'https://via.placeholder.com/400x300/1e293b/334155?text=Game'

function FeaturedGameCard({ game }: { game: Game }) {
  const router = useRouter()
  const id = (game as any)._id || game.id

  const statusLabel =
    game.status === 'beta' ? '진행중' : game.status === 'published' ? '공개중' : '준비중'
  const statusClass =
    game.status === 'beta'
      ? 'bg-green-500/20 text-green-300 border-green-500/50'
      : 'bg-blue-500/20 text-blue-300 border-blue-500/50'

  return (
    <Card
      className="bg-slate-900 border-2 border-green-500/30 overflow-hidden hover:border-green-500 transition-all cursor-pointer group"
      onClick={() => router.push(`/games/${id}`)}
    >
      <div className="relative h-48 overflow-hidden">
        <img
          src={game.thumbnail || PLACEHOLDER}
          alt={game.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          onError={(e) => { e.currentTarget.src = PLACEHOLDER }}
        />
        <div className="absolute top-4 left-4">
          <Badge className={statusClass}>{statusLabel}</Badge>
        </div>
        <div className="absolute top-4 right-4">
          <button
            className="w-8 h-8 rounded-full bg-slate-950/70 backdrop-blur-sm flex items-center justify-center hover:bg-slate-900 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <Heart className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
      <div className="p-6">
        <h3 className="text-xl font-bold mb-2">{game.title}</h3>
        <p className="text-slate-400 mb-4 text-sm line-clamp-2">{game.description}</p>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <Users className="w-4 h-4" />
            <span>{(game.playCount || 0).toLocaleString()} 플레이</span>
          </div>
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${
                  i < Math.floor(game.rating || 0)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-slate-600'
                }`}
              />
            ))}
          </div>
        </div>
        <Button size="sm" className="w-full bg-green-600 hover:bg-green-700">
          참여하기
        </Button>
      </div>
    </Card>
  )
}

export default function HomePage() {
  const [featuredGames, setFeaturedGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    gameService
      .getAllGames({ sort: 'popular', limit: 3 } as any)
      .then((data) => setFeaturedGames(data.games || []))
      .catch(() => setFeaturedGames([]))
      .finally(() => setLoading(false))
  }, [])

  const features = [
    {
      icon: <Play className="w-6 h-6" />,
      title: '최신 게임 미리 플레이',
      description: '정식 출시 전 독점적으로 게임을 체험하세요',
    },
    {
      icon: <MessageSquare className="w-6 h-6" />,
      title: '개발진과 직접 소통',
      description: '피드백을 통해 게임 개발에 직접 참여하세요',
    },
    {
      icon: <Trophy className="w-6 h-6" />,
      title: '특별 보상 획득',
      description: '베타 참여자 전용 아이템과 특전을 받으세요',
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: '게이머 커뮤니티',
      description: '같은 관심사를 가진 게이머들과 연결되세요',
    },
  ]

  const howItWorks = [
    { step: '01', title: '가입 및 프로필 설정', description: '관심 있는 게임 장르와 플레이 스타일을 선택하세요' },
    { step: '02', title: '베타 게임 탐색', description: '다양한 베타 테스트 중인 게임을 둘러보세요' },
    { step: '03', title: '베타 신청 및 참여', description: '원하는 게임에 신청하고 선정되면 즉시 플레이하세요' },
    { step: '04', title: '피드백 제공', description: '게임 경험을 공유하고 개발에 기여하세요' },
  ]

  const testimonials = [
    { name: '김게이머', role: '베타 테스터', content: '정식 출시 전에 게임을 플레이하고 개발에 참여할 수 있어서 정말 뜻깊었습니다!', rating: 5 },
    { name: '이플레이어', role: '베타 테스터', content: '개발팀과 소통하며 내 의견이 실제 게임에 반영되는 걸 보니 자부심이 느껴져요.', rating: 5 },
    { name: '박유저', role: '베타 테스터', content: '베타 전용 보상과 커뮤니티 활동이 정말 재밌어요. 새로운 게임 친구들도 많이 만났습니다!', rating: 5 },
  ]

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-green-900/20 to-slate-950 z-10" />
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1766052631095-c16328022120?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080"
            alt="Gaming Setup"
            className="w-full h-full object-cover opacity-30"
            onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/1920x1080/1e293b/334155?text=Gaming+Setup' }}
          />
        </div>
        <div className="container mx-auto px-4 py-32 relative z-20">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="success" className="mb-6 bg-green-500/20 text-green-300 border-green-500/50">
              <Zap className="w-3 h-3 mr-1" />
              게임의 미래를 함께 만들어요
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              <span className="text-green-400">베타 테스트의</span>
              <br />
              <span className="bg-gradient-to-r from-green-400 via-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                새로운 기준
              </span>
            </h1>
            <p className="text-xl text-slate-300 mb-8">
              최신 게임을 가장 먼저 플레이하고, 개발 과정에 참여하며,
              <br />
              특별한 보상을 받으세요
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" className="bg-green-600 hover:bg-green-700 text-lg">
                  무료로 시작하기
                  <ChevronRight className="w-5 h-5 ml-1" />
                </Button>
              </Link>
              <Link href="/games">
                <Button size="lg" variant="outline" className="border-slate-600 text-slate-200 hover:bg-slate-800 text-lg">
                  게임 둘러보기
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Games */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">현재 진행중인 베타</h2>
          <p className="text-slate-400">가장 인기있는 베타 테스트에 지금 참여하세요</p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="w-8 h-8 animate-spin text-green-400" />
          </div>
        ) : featuredGames.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Gamepad2 className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg">현재 진행 중인 베타 게임이 없습니다.</p>
            <p className="text-sm mt-2">곧 새로운 게임이 등록될 예정입니다!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {featuredGames.map((game) => (
              <FeaturedGameCard key={(game as any)._id || game.id} game={game} />
            ))}
          </div>
        )}

        <div className="text-center mt-8">
          <Link href="/games">
            <Button variant="outline" className="border-slate-700 hover:bg-slate-800">
              모든 게임 보기
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="bg-slate-900/50 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="text-green-400">GameUP</span>를 선택해야 하는 이유
            </h2>
            <p className="text-slate-400">게이머와 개발자를 연결하는 최고의 플랫폼</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="bg-slate-900 border-slate-800 hover:border-green-500/50 transition-all">
                <div className="p-6 text-center">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mx-auto mb-4">
                    {feature.icon}
                  </div>
                  <h3 className="font-bold mb-2">{feature.title}</h3>
                  <p className="text-sm text-slate-400">{feature.description}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">참여 방법</h2>
          <p className="text-slate-400">4단계로 쉽게 시작하세요</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {howItWorks.map((item, index) => (
            <div key={index} className="relative">
              <div className="text-center">
                <div className="text-6xl font-bold text-green-500/20 mb-4">{item.step}</div>
                <h3 className="font-bold mb-2">{item.title}</h3>
                <p className="text-sm text-slate-400">{item.description}</p>
              </div>
              {index < howItWorks.length - 1 && (
                <div className="hidden lg:block absolute top-12 -right-3 w-6 h-0.5 bg-green-500/30" />
              )}
            </div>
          ))}
        </div>
        <div className="text-center mt-12">
          <Link href="/how-it-works">
            <Button className="bg-green-600 hover:bg-green-700">자세히 알아보기</Button>
          </Link>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-slate-900/50 py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">테스터 후기</h2>
            <p className="text-slate-400">실제 베타 테스터들의 생생한 경험담</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="bg-slate-900 border-slate-800">
                <div className="p-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-slate-300 mb-4">"{testimonial.content}"</p>
                  <div>
                    <p className="font-bold">{testimonial.name}</p>
                    <p className="text-sm text-slate-400">{testimonial.role}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20">
        <Card className="bg-gradient-to-r from-green-900/50 to-emerald-900/50 border-green-500/50">
          <div className="p-12 text-center">
            <Shield className="w-16 h-16 mx-auto mb-6 text-green-400" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">지금 바로 시작하세요</h2>
            <p className="text-slate-300 mb-8 max-w-2xl mx-auto">
              수천 명의 게이머들과 함께 최신 게임의 베타 테스트에 참여하고, 개발 과정에서 중요한 역할을 담당하세요
            </p>
            <Link href="/register">
              <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100">
                무료로 가입하기
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </Link>
          </div>
        </Card>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 mt-20">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                  <Gamepad2 className="w-5 h-5" />
                </div>
                <span className="font-bold">
                  <span className="text-green-400">GAME</span>
                  <span className="text-white">UP</span>
                </span>
              </div>
              <p className="text-sm text-slate-400">게임의 미래를 함께 만들어가는 베타 테스트 플랫폼</p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">플랫폼</h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link href="/games" className="hover:text-white transition-colors">베타존</Link></li>
                <li><Link href="/how-it-works" className="hover:text-white transition-colors">플랫폼 소개</Link></li>
                <li><Link href="/community" className="hover:text-white transition-colors">커뮤니티</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">지원</h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
                <li><a href="#" className="hover:text-white transition-colors">고객센터</a></li>
                <li><Link href="/dashboard" className="hover:text-white transition-colors">개발자 센터</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">법적 고지</h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white transition-colors">이용약관</a></li>
                <li><a href="#" className="hover:text-white transition-colors">개인정보처리방침</a></li>
                <li><a href="#" className="hover:text-white transition-colors">쿠키 정책</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-slate-800 text-center text-sm text-slate-400">
            <p>&copy; 2026 GameUP. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
