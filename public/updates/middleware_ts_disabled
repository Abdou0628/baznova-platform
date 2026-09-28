import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getRateLimitCategory } from '@/lib/rate-limit'

// NOTE: Middleware runs in Edge Runtime — Prisma (db) is NOT available here.
// Security logging with Prisma is done at the API route level (Node.js runtime).
// Middleware only handles: headers, rate limiting (in-memory), path blocking, URL scanning.

// ============================================================================
// Edge-compatible Input Scanning (no Prisma, no external deps)
// ============================================================================

const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|EXEC|EXECUTE|UNION)\b.*\b(FROM|INTO|SET|WHERE|TABLE|DATABASE)\b)/i,
  /(--|;|--\s|\/\*|\*\/|xp_|sp_|0x)/i,
  /(\bOR\b\s+\d+\s*=\s*\d+)/i,
  /(\bOR\b\s+['"].*['"]\s*=\s*['"])/i,
  /(\bAND\b\s+\d+\s*=\s*\d+)/i,
  /(WAITFOR\s+DELAY)/i,
  /(SLEEP\s*\()/i,
]

const XSS_PATTERNS = [
  /<\s*script[^>]*>[\s\S]*?<\s*\/script>/gi,
  /<\s*script[^>]*\/>/gi,
  /\bon\w+\s*=\s*['"]?[^'">]*['"]?/gi,
  /javascript\s*:/gi,
  /<\s*embed[^>]*>/gi,
  /<\s*object[^>]*>/gi,
]

function scanUrl(url: string): { isClean: boolean; sqlInjection: boolean; xss: boolean } {
  const sqlInjection = SQL_INJECTION_PATTERNS.some((p) => p.test(url))
  const xss = XSS_PATTERNS.some((p) => p.test(url))
  return { isClean: !sqlInjection && !xss, sqlInjection, xss }
}

// ============================================================================
// HNSA — HireNova Security Architecture
// Middleware: Security Headers + Rate Limiting + Input Scanning
// ============================================================================

function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const realIP = request.headers.get('x-real-ip')
  if (realIP) return realIP
  return '127.0.0.1'
}

function getUserAgent(request: NextRequest): string {
  return request.headers.get('user-agent') || 'unknown'
}

// ============================================================================
// HNSA Security Headers
// ============================================================================

function applyHNSASecurityHeaders(response: NextResponse, requestId: string): void {
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=()'
  )
  response.headers.set('X-Request-ID', requestId)
  response.headers.set('X-HNSA', '1.0')
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  )
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' https:",
      "connect-src 'self' https: wss:",
      'frame-ancestors *',
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "frame-src 'self'",
    ].join('; ')
  )
}

// ============================================================================
// Suspicious Path Detection
// ============================================================================

const SUSPICIOUS_PATHS = [
  '/wp-admin', '/wp-login', '/.env', '/.git', '/.svn', '/.htaccess',
  '/phpmyadmin', '/backup', '/config.php', '/database',
  '/solr', '/actuator', '/.dockerenv', '/proc/self', '/etc/passwd',
  '/console', '/debug', '/trace', '/server-status', '/elmah.axd', '/trace.axd',
]

function isSuspiciousPath(pathname: string): boolean {
  const lower = pathname.toLowerCase()
  return SUSPICIOUS_PATHS.some((p) => lower.includes(p))
}

// ============================================================================
// Main Middleware
// ============================================================================

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const ip = getClientIP(request)
  const requestId = crypto.randomUUID()
  const response = NextResponse.next()

  applyHNSASecurityHeaders(response, requestId)

  // Block suspicious paths
  if (isSuspiciousPath(pathname)) {
    console.warn(`[HNSA] Suspicious path: ${request.method} ${pathname} IP: ${ip}`)
    return NextResponse.json(
      { error: 'Not found', code: 'NOT_FOUND' },
      { status: 404 }
    )
  }

  // API Route Protection
  if (pathname.startsWith('/api/')) {
    const category = getRateLimitCategory(pathname)
    const { allowed, retryAfterMs } = checkRateLimit(ip, category)

    if (!allowed) {
      const retryAfter = Math.ceil(retryAfterMs / 1000)
      console.warn(`[HNSA] Rate limited: ${category} | ${request.method} ${pathname} | IP: ${ip}`)
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' },
        { status: 429, headers: { 'Retry-After': String(retryAfter), 'X-RateLimit-Category': category, 'X-Request-ID': requestId } }
      )
    }

    // URL scanning for POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      const scanResult = scanUrl(request.url)
      if (!scanResult.isClean) {
        const attackType = scanResult.sqlInjection ? 'SQL_INJECTION' : 'XSS'
        console.error(`[HNSA] ${attackType} in URL: ${request.method} ${pathname} | IP: ${ip}`)
        return NextResponse.json(
          { error: 'Request contains malicious content.', code: 'SECURITY_VIOLATION' },
          { status: 400, headers: { 'X-Request-ID': requestId } }
        )
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    '/api/:path*',
    '/((?!_next/static|_next/image|favicon.ico|images/).*)',
  ],
}
