'use client'

import Link from 'next/link'
import { Gamepad2, Images, Building2, Link2, BarChart3, FolderKanban, CheckCircle2, Users, Trophy } from 'lucide-react'
import { usePartnerProfileCtx } from './PartnerProfileContext'
import { COMPANY_TYPE_LABELS } from './constants'
import IntroSection from './IntroSection'

const GAMES_PREVIEW_LIMIT = 5
const PORTFOLIO_PREVIEW_LIMIT = 6

function StatTile({ icon: Icon, label, value, tintClass, iconColorClass, badgePct }: { icon: any; label: string; value: number; tintClass: string; iconColorClass: string; badgePct?: number }) {
  return (
    <div className={`rounded-2xl p-3.5 border border-line/60 ${tintClass}`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-8 h-8 rounded-xl bg-bg-card flex items-center justify-center shadow-sm ${iconColorClass}`}>
          <Icon className="w-4 h-4" />
        </div>
        {badgePct !== undefined && (
          <span className="text-[11px] font-bold text-text-secondary bg-bg-card px-2 py-0.5 rounded-full shadow-sm tabular-nums">
            {badgePct}%
          </span>
        )}
      </div>
      <p className="text-2xl font-extrabold text-text-primary leading-none tabular-nums">
        {value}<span className="text-xs font-semibold text-text-muted ml-1">건</span>
      </p>
      <p className="text-xs text-text-muted mt-1.5">{label}</p>
    </div>
  )
}

export default function HomeSection() {
  const {
    id, partner, userProjects, isDeveloperCompany, developerGames,
    participatingProjectCount, completedParticipatingProjectCount,
  } = usePartnerProfileCtx()
  const rawCompanyTypes: string[] = (partner.userId as any)?.companyInfo?.companyType || []
  const companyTypes = rawCompanyTypes.filter(t => t !== 'developer')

  const visibleGames = developerGames.slice(0, GAMES_PREVIEW_LIMIT)
  const hasMoreGames = developerGames.length > visibleGames.length
  const remainingGamesCount = developerGames.length - visibleGames.length

  const portfolio = partner.portfolio || []
  const visiblePortfolio = portfolio.slice(0, PORTFOLIO_PREVIEW_LIMIT)
  const hasMorePortfolio = portfolio.length > visiblePortfolio.length
  const remainingPortfolioCount = portfolio.length - visiblePortfolio.length

  const registeredProjectCount = userProjects.length
  const completedRegisteredProjectCount = userProjects.filter((p: any) => p.status === 'matched').length

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-[3.2fr_1fr] gap-4">
        {/* Main column */}
        <div className="space-y-4">
          {/* Intro */}
          <IntroSection />

          {/* Portfolio preview */}
          <div className="bg-bg-card border border-line rounded-xl p-6">
            <Link href={`/partner/${id}/portfolio`} className="flex items-center justify-between mb-4 group">
              <h2 className="text-text-primary font-semibold text-lg group-hover:text-accent transition-colors">포트폴리오</h2>
              <span className="text-sm text-text-muted">{portfolio.length}건</span>
            </Link>
            {portfolio.length > 0 ? (
              <div className="flex gap-3">
                {visiblePortfolio.map((item: any, index: number) => (
                  <Link key={item._id || index} href={`/partner/${id}/portfolio?item=${index}`} target="_blank" rel="noopener noreferrer"
                    className="group w-20 flex-shrink-0">
                    <div className="aspect-square bg-bg-tertiary border border-line rounded-lg overflow-hidden group-hover:border-accent/40 transition-colors">
                      {item.thumbnailUrl ? (
                        <img src={item.thumbnailUrl} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Images className="w-4 h-4 text-text-muted opacity-30" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-text-secondary text-center mt-1 truncate group-hover:text-accent transition-colors">{item.title}</p>
                  </Link>
                ))}
                {hasMorePortfolio && (
                  <Link href={`/partner/${id}/portfolio`}
                    className="w-20 flex-shrink-0 aspect-square flex flex-col items-center justify-center gap-0.5 text-text-secondary hover:text-accent transition-colors">
                    <span className="text-sm font-semibold">+{remainingPortfolioCount}</span>
                    <span className="text-xs">그외</span>
                  </Link>
                )}
              </div>
            ) : (
              <p className="text-text-muted text-sm">등록된 포트폴리오가 없습니다.</p>
            )}
          </div>
        </div>

        {/* Side column */}
        <div className="space-y-4">
          {/* Business types */}
          <div className="bg-bg-card border border-line rounded-xl p-5">
            <h2 className="text-text-primary font-semibold mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-accent" /> 기업 형태
            </h2>
            <div className="flex flex-wrap gap-2">
              {companyTypes.length > 0
                ? companyTypes.map(t => (
                    <span key={t} className="text-sm bg-bg-tertiary text-text-secondary border border-line px-3 py-1 rounded-full">
                      {COMPANY_TYPE_LABELS[t] || t}
                    </span>
                  ))
                : <span className="text-sm text-text-muted">등록된 기업 형태 없음</span>
              }
            </div>
          </div>

          {/* Project stats */}
          <div className="bg-bg-card border border-line rounded-xl p-5">
            <h2 className="text-text-primary font-semibold mb-4 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-accent" /> 프로젝트 현황
            </h2>
            <Link href={`/partner/${id}/posts`} className="block rounded-2xl border border-line/60 bg-bg-tertiary/30 p-3 hover:border-accent/40 transition-colors group">
              <p className="text-xs font-semibold text-text-secondary mb-2.5 px-0.5 group-hover:text-accent transition-colors">내 프로젝트</p>
              <div className="grid grid-cols-2 gap-2.5">
                <StatTile icon={FolderKanban} label="등록" value={registeredProjectCount} tintClass="bg-accent/5" iconColorClass="text-accent" />
                <StatTile icon={CheckCircle2} label="완료" value={completedRegisteredProjectCount} tintClass="bg-emerald-500/5" iconColorClass="text-emerald-500" badgePct={registeredProjectCount > 0 ? Math.round((completedRegisteredProjectCount / registeredProjectCount) * 100) : 0} />
              </div>
            </Link>
            <div className="rounded-2xl border border-line/60 bg-bg-tertiary/30 p-3 mt-3">
              <p className="text-xs font-semibold text-text-secondary mb-2.5 px-0.5">프로젝트 참여</p>
              <div className="grid grid-cols-2 gap-2.5">
                <StatTile icon={Users} label="참여" value={participatingProjectCount} tintClass="bg-blue-500/5" iconColorClass="text-blue-500" />
                <StatTile icon={Trophy} label="참여 완료" value={completedParticipatingProjectCount} tintClass="bg-amber-500/5" iconColorClass="text-amber-500" badgePct={participatingProjectCount > 0 ? Math.round((completedParticipatingProjectCount / participatingProjectCount) * 100) : 0} />
              </div>
            </div>
          </div>

          {/* Developer games preview */}
          {isDeveloperCompany && developerGames.length > 0 && (
            <div className="bg-bg-card border border-line rounded-xl p-5">
              <h2 className="text-text-primary font-semibold mb-3 flex items-center gap-2">
                <Gamepad2 className="w-4 h-4 text-accent" /> 개발 게임 종류
              </h2>
              <div className="flex flex-wrap gap-2">
                {visibleGames.map((game: any) => {
                  const gameId = game._id || game.id
                  return (
                    <Link key={gameId} href={`/games/${gameId}`} target="_blank" rel="noopener noreferrer"
                      className="group w-[4.6rem] flex-shrink-0">
                      <div className="aspect-square bg-bg-tertiary border border-line rounded-lg overflow-hidden group-hover:border-accent/40 transition-colors">
                        {game.thumbnail ? (
                          <img src={game.thumbnail} alt={game.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Gamepad2 className="w-4 h-4 text-text-muted opacity-30" />
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-text-secondary text-center mt-1 truncate group-hover:text-accent transition-colors">{game.title}</p>
                    </Link>
                  )
                })}
                {hasMoreGames && (
                  <Link href={`/partner/${id}/games`}
                    className="w-[4.6rem] flex-shrink-0 aspect-square flex flex-col items-center justify-center gap-0.5 text-text-secondary hover:text-accent transition-colors">
                    <span className="text-sm font-semibold">+{remainingGamesCount}</span>
                    <span className="text-xs">그외</span>
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* External link */}
          {partner.externalUrl && (
            <div className="bg-bg-card border border-line rounded-xl p-5">
              <h2 className="text-text-primary font-semibold mb-3 flex items-center gap-2">
                <Link2 className="w-4 h-4 text-accent" /> 외부 링크
              </h2>
              <a href={partner.externalUrl} target="_blank" rel="noopener noreferrer"
                className="text-accent hover:underline text-sm break-all">{partner.externalUrl}</a>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
