'use client'
interface AvatarProps {
  children: React.ReactNode
  className?: string
}

export function Avatar({ children, className = '' }: AvatarProps) {
  return (
    <div className={`relative inline-block ${className}`}>
      {children}
    </div>
  )
}

interface AvatarFallbackProps {
  children: React.ReactNode
  className?: string
}

export function AvatarFallback({ children, className = '' }: AvatarFallbackProps) {
  return (
    <div className={`flex items-center justify-center w-full h-full rounded-full bg-slate-700 text-white font-semibold ${className}`}>
      {children}
    </div>
  )
}
