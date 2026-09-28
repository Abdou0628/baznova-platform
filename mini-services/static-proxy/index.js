const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const NEXT_PORT = 3001;
const projectRoot = '/home/z/my-project';
const logPath = path.join(projectRoot, 'dev.log');

let nextServer = null;

function startNextServer() {
  if (nextServer) try { nextServer.kill('SIGKILL'); } catch(e) {}
  
  nextServer = spawn('node', [
    '--max-old-space-size=512',
    path.join(projectRoot, '.next', 'standalone', 'server.js'),
  ], {
    cwd: projectRoot,
    env: { ...process.env, NODE_ENV: 'production', PORT: String(NEXT_PORT), HOSTNAME: '127.0.0.1', NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'dummy-secret-for-dev-hirenova-2024', DATABASE_URL: process.env.DATABASE_URL || 'file:/home/z/my-project/db/custom.db', NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'http://localhost:3000' },
    stdio: [null, 'pipe', 'pipe'],
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
    fs.appendFileSync(logPath, `[Keepalive] Next.js exited code=${code} signal=${signal}, restarting in 3s\n`);
    nextServer = null;
    setTimeout(startNextServer, 3000);
  });
}

const proxy = http.createServer((req, res) => {
  const proxyReq = http.request({
    hostname: '127.0.0.1',
    port: NEXT_PORT,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: `127.0.0.1:${NEXT_PORT}`, 'X-Forwarded-For': req.socket.remoteAddress || '127.0.0.1', 'X-Forwarded-Proto': 'http' },
  }, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });
  
  proxyReq.on('error', () => {
    res.writeHead(503, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<html><body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif"><div><h1>HireNova</h1><p>Server restarting...</p></div></body></html>');
  });
  
  req.pipe(proxyReq);
  setTimeout(() => { if (!proxyReq.destroyed) proxyReq.destroy(); }, 10000);
});

startNextServer();
proxy.listen(PORT, '0.0.0.0', () => {
  const msg = `[Keepalive] Proxy on :${PORT}, Next.js on :${NEXT_PORT}\n`;
  console.log(msg);
  fs.appendFileSync(logPath, msg);
});

setInterval(() => {
  if (nextServer && nextServer.exitCode !== null) startNextServer();
}, 5000);
