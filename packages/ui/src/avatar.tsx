'use client'

interface AvatarProps {
  src?: string
  alt?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  fallback?: string
  className?: string
}

export function Avatar({ src, alt = '', size = 'md', fallback, className = '' }: AvatarProps) {
  const sizeStyles = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-14 w-14 text-base',
    xl: 'h-20 w-20 text-lg',
  }

  const initials = fallback || alt?.charAt(0)?.toUpperCase() || '?'

  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={`${sizeStyles[size]} rounded-full object-cover ${className}`}
      />
    )
  }

  return (
    <div className={`${sizeStyles[size]} rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-medium ${className}`}>
      {initials}
    </div>
  )
}
