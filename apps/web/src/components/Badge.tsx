'use client'
interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'secondary' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export default function Badge({ 
  children, 
  variant = 'default', 
  size = 'md',
  className = '' 
}: BadgeProps) {
  const variantStyles = {
    default: 'bg-slate-800 text-slate-300 border border-slate-700',
    success: 'bg-green-500/20 text-green-300 border border-green-500/50',
    warning: 'bg-orange-500/20 text-orange-300 border border-orange-500/50',
    danger: 'bg-red-500/20 text-red-300 border border-red-500/50',
    info: 'bg-blue-500/20 text-blue-300 border border-blue-500/50',
    secondary: 'bg-purple-500/20 text-purple-300 border border-purple-500/50',
    outline: 'bg-transparent border border-slate-700 text-slate-400'
  }

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
    lg: 'px-3 py-1.5 text-base'
  }

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  )
}
