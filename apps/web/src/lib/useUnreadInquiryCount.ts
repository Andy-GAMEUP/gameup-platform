'use client'
import { useState, useEffect } from 'react'
import messageService from '@/services/messageService'

export function useUnreadInquiryCount() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    messageService.getUnreadCount()
      .then((data) => setCount(data.count || 0))
      .catch(() => {})
  }, [])

  return count
}
