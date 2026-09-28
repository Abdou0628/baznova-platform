const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT = '/home/z/my-project';
const PORT = 3000;
const NEXT_PORT = 3001;
const logFd = fs.openSync(path.join(PROJECT, 'dev.log'), 'a');

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  process.stdout.write(line);
  fs.writeSync(logFd, Buffer.from(line));
}

function startNext() {
  const child = spawn('node', [path.join(PROJECT, '.next', 'standalone', 'server.js')], {
    cwd: PROJECT,
    env: { ...process.env, NODE_ENV: 'production', PORT: String(NEXT_PORT), HOSTNAME: '127.0.0.1' },
    stdio: [null, logFd, logFd],
  });
  child.on('exit', (code, sig) => {
    log(`Next.js exited code=${code} sig=${sig}, restart in 3s`);
    setTimeout(startNext, 3000);
  });
  return child;
}

const proxy = http.createServer((req, res) => {
  const pr = http.request({ hostname: '127.0.0.1', port: NEXT_PORT, path: req.url, method: req.method, headers: { ...req.headers, host: 'localhost' }}, (r) => {
    res.writeHead(r.statusCode, r.headers);
    r.pipe(res);
  });
  pr.on('error', () => { res.writeHead(503); res.end('Restarting...'); });
  req.pipe(pr);
  setTimeout(() => { if (!pr.destroyed) pr.destroy(); }, 15000);
});

startNext();
proxy.listen(PORT, '0.0.0.0', () => log(`HireNova proxy :${PORT} -> Next.js :${NEXT_PORT}`));

setInterval(() => {}, 60000);
