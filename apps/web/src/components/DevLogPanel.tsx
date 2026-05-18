'use client'
import { useState, useEffect, useRef, useCallback } from 'react'

type LogLevel = 'error' | 'warn' | 'info' | 'network' | 'success'

interface LogEntry {
  id: number
  level: LogLevel
  message: string
  detail?: string
  time: string
}

let logIdCounter = 0

const LEVEL_STYLE: Record<LogLevel, { badge: string; row: string; dot: string }> = {
  error:   { badge: 'bg-red-600 text-white',          row: 'bg-red-950/40 border-red-800/30',     dot: 'bg-red-500' },
  warn:    { badge: 'bg-yellow-600 text-white',        row: 'bg-yellow-950/30 border-yellow-700/30', dot: 'bg-yellow-400' },
  network: { badge: 'bg-orange-600 text-white',        row: 'bg-orange-950/30 border-orange-700/30', dot: 'bg-orange-400' },
  info:    { badge: 'bg-blue-700 text-white',          row: 'bg-blue-950/20 border-blue-800/20',   dot: 'bg-blue-400' },
  success: { badge: 'bg-green-700 text-white',         row: 'bg-green-950/20 border-green-800/20', dot: 'bg-green-400' },
}

const LEVEL_LABEL: Record<LogLevel, string> = {
  error: 'ERR', warn: 'WARN', network: 'NET', info: 'INFO', success: 'OK',
}

