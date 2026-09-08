'use client'
import { useState } from 'react'

export default function StarRating({ value, onChange, size = 6 }: { value: number; onChange?: (v: number) => void; size?: number }) {
  const [hover, setHover] = useState(0)
  const px = size * 4
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange?.(s)}
          onMouseEnter={() => onChange && setHover(s)}
          onMouseLeave={() => onChange && setHover(0)}
          style={{ width: px, height: px }}
          className={onChange ? 'cursor-pointer' : 'cursor-default'}
        >
          <svg viewBox="0 0 24 24" className={`w-full h-full transition-colors ${s <= (hover || value) ? 'fill-yellow-400 text-yellow-400 group-hover:fill-amber-500 group-hover:text-amber-500' : 'fill-text-muted/40'}`}>
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
          </svg>
        </button>
      ))}
    </div>
  )
}
