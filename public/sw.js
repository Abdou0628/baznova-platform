/// <reference lib="webworker" />

const CACHE_VERSION = 'hirenova-v1'
const STATIC_CACHE = `${CACHE_VERSION}-static`
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`
const OFFLINE_FALLBACK = '/offline.html'

// Static assets to pre-cache on install
const PRECACHE_URLS = [
  '/',
  '/manifest.json',
  '/offline.html',
]

// ─────────────────────────────────────────────────────
// Install — pre-cache critical shell assets
// ─────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  )
})

// ─────────────────────────────────────────────────────
// Activate — clean up old caches
// ─────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  const allowedCaches = new Set([STATIC_CACHE, DYNAMIC_CACHE])

  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => !allowedCaches.has(name))
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  )
})

// ─────────────────────────────────────────────────────
// Fetch — stale-while-revalidate for static assets,
// network-first for API, cache-first for fonts/images
// ─────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle same-origin GET requests
  if (request.method !== 'GET' || url.origin !== self.location.origin) {
    return
  }

  // 1. Static assets (CSS, JS, fonts) — stale-while-revalidate
  if (isStaticAsset(url)) {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE))
    return
  }

  // 2. API calls — network-first, fallback to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE))
    return
  }

  // 3. Images — cache-first
  if (isImageAsset(url)) {
    event.respondWith(cacheFirst(request, DYNAMIC_CACHE))
    return
  }

  // 4. Navigation / HTML pages — network-first with offline fallback
  event.respondWith(
    networkFirst(request, DYNAMIC_CACHE).catch(() =>
      caches.match(request).then((cached) => {
        if (cached) return cached
        return caches.match(OFFLINE_FALLBACK)
      })
    )
  )
})

// ─────────────────────────────────────────────────────
// Strategies
// ─────────────────────────────────────────────────────

/**
 * Stale-while-revalidate: serve from cache immediately,
 * then update the cache in the background.
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cachedResponse = await cache.match(request)

  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone())
      }
      return networkResponse
    })
    .catch(() => cachedResponse)

  return cachedResponse || fetchPromise
}

/**
 * Network-first: try the network, fall back to cache.
 */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName)

  try {
    const networkResponse = await fetch(request)
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone())
    }
    return networkResponse
  } catch {
    const cached = await cache.match(request)
    if (cached) return cached
    throw new Error('Network unavailable and no cached response')
  }
}

/**
 * Cache-first: serve from cache, fall back to network.
 */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)
  if (cached) return cached

  const networkResponse = await fetch(request)
  if (networkResponse.ok) {
    cache.put(request, networkResponse.clone())
  }
  return networkResponse
}

// ─────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────

function isStaticAsset(url) {
  return (
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.ttf') ||
    url.pathname.endsWith('.eot') ||
    url.pathname.startsWith('/_next/static/')
  )
}

function isImageAsset(url) {
  return (
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.gif') ||
    url.pathname.endsWith('.ico')
  )
}
