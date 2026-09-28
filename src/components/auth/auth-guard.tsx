'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { useSession } from 'next-auth/react'
import { useCVStore, type AppStep } from '@/store/cv-store'

/**
 * Steps that require the user to be authenticated (have a session).
 * If the user navigates to one of these steps without being logged in,
 * AuthGuard automatically resets to the landing page.
 */
const AUTH_STEPS: AppStep[] = [
  // Core CV
  'form', 'generating', 'preview',
  // Cover Letter
  'clForm', 'clGenerating', 'clPreview',
  // Jobs
  'jobMarket', 'jobDetail', 'jobApply',
  'employerDashboard', 'employerPostJob',
  'candidateApplications',
  // API Portal
  'apiDocs', 'apiRegister', 'apiDashboard',
  // Global
  'globalMarket', 'globalJobDetail', 'globalApply',
  'globalEmployerDashboard', 'globalPostJob',
  // Mobility
  'mobilityHome', 'mobilityUpload', 'mobilityProfile', 'mobilityResult',
  // Career Intelligence
  'careerIntel',
  // Other protected steps
  'referral', 'campus', 'dashboard', 'interview', 'admin',
]

/**
 * Steps that require an active subscription (premium plan).
 * AuthGuard checks user.plan for these steps.
 */
const PREMIUM_STEPS: AppStep[] = [
  'form', 'generating', 'preview',
  'clForm', 'clGenerating', 'clPreview',
  'mobilityHome', 'mobilityUpload', 'mobilityProfile', 'mobilityResult',
  'careerIntel',
]

interface AuthGuardProps {
  children: ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { data: session, status } = useSession()
  const { step, setStep } = useCVStore()
  const redirectingRef = useRef(false)

  useEffect(() => {
    // Skip if session is still loading
    if (status === 'loading') return

    // Check if current step requires authentication
    const requiresAuth = AUTH_STEPS.includes(step)

    if (requiresAuth && !session?.user) {
      // User is not authenticated but trying to access a protected step
      if (!redirectingRef.current) {
        redirectingRef.current = true
        console.log(`[AuthGuard] Unauthenticated access to "${step}" — redirecting to landing`)
        // Clear the persisted step from localStorage to prevent loop
        try {
          localStorage.removeItem('hirenova-step')
        } catch {
          // Ignore localStorage errors (SSR, etc.)
        }
        setStep('landing')
        // Reset redirect flag after a short delay
        setTimeout(() => { redirectingRef.current = false }, 500)
      }
      return
    }

    // Reset redirecting flag when user is properly authenticated
    redirectingRef.current = false
  }, [session, status, step, setStep])

  return <>{children}</>
}
