// ---------------------------------------------------------------------------
// HireNova — Client-side tracking utility
// ---------------------------------------------------------------------------

export type TrackingEventType =
  | 'page_view'
  | 'click'
  | 'form_submit'
  | 'pricing_view'
  | 'plan_change'
  | 'subscription'
  | 'feature_use'
  | 'ecosystem_click'
  | 'chatbot_open'
  | 'language_change'
  | 'template_select'
  | 'download_cv'
  | 'download_cl'
  | 'ats_check'
  | 'support_ticket'
  | 'referral_use'

interface TrackingEvent {
  eventType: TrackingEventType
  eventData?: Record<string, unknown>
  pagePath?: string
  sessionDuration?: number
  timestamp: number
}

// --------------- Configuration ---------------

const TRACK_ENDPOINT = '/api/track'
const DEBOUNCE_MS = 500
const BATCH_SIZE_LIMIT = 50
const FLUSH_ON_UNLOAD = true

// --------------- Internal state ---------------

const PAGE_LOAD_TIME = typeof performance !== 'undefined' ? performance.timeOrigin ?? Date.now() : Date.now()
let eventBuffer: TrackingEvent[] = []
let debounceTimer: ReturnType<typeof setTimeout> | null = null
let isFlushing = false
let lastPagePath = ''

// --------------- Helpers ---------------

function getSessionDuration(): number {
  return Math.round((Date.now() - PAGE_LOAD_TIME) / 1000)
}

function getPagePath(): string {
  return typeof window !== 'undefined' ? window.location.pathname + window.location.search : ''
}

function getReferrer(): string {
  return typeof document !== 'undefined' ? document.referrer : ''
}

// --------------- Send logic ---------------

function sendEvents(events: TrackingEvent[]): void {
  if (events.length === 0 || isFlushing) return

  const payload = {
    events: events.map((e) => ({
      eventType: e.eventType,
      eventData: e.eventData ?? undefined,
      pagePath: e.pagePath ?? undefined,
      sessionDuration: e.sessionDuration ?? undefined,
    })),
  }

  const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })

  // Prefer sendBeacon for reliability (especially on page unload)
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    const sent = navigator.sendBeacon(TRACK_ENDPOINT, blob)
    if (sent) {
      eventBuffer = eventBuffer.filter((e) => !events.includes(e))
      return
    }
  }

  // Fallback to fetch
  fetch(TRACK_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {
    // Silently fail — tracking should never block the user
  })

  eventBuffer = eventBuffer.filter((e) => !events.includes(e))
}

function flushEvents(): void {
  if (eventBuffer.length === 0) return
  const batch = eventBuffer.splice(0, BATCH_SIZE_LIMIT)
  sendEvents(batch)
}

// --------------- Public API ---------------

/**
 * Track a user behaviour event.
 *
 * Events are debounced (500 ms) and batched before being sent to the API.
 * On page unload any buffered events are flushed via `sendBeacon`.
 */
export function trackEvent(
  eventType: TrackingEventType,
  eventData?: Record<string, unknown>,
): void {
  const event: TrackingEvent = {
    eventType,
    eventData,
    pagePath: getPagePath(),
    sessionDuration: getSessionDuration(),
    timestamp: Date.now(),
  }

  eventBuffer.push(event)

  // Auto-flush when buffer reaches limit
  if (eventBuffer.length >= BATCH_SIZE_LIMIT) {
    flushEvents()
    return
  }

  // Debounce: wait before sending to coalesce rapid events
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    flushEvents()
    debounceTimer = null
  }, DEBOUNCE_MS)
}

// --------------- Page-view auto-tracking ---------------

/**
 * Call once at app root (e.g. inside a useEffect) to start tracking.
 * Fires an initial page_view and listens for SPA navigations + page unload.
 */
export function initTracking(): () => void {
  // Initial page view
  const currentPath = getPagePath()
  lastPagePath = currentPath
  trackEvent('page_view', { referrer: getReferrer(), title: typeof document !== 'undefined' ? document.title : '' })

  // Flush on unload / visibility hidden
  function handleUnload() {
    isFlushing = true
    flushEvents()
  }

  function handleVisibility() {
    if (document.visibilityState === 'hidden') {
      handleUnload()
    }
  }

  if (FLUSH_ON_UNLOAD) {
    window.addEventListener('beforeunload', handleUnload)
    document.addEventListener('visibilitychange', handleVisibility)
  }

  // Cleanup
  return () => {
    if (FLUSH_ON_UNLOAD) {
      window.removeEventListener('beforeunload', handleUnload)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    // Final flush on unmount
    flushEvents()
  }
}
