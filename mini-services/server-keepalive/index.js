const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = path.join(__dirname, '..', '..');
const logPath = path.join(projectRoot, 'dev.log');
const logFd = fs.openSync(logPath, 'a');

function startServer() {
  const serverPath = path.join(projectRoot, '.next', 'standalone', 'server.js');
  const child = spawn('node', [serverPath, '-p', '3000'], {
    cwd: projectRoot,
    env: { ...process.env, NODE_ENV: 'production' },
    stdio: [null, logFd, logFd],
  });

  child.on('exit', (code, signal) => {
    const ts = new Date().toISOString();
    const msg = `[${ts}] Server exited code=${code} signal=${signal}, restarting in 3s\n`;
    fs.writeSync(logFd, Buffer.from(msg));
    setTimeout(startServer, 3000);
  });

  child.on('error', (err) => {
    const ts = new Date().toISOString();
    const msg = `[${ts}] Server error: ${err.message}\n`;
    fs.writeSync(logFd, Buffer.from(msg));
  });

  return child;
}

const server = startServer();
const ts = new Date().toISOString();
fs.writeSync(logFd, Buffer.from(`[${ts}] Keepalive service started, server PID=${server.pid}\n`));

setInterval(() => {
  if (!server || server.killed || server.exitCode !== null) {
    fs.writeSync(logFd, Buffer.from(`[${new Date().toISOString()}] Server process dead, restarting\n`));
    startServer();
  }
}, 5000);
