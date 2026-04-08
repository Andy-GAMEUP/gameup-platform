'use client'
import { useState, useEffect } from 'react'
import minihomeService, { KeywordGroup } from '@/services/minihomeService'
import { X, Loader2, CheckCircle, ChevronRight, ChevronLeft } from 'lucide-react'

interface Props {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

type SubmitState = 'idle' | 'loading' | 'success' | 'error'

import { FORM_GENRES as GENRES, FORM_PLATFORMS as PLATFORMS } from '@/constants/game'
const TAGS = ['퍼블리셔 구함', '투자 구함']

const STEPS = ['게임 등록', '회사 정보', '키워드 선택']

export default function MiniHomeCreateModal({ isOpen, onClose, onSuccess }: Props) {
  const [step, setStep] = useState(1)
  const [submitState, setSubmitState] = useState<SubmitState>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const [gameTitle, setGameTitle] = useState('')
  const [gameGenre, setGameGenre] = useState('RPG')
  const [gameDescription, setGameDescription] = useState('')
  const [gameIconUrl, setGameIconUrl] = useState('')
  const [gameCoverUrl, setGameCoverUrl] = useState('')
  const [gameScreenshots, setGameScreenshots] = useState('')
  const [gamePlatforms, setGamePlatforms] = useState<string[]>([])

  const [companyName, setCompanyName] = useState('')
  const [introduction, setIntroduction] = useState('')
  const [profileImage, setProfileImage] = useState('')
  const [coverImage, setCoverImage] = useState('')
  const [website, setWebsite] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const [keywordGroups, setKeywordGroups] = useState<KeywordGroup[]>([])
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([])
  const [keywordsLoading, setKeywordsLoading] = useState(false)

  useEffect(() => {
    if (step === 3) {
      setKeywordsLoading(true)
      minihomeService.getKeywords()
        .then(data => setKeywordGroups(data.groups ?? []))
        .catch(() => setKeywordGroups([]))
        .finally(() => setKeywordsLoading(false))
    }
  }, [step])

  const togglePlatform = (p: string) => {
    setGamePlatforms(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
  }

  const toggleTag = (t: string) => {
    setSelectedTags(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  const toggleKeyword = (kw: string) => {
    setSelectedKeywords(prev => prev.includes(kw) ? prev.filter(x => x !== kw) : [...prev, kw])
  }

  const goNext = () => {
    setErrorMsg('')
    if (step === 1) {
      if (!gameTitle.trim()) { setErrorMsg('게임 이름을 입력해주세요'); return }
      if (!gameDescription.trim()) { setErrorMsg('게임 설명을 입력해주세요'); return }
    }
    if (step === 2) {
      if (!companyName.trim()) { setErrorMsg('회사명을 입력해주세요'); return }
      if (!introduction.trim()) { setErrorMsg('회사 소개를 입력해주세요'); return }
    }
    setStep(s => s + 1)
  }

  const handleSubmit = async () => {
    setErrorMsg('')
    setSubmitState('loading')
    try {
      const { minihome } = await minihomeService.create({
        companyName,
        introduction,
        profileImage: profileImage || undefined,
        coverImage: coverImage || undefined,
        website: website || undefined,
        tags: selectedTags,
        keywords: selectedKeywords,
      })
      await minihomeService.addGame({
        title: gameTitle,
        genre: gameGenre,
        description: gameDescription,
        iconUrl: gameIconUrl || undefined,
        coverUrl: gameCoverUrl || undefined,
        screenshots: gameScreenshots ? gameScreenshots.split(',').map(s => s.trim()).filter(Boolean) : [],
        platforms: gamePlatforms,
      })
      void minihome
      setSubmitState('success')
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setErrorMsg(err?.response?.data?.message || '생성 실패. 다시 시도해주세요.')
      setSubmitState('error')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-bg-overlay z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-bg-secondary border border-line rounded-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-line">
          <h2 className="text-text-primary font-bold text-lg">미니홈 만들기</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitState === 'success' ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <CheckCircle className="w-12 h-12 text-accent mb-4" />
            <p className="text-text-primary font-semibold text-lg mb-2">미니홈이 생성되었습니다!</p>
            <p className="text-text-secondary text-sm mb-6">게임 포트폴리오 페이지를 통해 투자자와 퍼블리셔를 만나보세요.</p>
            <button onClick={onSuccess} className="bg-red-600 hover:bg-red-700 text-text-primary px-6 py-2.5 rounded-xl text-sm font-medium transition-colors">
              확인
            </button>
          </div>
        ) : (
          <>
            <div className="px-6 pt-5 pb-4">
              <div className="flex items-center gap-2">
                {STEPS.map((label, i) => {
                  const n = i + 1
                  const active = n === step
                  const done = n < step
                  return (
                    <div key={n} className="flex items-center gap-2 flex-1 last:flex-none">
                      <div className="flex flex-col items-center">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                          done ? 'bg-red-600 border-red-600 text-text-primary' :
                          active ? 'border-red-500 text-red-400 bg-red-600/10' :
                          'border-line text-text-muted'
                        }`}>
                          {done ? '✓' : n}
                        </div>
                        <span className={`text-xs mt-1 ${active ? 'text-red-400' : done ? 'text-text-secondary' : 'text-text-muted'}`}>{label}</span>
                      </div>
                      {i < STEPS.length - 1 && (
                        <div className={`flex-1 h-0.5 mb-5 ${done ? 'bg-red-600' : 'bg-bg-tertiary'}`} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 pb-4 space-y-4">
              {errorMsg && (
                <p className="bg-red-900/30 border border-red-700/40 text-red-300 text-sm px-4 py-3 rounded-xl">{errorMsg}</p>
              )}

              {step === 1 && (
                <>
                  <h3 className="text-text-primary font-semibold text-sm">Step 1: 게임 정보 등록</h3>

                  <div>
                    <label className="text-text-secondary text-sm font-medium mb-1.5 block">게임 이름 <span className="text-red-400">*</span></label>
                    <input value={gameTitle} onChange={e => setGameTitle(e.target.value)}
                      placeholder="게임 이름을 입력하세요"
                      className="w-full bg-bg-tertiary border border-line text-text-primary text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:border-red-500 transition-colors" />
                  </div>

                  <div>
                    <label className="text-text-secondary text-sm font-medium mb-1.5 block">장르</label>
                    <select value={gameGenre} onChange={e => setGameGenre(e.target.value)}
                      className="w-full bg-bg-tertiary border border-line text-text-primary text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:border-red-500 transition-colors">
                      {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>

                  <div>
                    <label className="text-text-secondary text-sm font-medium mb-1.5 block">게임 설명 <span className="text-red-400">*</span></label>
                    <textarea value={gameDescription} onChange={e => setGameDescription(e.target.value)} rows={3}
                      placeholder="게임에 대한 설명을 입력하세요"
                      className="w-full bg-bg-tertiary border border-line text-text-primary text-sm px-3 py-2.5 rounded-xl resize-none focus:outline-none focus:border-red-500 transition-colors" />
                  </div>

                  <div>
                    <label className="text-text-secondary text-sm font-medium mb-1.5 block">아이콘 URL</label>
                    <input value={gameIconUrl} onChange={e => setGameIconUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-bg-tertiary border border-line text-text-primary text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:border-red-500 transition-colors" />
                  </div>

                  <div>
                    <label className="text-text-secondary text-sm font-medium mb-1.5 block">커버 이미지 URL</label>
                    <input value={gameCoverUrl} onChange={e => setGameCoverUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-bg-tertiary border border-line text-text-primary text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:border-red-500 transition-colors" />
                  </div>

                  <div>
                    <label className="text-text-secondary text-sm font-medium mb-1.5 block">스크린샷 URL (쉼표로 구분)</label>
                    <input value={gameScreenshots} onChange={e => setGameScreenshots(e.target.value)}
                      placeholder="https://img1.jpg, https://img2.jpg"
                      className="w-full bg-bg-tertiary border border-line text-text-primary text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:border-red-500 transition-colors" />
                  </div>

                  <div>
                    <label className="text-text-secondary text-sm font-medium mb-2 block">플랫폼</label>
                    <div className="flex gap-3">
                      {PLATFORMS.map(p => (
                        <label key={p} className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={gamePlatforms.includes(p)} onChange={() => togglePlatform(p)}
                            className="w-4 h-4 rounded accent-red-500" />
                          <span className="text-text-secondary text-sm">{p}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <h3 className="text-text-primary font-semibold text-sm">Step 2: 회사 정보</h3>

                  <div>
                    <label className="text-text-secondary text-sm font-medium mb-1.5 block">회사명 <span className="text-red-400">*</span></label>
                    <input value={companyName} onChange={e => setCompanyName(e.target.value)}
                      placeholder="회사 이름을 입력하세요"
                      className="w-full bg-bg-tertiary border border-line text-text-primary text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:border-red-500 transition-colors" />
                  </div>

                  <div>
                    <label className="text-text-secondary text-sm font-medium mb-1.5 block">회사 소개 <span className="text-red-400">*</span></label>
                    <textarea value={introduction} onChange={e => setIntroduction(e.target.value)} rows={4}
                      placeholder="회사를 소개해주세요"
                      className="w-full bg-bg-tertiary border border-line text-text-primary text-sm px-3 py-2.5 rounded-xl resize-none focus:outline-none focus:border-red-500 transition-colors" />
                  </div>

                  <div>
                    <label className="text-text-secondary text-sm font-medium mb-1.5 block">프로필 이미지 URL</label>
                    <input value={profileImage} onChange={e => setProfileImage(e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-bg-tertiary border border-line text-text-primary text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:border-red-500 transition-colors" />
                  </div>

                  <div>
                    <label className="text-text-secondary text-sm font-medium mb-1.5 block">커버 이미지 URL</label>
                    <input value={coverImage} onChange={e => setCoverImage(e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-bg-tertiary border border-line text-text-primary text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:border-red-500 transition-colors" />
                  </div>

                  <div>
                    <label className="text-text-secondary text-sm font-medium mb-1.5 block">웹사이트 URL</label>
                    <input value={website} onChange={e => setWebsite(e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-bg-tertiary border border-line text-text-primary text-sm px-3 py-2.5 rounded-xl focus:outline-none focus:border-red-500 transition-colors" />
                  </div>

                  <div>
                    <label className="text-text-secondary text-sm font-medium mb-2 block">태그</label>
                    <div className="flex flex-wrap gap-2">
                      {TAGS.map(tag => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => toggleTag(tag)}
                          className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${selectedTags.includes(tag) ? 'bg-red-600/20 border-red-500/40 text-red-300' : 'border-line text-text-secondary hover:text-text-primary'}`}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <h3 className="text-text-primary font-semibold text-sm">Step 3: 키워드 선택</h3>
                  <p className="text-text-secondary text-xs">관련 키워드를 선택하면 검색과 매칭에 활용됩니다</p>

                  {keywordsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-5 h-5 animate-spin text-text-secondary" />
                    </div>
                  ) : keywordGroups.length === 0 ? (
                    <p className="text-text-muted text-sm text-center py-8">등록된 키워드가 없습니다. 키워드 없이 진행할 수 있습니다.</p>
                  ) : (
                    <div className="space-y-4">
                      {keywordGroups.map(group => (
                        <div key={group._id}>
                          <p className="text-text-secondary text-xs mb-2">{group.name}</p>
                          <div className="flex flex-wrap gap-2">
                            {group.keywords.filter(k => k.isActive).map(k => (
                              <button
                                key={k.name}
                                type="button"
                                onClick={() => toggleKeyword(k.name)}
                                className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${selectedKeywords.includes(k.name) ? 'bg-red-600/20 border-red-500/40 text-red-300' : 'border-line text-text-secondary hover:text-text-primary'}`}
                              >
                                {k.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex justify-between gap-3 px-6 py-4 border-t border-line">
              {step > 1 ? (
                <button onClick={() => { setErrorMsg(''); setStep(s => s - 1) }}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm text-text-secondary border border-line rounded-xl hover:bg-bg-tertiary transition-colors">
                  <ChevronLeft className="w-4 h-4" /> 이전
                </button>
              ) : (
                <button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary border border-line rounded-xl hover:bg-bg-tertiary transition-colors">
                  취소
                </button>
              )}

              {step < 3 ? (
                <button onClick={goNext}
                  className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-text-primary px-5 py-2 rounded-xl text-sm font-medium transition-colors">
                  다음 <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button onClick={handleSubmit} disabled={submitState === 'loading'}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-text-primary px-5 py-2 rounded-xl text-sm font-medium transition-colors">
                  {submitState === 'loading' && <Loader2 className="w-4 h-4 animate-spin" />}
                  완료
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
