// Production server with auto-restart — never dies
const { spawn, execSync } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const PORT = 3000;
const SERVER_DIR = path.join(__dirname, '..', '.next', 'standalone');
const SERVER_JS = path.join(SERVER_DIR, 'server.js');
const ENV_FILE = path.join(__dirname, '..', '.env');

let child = null;
let isRestarting = false;
let restartCount = 0;
const MAX_RESTARTS = 100;

// Parse .env file into object
function parseEnvFile(filePath) {
  const env = {};
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.substring(0, eqIdx).trim();
        let val = trimmed.substring(eqIdx + 1).trim();
        // Remove quotes
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        env[key] = val;
      }
    }
  } catch (e) {
    console.log('[prod-server] Warning: could not read .env:', e.message);
  }
  return env;
}

function buildEnv() {
  // Start with current process env
  const env = Object.assign({}, process.env);
  // Overlay .env values
  const fileEnv = parseEnvFile(ENV_FILE);
  for (const [k, v] of Object.entries(fileEnv)) {
    if (!env[k]) env[k] = v;
  }
  env.PORT = String(PORT);
  env.NODE_ENV = 'production';
  return env;
}

function startServer() {
  if (isRestarting) return;
  if (restartCount >= MAX_RESTARTS) {
    console.error(`[prod-server] Max restarts (${MAX_RESTARTS}) reached. Stopping.`);
    return;
  }
  isRestarting = true;
  restartCount++;
  
  if (child) {
    try { child.kill('SIGTERM'); } catch(e) {}
    child = null;
  }
  
  const env = buildEnv();
  
  child = spawn('node', [SERVER_JS], {
    cwd: SERVER_DIR,
    env: env,
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  });
  
  child.stdout.on('data', (data) => {
    process.stdout.write(data);
  });
  
  child.stderr.on('data', (data) => {
    process.stderr.write(data);
  });
  
  child.on('exit', (code, signal) => {
    isRestarting = false;
    console.log(`[prod-server] Next.js exited (code=${code}, signal=${signal}). Restart #${restartCount} in 3s...`);
    setTimeout(startServer, 3000);
  });
  
  child.on('error', (err) => {
    isRestarting = false;
    console.error('[prod-server] Spawn error:', err.message);
    setTimeout(startServer, 5000);
  });
  
  // Keep stdin open to prevent process from being killed
  child.stdin.on('error', () => {});
  
  console.log(`[prod-server] Started Next.js on port ${PORT} (PID: ${child.pid}, restart #${restartCount})`);
}

// Health check: restart if not responding
setInterval(() => {
  if (!child || child.killed) {
    isRestarting = false;
    startServer();
    return;
  }
  
  const req = http.get(`http://localhost:${PORT}/api/public-stats`, { timeout: 5000 }, (res) => {
    res.resume();
  });
  
  req.on('error', () => {
    console.log('[prod-server] Health check failed, restarting...');
    isRestarting = false;
    startServer();
  });
  
  req.on('timeout', () => {
    req.destroy();
    console.log('[prod-server] Health check timeout, restarting...');
    isRestarting = false;
    startServer();
  });
}, 15000);

// Prevent process from exiting
process.on('SIGTERM', () => { /* ignore */ });
process.on('SIGINT', () => { if (child) try { child.kill(); } catch(e) {} process.exit(0); });

// Write PID file for debugging
try { fs.writeFileSync('/tmp/hirenova-prod.pid', String(process.pid)); } catch(e) {}

// Start!
console.log(`[prod-server] HireNova Production Server starting...`);
startServer();
