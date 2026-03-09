'use client'
import { useEffect } from 'react'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center space-y-4">
        <h2 className="text-white text-xl font-bold">관리자 페이지 오류</h2>
        <p className="text-slate-400 text-sm">{error.message || '잠시 후 다시 시도해주세요'}</p>
        <button onClick={reset} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors">다시 시도</button>
      </div>
    </div>
  )
}
