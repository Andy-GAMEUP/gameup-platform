'use client'
import { usePageTracking } from '@/lib/usePageTracking'
import { useSessionTracking } from '@/lib/useSessionTracking'

export default function PageTracker() {
  usePageTracking()
  useSessionTracking()
  return null
}