export default function DevLogPanel() {
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<LogLevel | 'all'>('all')
  const [expanded, setExpanded] = useState<number | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const addLog = useCallback((level: LogLevel, message: string, detail?: string) => {
    const now = new Date()
    const time = now.toTimeString().slice(0, 8)
    setLogs(prev => {
      const next = [...prev, { id: ++logIdCounter, level, message, time, detail }]
      return next.length > 200 ? next.slice(-200) : next
    })
  }, [])

  useEffect(() => {
    const origError = console.error.bind(console)
    const origWarn  = console.warn.bind(console)
    const origLog   = console.log.bind(console)

    const fmt = (args: unknown[]) =>
      args.map(a => (typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a))).join(' ')

    console.error = (...args: unknown[]) => {
      origError(...args)
      const msg = fmt(args)
      // Axios / fetch 에러 분류
      const isNetwork = msg.includes('status code') || msg.includes('AxiosError') || msg.includes('Request failed')
      addLog(isNetwork ? 'network' : 'error', msg.slice(0, 120), msg.length > 120 ? msg : undefined)
    }
    console.warn = (...args: unknown[]) => {
      origWarn(...args)
      const msg = fmt(args)
      addLog('warn', msg.slice(0, 120), msg.length > 120 ? msg : undefined)
    }
    console.log = (...args: unknown[]) => {
      origLog(...args)
      const msg = fmt(args)
      if (msg.startsWith('[DEV]')) addLog('info', msg.replace('[DEV]', '').trim().slice(0, 120))
    }

    // 전역 JS 에러
    const onError = (e: ErrorEvent) => {
      addLog('error', `${e.message}`, `${e.filename}:${e.lineno}`)
    }
    // 처리 안 된 Promise 거부
    const onUnhandled = (e: PromiseRejectionEvent) => {
      const msg = e.reason?.message || String(e.reason) || 'Unhandled rejection'
      addLog('error', msg.slice(0, 120), String(e.reason))
    }
    // fetch 가로채기 (network 에러 캡처)
    const origFetch = window.fetch
    window.fetch = async (...args) => {
      try {
        const res = await origFetch(...args)
        if (!res.ok) {
          const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url
          addLog('network', `${res.status} ${res.statusText} — ${url.split('?')[0]}`)
        }
        return res
      } catch (err: unknown) {
        const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url
        addLog('network', `fetch 실패 — ${url}`, String(err))
        throw err
      }
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onUnhandled)

    addLog('success', '🟢 DevLogPanel 활성화 — 모든 에러/경고를 캡처합니다')

    return () => {
      console.error = origError
      console.warn  = origWarn
      console.log   = origLog
      window.fetch  = origFetch
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onUnhandled)
    }
  }, [addLog])

  // 새 로그 추가 시 자동 스크롤
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs, open])

  const filtered = filter === 'all' ? logs : logs.filter(l => l.level === filter)
  const counts = logs.reduce((acc, l) => { acc[l.level] = (acc[l.level] || 0) + 1; return acc }, {} as Record<string, number>)
  const errorCount = (counts.error || 0) + (counts.network || 0)

  const copyAll = () => {
    const text = filtered.map(l => `[${l.time}][${l.level.toUpperCase()}] ${l.message}${l.detail ? '\n  ' + l.detail : ''}`).join('\n')
    navigator.clipboard.writeText(text)
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] pointer-events-none">
      {/* 패널 */}
      {open && (
        <div
          ref={panelRef}
          className="pointer-events-auto mx-auto max-w-full bg-gray-950 border-t border-gray-700 shadow-2xl"
          style={{ height: '280px', display: 'flex', flexDirection: 'column' }}
        >
          {/* 헤더 */}
          <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-800 bg-gray-900 flex-shrink-0">
            <span className="text-gray-400 text-xs font-mono font-bold tracking-widest">DEV LOG</span>
            <div className="flex gap-1 ml-1">
              {(['all', 'error', 'network', 'warn', 'info', 'success'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-xs px-2 py-0.5 rounded font-mono transition-colors ${
                    filter === f ? 'bg-gray-600 text-white' : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {f === 'all' ? `ALL (${logs.length})` : `${f.toUpperCase()} (${counts[f] || 0})`}
                </button>
              ))}
            </div>
            <div className="ml-auto flex gap-2">
              <button onClick={copyAll} className="text-xs text-gray-500 hover:text-gray-300 font-mono px-2 py-0.5 border border-gray-700 rounded transition-colors">복사</button>
              <button onClick={() => setLogs([])} className="text-xs text-gray-500 hover:text-red-400 font-mono px-2 py-0.5 border border-gray-700 rounded transition-colors">지우기</button>
              <button onClick={() => setOpen(false)} className="text-xs text-gray-500 hover:text-gray-200 font-mono px-2 py-0.5 transition-colors">✕</button>
            </div>
          </div>

          {/* 로그 목록 */}
          <div className="flex-1 overflow-y-auto font-mono text-xs" style={{ scrollbarWidth: 'thin' }}>
            {filtered.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-600">로그 없음</div>
            ) : (
              filtered.map(log => (
                <div key={log.id}>
                  <div
                    onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                    className={`flex items-start gap-2 px-3 py-1 border-b cursor-pointer hover:brightness-125 transition-all ${LEVEL_STYLE[log.level].row} ${log.detail ? 'cursor-pointer' : ''}`}
                  >
                    <span className="text-gray-600 flex-shrink-0 w-16">{log.time}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-bold flex-shrink-0 ${LEVEL_STYLE[log.level].badge}`}>
                      {LEVEL_LABEL[log.level]}
                    </span>
                    <span className="text-gray-200 flex-1 break-all leading-relaxed">{log.message}</span>
                    {log.detail && <span className="text-gray-600 flex-shrink-0">{expanded === log.id ? '▲' : '▼'}</span>}
                  </div>
                  {expanded === log.id && log.detail && (
                    <div className="bg-gray-900 px-3 py-2 text-gray-400 whitespace-pre-wrap break-all border-b border-gray-800 text-xs leading-relaxed">
                      {log.detail}
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={bottomRef} />
          </div>
        </div>
      )}

      {/* 토글 버튼 */}
      <div className="pointer-events-auto flex justify-end px-4 pb-3 pt-1">
        <button
          onClick={() => setOpen(o => !o)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold shadow-lg border transition-all ${
            open
              ? 'bg-gray-800 border-gray-600 text-gray-300'
              : errorCount > 0
                ? 'bg-red-900 border-red-600 text-red-300 animate-pulse'
                : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-500'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${errorCount > 0 ? 'bg-red-500' : 'bg-green-500'}`} />
          DEV LOG
          {errorCount > 0 && (
            <span className="bg-red-600 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">{errorCount}</span>
          )}
          {!open && logs.length > 0 && errorCount === 0 && (
            <span className="text-gray-600">{logs.length}</span>
          )}
        </button>
      </div>
    </div>
  )
}
