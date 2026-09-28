'use client'

import posthog from 'posthog-js'

/**
 * HireNova Analytics — PostHog integration
 *
 * Events tracked:
 * - page_view (automatic)
 * - signup_started, signup_completed
 * - cv_form_started, cv_generated, cv_downloaded
 * - cl_generated, cl_downloaded
 * - ats_analyzed
 * - job_viewed, job_applied
 * - global_job_viewed, global_job_applied
 * - mobility_upload_started, mobility_result_viewed
 * - checkout_started, checkout_completed
 * - chatbot_message_sent
 * - referral_shared, referral_clicked
 * - blog_article_viewed
 * - ecosystem_card_clicked (with module name)
 */

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || 'phc_demo_hirenova_key'
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com'

let isInitialized = false

export function initAnalytics() {
  if (typeof window === 'undefined') return
  if (isInitialized) return
  if (posthog.__loaded) return

  try {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      person_profiles: 'identified_only',
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: false, // We track events manually for precision
      disable_session_recording: false,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: '[data-sensitive]',
      },
      loaded: (ph) => {
        isInitialized = true
        if (process.env.NODE_ENV === 'development') {
          console.log('[PostHog] initialized')
        }
      },
    })
  } catch (e) {
    console.warn('[PostHog] init failed:', e)
  }
}

export function identifyUser(
  userId: string,
  traits?: {
    email?: string
    name?: string
    plan?: string
    language?: string
    createdAt?: string
  }
) {
  if (typeof window === 'undefined') return
  try {
    posthog.identify(userId, traits)
    if (traits?.plan) {
      posthog.setPersonProperties({ plan: traits.plan })
    }
  } catch (e) {
    console.warn('[PostHog] identify failed:', e)
  }
}

export function resetUser() {
  if (typeof window === 'undefined') return
  try {
    posthog.reset()
  } catch (e) {
    console.warn('[PostHog] reset failed:', e)
  }
}

type EventProps = Record<string, string | number | boolean | null | undefined>

export function track(event: string, properties?: EventProps) {
  if (typeof window === 'undefined') return
  try {
    if (!isInitialized && !posthog.__loaded) {
      initAnalytics()
    }
    posthog.capture(event, {
      ...properties,
      app_version: '1.0.0',
      timestamp: new Date().toISOString(),
    })
  } catch (e) {
    // Silent fail — analytics should never break the app
    if (process.env.NODE_ENV === 'development') {
      console.warn('[PostHog] track failed:', event, e)
    }
  }
}

// Pre-defined event helpers for consistency
export const events = {
  // Auth
  signupStarted: (method?: string) => track('signup_started', { method }),
  signupCompleted: (userId: string, plan = 'free') => {
    track('signup_completed', { user_id: userId, plan })
    identifyUser(userId, { plan })
  },
  loginCompleted: (userId: string, plan?: string) => {
    track('login_completed', { user_id: userId, plan })
    identifyUser(userId, { plan })
  },
  logout: () => {
    track('logout')
    resetUser()
  },

  // CV
  cvFormStarted: (persona?: string) => track('cv_form_started', { persona }),
  cvGenerated: (language: string, template: string) =>
    track('cv_generated', { language, template }),
  cvDownloaded: (format: 'pdf' | 'word', language: string) =>
    track('cv_downloaded', { format, language }),

  // Cover Letter
  clGenerated: (tone: string, language: string) =>
    track('cl_generated', { tone, language }),
  clDownloaded: (format: 'pdf' | 'word') => track('cl_downloaded', { format }),

  // ATS
  atsAnalyzed: (score: number) => track('ats_analyzed', { score }),

  // Jobs
  jobViewed: (jobId: string, source?: string) =>
    track('job_viewed', { job_id: jobId, source }),
  jobApplied: (jobId: string) => track('job_applied', { job_id: jobId }),

  // Global
  globalJobViewed: (jobId: string, country?: string) =>
    track('global_job_viewed', { job_id: jobId, country }),
  globalJobApplied: (jobId: string, country: string) =>
    track('global_job_applied', { job_id: jobId, country }),

  // Mobility
  mobilityUploadStarted: (targetCountry: string) =>
    track('mobility_upload_started', { target_country: targetCountry }),
  mobilityResultViewed: (targetCountry: string, score?: number) =>
    track('mobility_result_viewed', { target_country: targetCountry, score }),

  // API Portal
  apiRegistered: () => track('api_registered'),
  apiEndpointCalled: (endpoint: string) =>
    track('api_endpoint_called', { endpoint }),

  // Checkout
  checkoutStarted: (plan: string, amount: number, currency: string) =>
    track('checkout_started', { plan, amount, currency }),
  checkoutCompleted: (plan: string, amount: number, currency: string) =>
    track('checkout_completed', { plan, amount, currency }),

  // Chatbot
  chatbotMessageSent: (mode: string) => track('chatbot_message_sent', { mode }),

  // Referral
  referralShared: (channel: string) => track('referral_shared', { channel }),
  referralClicked: (code: string) => track('referral_clicked', { code }),

  // Blog
  blogArticleViewed: (slug: string, category: string) =>
    track('blog_article_viewed', { slug, category }),

  // Ecosystem navigation
  ecosystemCardClicked: (module: string) =>
    track('ecosystem_card_clicked', { module }),

  // Funnel
  pricingViewed: () => track('pricing_viewed'),
  personaSelected: (persona: string) => track('persona_selected', { persona }),
  languageChanged: (from: string, to: string) =>
    track('language_changed', { from, to }),

  // AI Marketing Hub
  quizStarted: () => track('marketing_quiz_started'),
  quizCompleted: (data?: { bundle?: string; confidence?: number }) =>
    track('marketing_quiz_completed', { bundle: data?.bundle, confidence: data?.confidence }),
}

// React provider is handled by AnalyticsBootstrap component
// (src/components/analytics-bootstrap.tsx) which calls initAnalytics()
// and syncs user identity with NextAuth session state.
