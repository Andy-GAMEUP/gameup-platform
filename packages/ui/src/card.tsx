'use client'

import React from 'react'

interface CardProps {
  className?: string
  children: React.ReactNode
}

export function Card({ className = '', children }: CardProps) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 shadow-sm ${className}`}>
      {children}
    </div>
  )
}

interface CardHeaderProps {
  className?: string
  children: React.ReactNode
}

Card.Header = function CardHeader({ className = '', children }: CardHeaderProps) {
  return <div className={`px-6 py-4 border-b border-gray-200 ${className}`}>{children}</div>
}

Card.Body = function CardBody({ className = '', children }: CardHeaderProps) {
  return <div className={`px-6 py-4 ${className}`}>{children}</div>
}

Card.Footer = function CardFooter({ className = '', children }: CardHeaderProps) {
  return <div className={`px-6 py-4 border-t border-gray-200 ${className}`}>{children}</div>
}
