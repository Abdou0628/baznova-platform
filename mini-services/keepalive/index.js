const { spawn } = require('child_process');
const fs = require('fs');
const log = fs.openSync('/home/z/my-project/dev.log', 'a');

function startServer() {
  const child = spawn('node', ['.next/standalone/server.js', '-p', '3000'], {
    cwd: '/home/z/my-project',
    env: { ...process.env, NODE_ENV: 'production' },
    stdio: [null, log, log],
  });
  
  child.on('exit', (code) => {
    const msg = `[${new Date().toISOString()}] Server exited code=${code}, restarting in 2s...\n`;
    fs.writeSync(log, Buffer.from(msg));
    setTimeout(startServer, 2000);
  });
  
  child.on('error', (err) => {
    const msg = `[${new Date().toISOString()}] Server error: ${err.message}\n`;
    fs.writeSync(log, Buffer.from(msg));
  });
  
  return child;
}

const server = startServer();
fs.writeSync(log, Buffer.from(`[${new Date().toISOString()}] Keepalive started, server PID=${server.pid}\n`));

// Keep the process alive
setInterval(() => {}, 60000);
