/**
 * HireNova Dev Proxy — persistent keepalive for Next.js dev server
 * 
 * This mini-service runs on port 3000 and proxies ALL requests
 * to the Next.js dev server running on port 3001.
 * 
 * It also spawns and auto-restarts the Next.js dev process.
 * Caddy (port 81) → this proxy (port 3000) → Next.js dev (port 3001)
 */

import { spawn, ChildProcess } from 'child_process'

const NEXT_PORT = 3001
const PROXY_PORT = 3000
const PROJECT_DIR = '/home/z/my-project'

let nextProcess: ChildProcess | null = null
let nextReady = false

// ─── Spawn & auto-restart Next.js dev ────────────────────────────────────
function startNextDev() {
  if (nextProcess) {
    try { nextProcess.kill('SIGTERM') } catch (_) {}
    nextProcess = null
  }
  nextReady = false

  console.log(`[dev-proxy] Starting Next.js dev on port ${NEXT_PORT}...`)

  nextProcess = spawn(
    'bun',
    ['--bun', 'next', 'dev', '-p', String(NEXT_PORT)],
    {
      cwd: PROJECT_DIR,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, PORT: String(NEXT_PORT) },
    }
  )

  nextProcess.stdout?.on('data', (data: Buffer) => {
    const text = data.toString()
    process.stdout.write(text) // pass through for dev.log visibility
    if (text.includes('Ready in')) {
      nextReady = true
      console.log(`[dev-proxy] Next.js dev is READY on port ${NEXT_PORT}`)
    }
  })

  nextProcess.stderr?.on('data', (data: Buffer) => {
    process.stderr.write(data.toString())
  })

  nextProcess.on('exit', (code, signal) => {
    console.log(`[dev-proxy] Next.js exited (code=${code}, signal=${signal}). Restarting in 3s...`)
    nextReady = false
    nextProcess = null
    setTimeout(startNextDev, 3000)
  })
}

// ─── HTTP Proxy Server on port 3000 ─────────────────────────────────────
const server = Bun.serve({
  port: PROXY_PORT,
  async fetch(req) {
    const url = new URL(req.url)

    // Health check endpoint
    if (url.pathname === '/__devproxy_health') {
      return new Response(
        JSON.stringify({ status: 'ok', nextReady, proxyPort: PROXY_PORT, nextPort: NEXT_PORT }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!nextReady) {
      return new Response(
        `<!DOCTYPE html><html><head><meta charset="utf-8"><title>HireNova — Chargement...</title>
        <style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:linear-gradient(135deg,#f0fdf4,#ecfdf5);color:#166534}
        .spinner{width:40px;height:40px;border:4px solid #bbf7d0;border-top-color:#059669;border-radius:50%;animation:spin .8s linear infinite}
        @keyframes spin{to{transform:rotate(360deg)}}</style></head>
        <body><div style="text-align:center"><div class="spinner"></div>
        <p style="margin-top:16px;font-size:14px">Serveur en cours de démarrage...</p>
        <p style="font-size:12px;opacity:.6">Veuillez patienter quelques secondes</p></div></body></html>`,
        { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Retry-After': '3' } }
      )
    }

    // Proxy to Next.js dev server
    try {
      const targetUrl = new URL(req.url)
      targetUrl.port = String(NEXT_PORT)
      targetUrl.hostname = '127.0.0.1'

      const headers = new Headers(req.headers)
      headers.set('Host', `localhost:${NEXT_PORT}`)
      headers.set('X-Forwarded-Host', req.headers.get('host') || 'localhost')
      headers.set('X-Forwarded-For', '127.0.0.1')
      headers.set('X-Forwarded-Proto', 'http')
      headers.set('X-Real-IP', '127.0.0.1')

      const resp = await fetch(targetUrl.toString(), {
        method: req.method,
        headers,
        body: req.method !== 'GET' && req.method !== 'HEAD' ? req.body : undefined,
        // @ts-expect-error Bun supports duplex
        duplex: 'half',
      })

      const respHeaders = new Headers(resp.headers)
      respHeaders.set('X-Dev-Proxy', 'active')

      return new Response(resp.body, {
        status: resp.status,
        statusText: resp.statusText,
        headers: respHeaders,
      })
    } catch (err: any) {
      console.error(`[dev-proxy] Proxy error: ${err.message}`)
      return new Response('Next.js dev server not available', { status: 502 })
    }
  },
})

console.log(`[dev-proxy] Proxy listening on port ${PROXY_PORT}`)
console.log(`[dev-proxy] Will start Next.js dev on port ${NEXT_PORT}`)

// Start Next.js dev
startNextDev()

// Keep alive — prevent process from exiting
setInterval(() => {
  // Periodic health log
  if (nextReady) {
    // Silent when healthy
  } else {
    console.log(`[dev-proxy] Waiting for Next.js dev to be ready...`)
  }
}, 30000)
