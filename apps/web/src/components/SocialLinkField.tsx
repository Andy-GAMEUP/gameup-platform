'use client'
import { useId, type ComponentType } from 'react'

export type SocialPlatform = 'website' | 'instagram' | 'discord' | 'twitter' | 'youtube'

const PATTERNS: Record<SocialPlatform, { test: RegExp; label: string; placeholder: string; hint: string }> = {
  website:   { test: /^https?:\/\/.+/i,                              label: '공식 웹사이트',  placeholder: 'https://...',              hint: '올바른 URL 형식으로 입력해주세요 (예: https://...)' },
  instagram: { test: /^https?:\/\/(www\.)?instagram\.com\/.+/i,       label: '인스타그램',     placeholder: 'https://instagram.com/...', hint: 'instagram.com 링크만 입력할 수 있습니다' },
  discord:   { test: /^https?:\/\/(www\.)?(discord\.gg|discord\.com)\/.+/i, label: '디스코드 서버', placeholder: 'https://discord.gg/...',    hint: 'discord.gg 또는 discord.com 링크만 입력할 수 있습니다' },
  twitter:   { test: /^https?:\/\/(www\.)?(twitter\.com|x\.com)\/.+/i, label: '트위터(X)',      placeholder: 'https://x.com/...',         hint: 'x.com(트위터) 링크만 입력할 수 있습니다' },
  youtube:   { test: /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/i, label: '유튜브',        placeholder: 'https://youtube.com/...',   hint: 'youtube.com 링크만 입력할 수 있습니다' },
}

export function isValidSocialLink(platform: SocialPlatform, value: string) {
  if (!value.trim()) return true
  return PATTERNS[platform].test.test(value.trim())
}

function WebsiteIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

function InstagramIcon({ className }: { className?: string }) {
  const gradId = useId()
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#FFDD55" />
          <stop offset="50%" stopColor="#FF543E" />
          <stop offset="100%" stopColor="#C837AB" />
        </linearGradient>
      </defs>
      <path fill={`url(#${gradId})`} d="M12 0C8.74 0 8.333.014 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.014 8.333 0 8.74 0 12s.014 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.986 8.74 24 12 24s3.667-.014 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.014-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.014 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.86.061-1.17.255-1.814.42-2.235.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06zm0 3.678a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
    </svg>
  )
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path fill="#5865F2" d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function YoutubeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className}>
      <path fill="#FF0000" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z" />
      <path fill="#fff" d="M9.545 15.568V8.432L15.818 12z" />
    </svg>
  )
}

const ICONS: Record<SocialPlatform, ComponentType<{ className?: string }>> = {
  website: WebsiteIcon,
  instagram: InstagramIcon,
  discord: DiscordIcon,
  twitter: XIcon,
  youtube: YoutubeIcon,
}

export function SocialIcon({ platform, className = 'w-4 h-4' }: { platform: SocialPlatform; className?: string }) {
  const Icon = ICONS[platform]
  return <Icon className={className} />
}

export default function SocialLinkField({
  platform, value, onChange, labelCls, inputCls,
}: {
  platform: SocialPlatform
  value: string
  onChange: (value: string) => void
  labelCls: string
  inputCls: string
}) {
  const meta = PATTERNS[platform]
  const valid = isValidSocialLink(platform, value)
  return (
    <div>
      <div className="grid grid-cols-[auto_1fr] gap-x-2">
        <span className="row-span-2 self-center w-16 h-16 flex-shrink-0 text-text-muted">
          <SocialIcon platform={platform} className="w-full h-full" />
        </span>
        <label className={`${labelCls} col-start-2`}>{meta.label}</label>
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={meta.placeholder}
          className={`${inputCls} col-start-2 ${!valid ? 'border-red-400 focus:border-red-400 hover:border-red-400' : ''}`}
        />
      </div>
      {!valid && <p className="text-xs text-red-400 mt-1">{meta.hint}</p>}
    </div>
  )
}
