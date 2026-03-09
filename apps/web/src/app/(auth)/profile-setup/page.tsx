'use client'
import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Gamepad2, Camera, ArrowRight, SkipForward } from 'lucide-react'

const GENRES = [
  '액션', 'RPG', '전략', '퍼즐', '스포츠', '레이싱',
  '어드벤처', '시뮬레이션', '호러', '인디', '아케이드', 'FPS',
]

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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <Gamepad2 className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold">
              <span className="text-green-400">GAME</span>
              <span className="text-white">UP</span>
            </span>
          </Link>
          <h1 className="text-3xl font-bold text-white mb-2">프로필 설정</h1>
          <p className="text-slate-400">나를 표현하는 프로필을 만들어보세요</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-8">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center overflow-hidden">
                {avatarPreview ? (
                  <Image src={avatarPreview} alt="프로필 이미지" width={96} height={96} className="w-full h-full object-cover" unoptimized />
                ) : (
                  <Camera className="w-8 h-8 text-slate-500" />
                )}
              </div>
              <label className="absolute bottom-0 right-0 w-8 h-8 bg-emerald-500 hover:bg-emerald-600 rounded-full flex items-center justify-center cursor-pointer transition-colors">
                <Camera className="w-4 h-4 text-white" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </label>
            </div>
            <p className="text-sm text-slate-500">프로필 사진 업로드 (선택)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              자기소개 <span className="text-slate-500">(선택)</span>
            </label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="간단한 자기소개를 작성해주세요..."
              maxLength={200}
              rows={3}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors resize-none"
            />
            <p className="mt-1 text-xs text-slate-500 text-right">{bio.length}/200</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">
              관심 장르 <span className="text-slate-500">(선택, 복수 선택 가능)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {GENRES.map(genre => (
                <button
                  key={genre}
                  type="button"
                  onClick={() => toggleGenre(genre)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                    selectedGenres.includes(genre)
                      ? 'bg-emerald-500 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700'
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
              className="flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-700 text-slate-400 hover:border-slate-500 hover:text-white transition-colors"
            >
              <SkipForward className="w-4 h-4" />
              나중에
            </button>
            <button
              type="button"
              onClick={handleComplete}
              className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition-colors"
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
