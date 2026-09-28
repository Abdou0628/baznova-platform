const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const STANDALONE_DIR = path.join(__dirname, '..', '..', '.next', 'standalone');
const SERVER_JS = path.join(STANDALONE_DIR, 'server.js');

let child = null;
let restarts = 0;
const MAX = 200;

// Parse .env
function loadEnv() {
  const env = { ...process.env };
  try {
    const lines = fs.readFileSync(path.join(STANDALONE_DIR, '.env'), 'utf8').split('\n');
    for (const line of lines) {
      const t = line.trim();
      if (!t || t[0] === '#') continue;
      const i = t.indexOf('=');
      if (i > 0) {
        const k = t.substring(0, i).trim();
        let v = t.substring(i + 1).trim();
        if ((v[0] === '"' && v[v.length-1] === '"') || (v[0] === "'" && v[v.length-1] === "'")) v = v.slice(1, -1);
        if (!env[k]) env[k] = v;
      }
    }
  } catch(e) { console.log('[HireNova] No .env found, using process.env'); }
  env.PORT = String(PORT);
  env.NODE_ENV = 'production';
  return env;
}

function start() {
  if (restarts >= MAX) { console.error('[HireNova] Max restarts reached'); return; }
  restarts++;
  if (child) { try { child.kill(); } catch(e) {} }

  console.log(`[HireNova] Starting server #${restarts} on port ${PORT}...`);
  child = spawn('node', [SERVER_JS], {
    cwd: STANDALONE_DIR,
    env: loadEnv(),
    stdio: ['ignore', 'inherit', 'inherit'],
  });

  child.on('exit', (code) => {
    console.log(`[HireNova] Server exited (${code}). Restarting in 2s...`);
    setTimeout(start, 2000);
  });

  child.on('error', (err) => {
    console.error('[HireNova] Error:', err.message);
    setTimeout(start, 3000);
  });
}

// Health check
setInterval(() => {
  const req = http.get(`http://localhost:${PORT}/api/public-stats`, { timeout: 3000 }, (res) => {
    res.resume();
  });
  req.on('error', () => { start(); });
  req.on('timeout', () => { req.destroy(); start(); });
}, 15000);

// Keep alive
process.on('SIGTERM', () => {});
process.on('SIGINT', () => { process.exit(0); });

start();
console.log(`[HireNova] Production server manager running (PID ${process.pid})`);
