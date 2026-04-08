'use client'
import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Gamepad2, Camera, ArrowRight, SkipForward } from 'lucide-react'

import { PROFILE_GENRES as GENRES } from '@/constants/game'

export default function ProfileSetupPage() {
  const router = useRouter()
  const [bio, setBio] = useState('')
  const [selectedGenres, setSelectedGenres] = useState<string[]>([])
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev =>
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    )
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setAvatarPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleComplete = () => {
    router.push('/games')
  }

  const handleSkip = () => {
    router.push('/games')
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
          <h1 className="text-3xl font-bold text-text-primary mb-2">프로필 설정</h1>
          <p className="text-text-secondary">나를 표현하는 프로필을 만들어보세요</p>
        </div>

        <div className="bg-bg-secondary border border-line rounded-2xl p-8 space-y-8">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-bg-tertiary border-2 border-line flex items-center justify-center overflow-hidden">
                {avatarPreview ? (
                  <Image src={avatarPreview} alt="프로필 이미지" width={96} height={96} className="w-full h-full object-cover" unoptimized />
                ) : (
                  <Camera className="w-8 h-8 text-text-muted" />
                )}
              </div>
              <label className="absolute bottom-0 right-0 w-8 h-8 bg-emerald-500 hover:bg-emerald-600 rounded-full flex items-center justify-center cursor-pointer transition-colors">
                <Camera className="w-4 h-4 text-text-primary" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-sm text-text-muted">프로필 사진 업로드 (선택)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-2">
              자기소개 <span className="text-text-muted">(선택)</span>
            </label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="간단한 자기소개를 작성해주세요..."
              maxLength={200}
              rows={3}
              className="w-full bg-bg-tertiary border border-line rounded-lg px-4 py-3 text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors resize-none"
            />
            <p className="mt-1 text-xs text-text-muted text-right">{bio.length}/200</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-3">
              관심 장르 <span className="text-text-muted">(선택, 복수 선택 가능)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {GENRES.map(genre => (
                <button
                  key={genre}
                  type="button"
                  onClick={() => toggleGenre(genre)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    selectedGenres.includes(genre)
                      ? 'bg-emerald-500 text-text-primary'
                      : 'bg-bg-tertiary text-text-secondary hover:bg-bg-tertiary hover:text-text-primary border border-line'
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
            {selectedGenres.length > 0 && (
              <p className="mt-2 text-xs text-emerald-400">{selectedGenres.length}개 선택됨</p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleSkip}
              className="flex items-center gap-2 px-5 py-3 rounded-xl border border-line text-text-secondary hover:border-line hover:text-text-primary transition-colors"
            >
              <SkipForward className="w-4 h-4" />
              나중에
            </button>
            <button
              type="button"
              onClick={handleComplete}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-text-primary font-semibold py-3 rounded-xl transition-colors"
            >
              시작하기
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
