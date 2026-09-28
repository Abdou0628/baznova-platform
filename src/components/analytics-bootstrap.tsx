'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { initAnalytics, identifyUser, resetUser, events } from '@/lib/analytics'

/**
 * Analytics bootstrap component — initializes PostHog on mount
 * and syncs user identity with session state.
 */
export default function AnalyticsBootstrap() {
  const { data: session, status } = useSession()

  // Init on mount
  useEffect(() => {
    initAnalytics()
  }, [])

  // Identify/reset based on session
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const userId = (session.user as { id?: string }).id || session.user.email || ''
      const plan = (session.user as { plan?: string }).plan || 'free'
      identifyUser(userId, {
        email: session.user.email ?? undefined,
        name: session.user.name ?? undefined,
        plan,
      })
    } else if (status === 'unauthenticated') {
      resetUser()
    }
  }, [status, session])

  return null
}
