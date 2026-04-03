import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { SessionProvider } from "next-auth/react"
import QueryProvider from "@/components/QueryProvider"
import PageTracker from "@/components/PageTracker"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: {
    default: 'GAMEUP - 게임 베타테스트 플랫폼',
    template: '%s | GAMEUP',
  },
  description: '인디 게임 개발자와 플레이어를 연결하는 베타 테스트 플랫폼. 커뮤니티, 파트너 채널, 미니홈, 솔루션 마켓플레이스.',
  keywords: ['게임', '베타테스트', '인디게임', '게임개발', 'GAMEUP', '게임업'],
  authors: [{ name: 'GAMEUP' }],
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    siteName: 'GAMEUP',
    title: 'GAMEUP - 게임 베타테스트 플랫폼',
    description: '인디 게임 개발자와 플레이어를 연결하는 베타 테스트 플랫폼',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `
          (function() {
            try {
              var t = localStorage.getItem('gameup-theme');
              if (t === 'dark') document.documentElement.classList.add('dark');
            } catch(e) {}
          })();
        `}} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider>
          <QueryProvider>
            <PageTracker />
            {children}
          </QueryProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
