const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const NEXT_PORT = 3001;
const projectRoot = '/home/z/my-project';
const logPath = path.join(projectRoot, 'dev.log');

let nextServer = null;
let restartCount = 0;
const MAX_RESTARTS = 100;

function startNextServer() {
  if (nextServer) {
    try { nextServer.kill('SIGTERM'); } catch(e) {}
    try { nextServer.kill('SIGKILL'); } catch(e) {}
  }
  
  restartCount++;
  if (restartCount > MAX_RESTARTS) {
    fs.appendFileSync(logPath, `[Keepalive] Max restarts. Exiting.\n`);
    process.exit(1);
  }
  
  nextServer = spawn('npx', [
    'next', 'dev',
    '-p', String(NEXT_PORT),
    '-H', '127.0.0.1',
    '--turbopack',
  ], {
    cwd: projectRoot,
    env: {
      ...process.env,
      NODE_ENV: 'development',
      NODE_OPTIONS: '--max-old-space-size=256',
      PORT: String(NEXT_PORT),
      HOSTNAME: '127.0.0.1',
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  
  nextServer.stdout.on('data', d => {
    process.stdout.write(d);
    fs.appendFileSync(logPath, d);
  });
  nextServer.stderr.on('data', d => {
    process.stderr.write(d);
    fs.appendFileSync(logPath, d);
  });
  
  nextServer.on('exit', (code, signal) => {
    const msg = `[Keepalive] Exited code=${code} sig=${signal}, restart #${restartCount} in 3s\n`;
    fs.appendFileSync(logPath, msg);
    nextServer = null;
    setTimeout(startNextServer, 3000);
  });
}

setInterval(() => {
  if (nextServer && nextServer.exitCode !== null) startNextServer();
}, 5000);

const proxy = http.createServer((req, res) => {
  const proxyReq = http.request({
    hostname: '127.0.0.1',
    port: NEXT_PORT,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `127.0.0.1:${NEXT_PORT}`, 'X-Forwarded-For': req.socket.remoteAddress || '127.0.0.1', 'X-Forwarded-Proto': 'http' },
  }, (proxyRes) => {
    // Override cache headers to force fresh content
    const h = { ...proxyRes.headers };
    h['cache-control'] = 'no-cache, no-store, must-revalidate, max-age=0';
    h['pragma'] = 'no-cache';
    h['expires'] = '0';
    // Prevent any downstream caching
    delete h['etag'];
    res.writeHead(proxyRes.statusCode, h);
    proxyRes.pipe(res);
  });
  
  proxyReq.on('error', () => {
    res.writeHead(503, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end('<html><body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif"><div><h1>HireNova</h1><p>Démarrage...</p></div></body></html>');
  });
  
  req.pipe(proxyReq);
  setTimeout(() => { if (!proxyReq.destroyed) proxyReq.destroy(); }, 30000);
});

startNextServer();
proxy.listen(PORT, '0.0.0.0', () => {
  const msg = `[Keepalive] :${PORT} -> dev :${NEXT_PORT}\n`;
  console.log(msg);
  fs.appendFileSync(logPath, msg);
});

process.on('SIGTERM', () => {});
process.on('SIGHUP', () => {});
