import { spawn, type ChildProcess } from 'child_process'
import http from 'http'

const NEXT_PORT = 3000
const KEEPALIVE_PORT = 3999
const LOG_FILE = '/home/z/my-project/mini-services/keepalive/keepalive.log'

function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}\n`
  try {
    console.log(line.trim())
  } catch {}
}

let nextProcess: ChildProcess | null = null

function startNext() {
  log('Starting Next.js dev server...')
  nextProcess = spawn('bun', ['--bun', 'run', 'next', 'dev', '-p', String(NEXT_PORT)], {
    cwd: '/home/z/my-project',
    env: { ...process.env },
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  nextProcess.stdout?.on('data', (d: Buffer) => {
    const text = d.toString().trim()
    if (text) log(`NEXT: ${text.split('\n').slice(0, 2).join(' | ')}`)
  })
  nextProcess.stderr?.on('data', (d: Buffer) => {
    const text = d.toString().trim()
    if (text) log(`NEXT_ERR: ${text.split('\n').slice(0, 1).join(' | ')}`)
  })

  nextProcess.on('exit', (code, signal) => {
    log(`Next.js exited (code=${code}, signal=${signal}). Restarting in 3s...`)
    nextProcess = null
    setTimeout(startNext, 3000)
  })

  nextProcess.on('error', (err) => {
    log(`Next.js error: ${err.message}. Restarting in 3s...`)
    nextProcess = null
    setTimeout(startNext, 3000)
  })
}

// Check if Next.js is actually responding, restart if not
function healthCheck() {
  const req = http.get(`http://localhost:${NEXT_PORT}/`, (res) => {
    log(`Health check: HTTP ${res.statusCode}`)
  })
  req.on('error', () => {
    log('Health check FAILED — Next.js not responding')
    if (nextProcess) {
      log('Killing stuck process...')
      nextProcess.kill('SIGTERM')
      setTimeout(() => {
        if (nextProcess) nextProcess.kill('SIGKILL')
        nextProcess = null
      }, 5000)
    }
  })
  req.setTimeout(5000, () => {
    req.destroy()
    log('Health check timeout')
  })
}

// Keepalive HTTP server for status
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({
    service: 'hirenova-keepalive',
    nextPort: NEXT_PORT,
    nextAlive: !!nextProcess,
    uptime: process.uptime(),
    pid: process.pid,
  }))
})

server.listen(KEEPALIVE_PORT, () => {
  log(`Keepalive monitor running on port ${KEEPALIVE_PORT}`)
  log(`Monitoring Next.js on port ${NEXT_PORT}`)
  startNext()
  // Health check every 15 seconds
  setInterval(healthCheck, 15000)
  // Also check every 30 seconds with restart if needed
  setInterval(() => {
    http.get(`http://localhost:${NEXT_PORT}/`, (res) => {
      // OK, server responding
    }).on('error', () => {
      if (!nextProcess) {
        log('Next.js not running, starting...')
        startNext()
      }
    })
  }, 30000)
})

process.on('SIGTERM', () => {
  log('Keepalive received SIGTERM, shutting down...')
  if (nextProcess) nextProcess.kill()
  server.close()
  process.exit(0)
})
