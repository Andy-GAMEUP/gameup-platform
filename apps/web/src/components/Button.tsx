'use client'
import { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'sm' | 'default' | 'lg' | 'icon'
  fullWidth?: boolean
  loading?: boolean
}

export default function Button({
  children,
  variant = 'default',
  size = 'default',
  fullWidth = false,
  loading = false,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-accent'

  const variantStyles = {
    default: 'bg-accent text-text-inverse hover:bg-accent-hover shadow-sm',
    destructive: 'bg-danger text-text-primary hover:bg-danger/80 shadow-sm',
    outline: 'border border-line bg-transparent text-text-secondary hover:bg-bg-tertiary',
    secondary: 'bg-bg-tertiary text-text-primary hover:bg-line-light',
    ghost: 'bg-transparent text-text-secondary hover:bg-bg-tertiary hover:text-text-primary',
    link: 'text-accent underline-offset-4 hover:underline'
  }

  const sizeStyles = {
    sm: 'h-8 px-3 text-xs',
    default: 'h-9 px-4 py-2',
    lg: 'h-10 px-6 text-base',
    icon: 'h-9 w-9'
  }

  const widthStyle = fullWidth ? 'w-full' : ''
  const disabledStyle = (disabled || loading) ? 'opacity-50 cursor-not-allowed' : ''

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyle} ${disabledStyle} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  )
}
