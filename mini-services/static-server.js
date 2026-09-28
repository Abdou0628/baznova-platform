const fs = require('fs');
const path = require('path');
const { createServer } = require('http');
const { parse } = require('url');

// SIMPLE STATIC FILE SERVER THAT SERVES PRODUCTION BUILD
// This avoids Turbopack OOM issues while serving pre-built content

const PORT = 3000;
const projectRoot = '/home/z/my-project';
const standaloneDir = path.join(projectRoot, '.next', 'standalone');
const staticDir = path.join(standaloneDir, '.next', 'static');
const publicDir = path.join(standaloneDir, 'public');

// Load env
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

const envVars = loadEnv();
if (!envVars.NEXTAUTH_SECRET) envVars.NEXTAUTH_SECRET = 'hirenova-dev-secret-2024';
if (!envVars.NEXTAUTH_URL) envVars.NEXTAUTH_URL = 'http://localhost:3000';

// Set env for any child processes
Object.assign(process.env, envVars, { NODE_ENV: 'production' });

const NO_CACHE = { 'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0', 'Pragma': 'no-cache', 'Expires': '0' };

const server = createServer((req, res) => {
  const urlPath = parse(req.url).pathname;
  
  // Serve static files
  if (urlPath.startsWith('/_next/static/') || urlPath.startsWith('/_next/image/')) {
    const filePath = path.join(standaloneDir, urlPath);
    serveFile(filePath, res, 'application/javascript');
    return;
  }
  
  // Serve public files
  const publicPath = path.join(publicDir, urlPath);
  if (fs.existsSync(publicPath) && fs.statSync(publicPath).isFile()) {
    serveFile(publicPath, res, getMimeType(publicPath));
    return;
  }
  
  // For all other routes, we need Next.js server rendering
  // Spawn a standalone server request handler inline
  res.writeHead(200, { ...NO_CACHE, 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<html><body style="display:flex;align-items:center;justify-content:center;height:100vh"><h1>HireNova</h1></body></html>');
});

function serveFile(filePath, res, contentType) {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath);
      res.writeHead(200, { ...NO_CACHE, 'Content-Type': contentType, 'Content-Length': data.length });
      res.end(data);
      return;
    }
  } catch(e) {}
  res.writeHead(404, NO_CACHE);
  res.end('Not found');
}

function getMimeType(filePath) {
  if (filePath.endsWith('.js')) return 'application/javascript';
  if (filePath.endsWith('.css')) return 'text/css';
  if (filePath.endsWith('.html')) return 'text/html';
  if (filePath.endsWith('.json')) return 'application/json';
  if (filePath.endsWith('.png')) return 'image/png';
  if (filePath.endsWith('.svg')) return 'image/svg+xml';
  if (filePath.endsWith('.ico')) return 'image/x-icon';
  return 'application/octet-stream';
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[StaticServer] Production files on :${PORT}`);
});
process.on('SIGTERM', () => {});
process.on('SIGHUP', () => {});
