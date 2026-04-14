'use client'
import { useState, useRef, useEffect } from 'react'
import { DayPicker, DateRange } from 'react-day-picker'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Calendar } from 'lucide-react'
import 'react-day-picker/dist/style.css'

interface DateRangePickerProps {
  from: Date
  to: Date
  onChange: (range: { from: Date; to: Date }) => void
  presets?: boolean
}

export default function DateRangePicker({ from, to, onChange, presets = true }: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const handleSelect = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      onChange({ from: range.from, to: range.to })
    }
  }

  const applyPreset = (days: number) => {
    const newTo = new Date()
    const newFrom = new Date(newTo.getTime() - (days - 1) * 24 * 60 * 60 * 1000)
    onChange({ from: newFrom, to: newTo })
    setOpen(false)
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-3 py-2 border border-line rounded-md text-sm bg-bg-tertiary hover:bg-bg-secondary text-text-primary"
      >
        <Calendar className="w-4 h-4 text-text-secondary" />
        <span>
          {format(from, 'yyyy.MM.dd', { locale: ko })} ~ {format(to, 'yyyy.MM.dd', { locale: ko })}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-bg-secondary border border-line rounded-lg shadow-2xl p-3">
          {presets && (
            <div className="flex gap-1 mb-3 flex-wrap">
              {[
                { label: '최근 7일', days: 7 },
                { label: '최근 30일', days: 30 },
                { label: '최근 90일', days: 90 },
              ].map(p => (
                <button
                  key={p.days}
                  type="button"
                  onClick={() => applyPreset(p.days)}
                  className="px-2.5 py-1 text-xs border border-line rounded hover:bg-bg-tertiary text-text-secondary"
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
          <DayPicker
            mode="range"
            selected={{ from, to }}
            onSelect={handleSelect}
            locale={ko}
            numberOfMonths={2}
            className="rdp-custom"
          />
          <style jsx global>{`
            .rdp-custom {
              --rdp-accent-color: #10b981;
              --rdp-background-color: rgba(16, 185, 129, 0.15);
              color: #e5e7eb;
              font-size: 13px;
            }
            .rdp-custom .rdp-day_selected {
              background-color: var(--rdp-accent-color);
              color: white;
            }
            .rdp-custom .rdp-day:hover:not(.rdp-day_selected) {
              background-color: rgba(255, 255, 255, 0.05);
            }
          `}</style>
        </div>
      )}
    </div>
  )
}
