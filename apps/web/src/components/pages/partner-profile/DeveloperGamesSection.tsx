'use client'

import Link from 'next/link'
import { Gamepad2, Star } from 'lucide-react'
import { usePartnerProfileCtx } from './PartnerProfileContext'

export default function DeveloperGamesSection() {
  const { developerGames } = usePartnerProfileCtx()

  return (
    <div className="bg-bg-card border border-line rounded-xl p-6">
      <h2 className="text-text-primary font-semibold text-lg mb-4">개발 게임</h2>

      {developerGames.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {developerGames.map((game: any) => {
            const gameId = game._id || game.id
            return (
              <Link key={gameId} href={`/games/${gameId}`} target="_blank" rel="noopener noreferrer"
                className="group bg-bg-secondary border border-line rounded-xl overflow-hidden hover:border-accent/40 hover:shadow-lg transition-all">
                <div className="relative h-32 bg-bg-tertiary overflow-hidden">
                  {game.thumbnail ? (
                    <img src={game.thumbnail} alt={game.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Gamepad2 className="w-8 h-8 text-text-muted opacity-30" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="text-text-primary font-semibold text-sm truncate group-hover:text-accent transition-colors">{game.title}</h3>
                  <div className="flex items-center justify-between mt-2">
                    {game.genre && (
                      <span className="bg-accent/10 text-accent border border-accent/20 px-2 py-0.5 rounded-full text-xs">{game.genre}</span>
                    )}
                    <span className="flex items-center gap-1 text-xs text-text-muted ml-auto">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      {(game.rating || 0).toFixed(1)}
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      ) : (
        <div className="text-center py-10 text-text-muted">
          <Gamepad2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">오픈된 게임이 없습니다</p>
        </div>
      )}
    </div>
  )
}
