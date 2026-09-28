const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const projectRoot = '/home/z/my-project';
const standaloneDir = path.join(projectRoot, '.next', 'standalone');
const logPath = path.join(projectRoot, 'dev.log');

function loadEnv() {
  const env = {};
  for (const f of [path.join(projectRoot, '.env.local'), path.join(projectRoot, '.env')]) {
    try {
      fs.readFileSync(f, 'utf8').split('\n').forEach(line => {
        const idx = line.indexOf('=');
        if (idx > 0 && !line.startsWith('#')) env[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
      });
    } catch(e) {}
  }
  return env;
}

let server = null;
let count = 0;

function start() {
  if (server) { try { server.kill('SIGTERM'); } catch(e) {} try { server.kill('SIGKILL'); } catch(e) {} }
  if (++count > 50) { fs.appendFileSync(logPath, 'Max restarts\n'); process.exit(1); }

  const env = { ...process.env, ...loadEnv(), NODE_ENV: 'production', PORT: '3000', HOSTNAME: '0.0.0.0' };
  if (!env.NEXTAUTH_SECRET) env.NEXTAUTH_SECRET = 'hirenova-dev-secret-2024';
  if (!env.NEXTAUTH_URL) env.NEXTAUTH_URL = 'http://localhost:3000';

  server = spawn('node', [path.join(standaloneDir, 'server.js')], { cwd: standaloneDir, env, stdio: ['pipe', 'pipe', 'pipe'] });
  const msg = `[Prod] #${count} starting on :3000\n`;
  console.log(msg); fs.appendFileSync(logPath, msg);
  server.stdout.on('data', d => { process.stdout.write(d); fs.appendFileSync(logPath, d); });
  server.stderr.on('data', d => { process.stderr.write(d); fs.appendFileSync(logPath, d); });
  server.on('exit', (code, sig) => { fs.appendFileSync(logPath, `[Prod] exited ${code}/${sig}, restart 3s\n`); server = null; setTimeout(start, 3000); });
}

setInterval(() => { if (server && server.exitCode !== null) start(); }, 5000);
start();
process.on('SIGTERM', () => {});
process.on('SIGHUP', () => {});
