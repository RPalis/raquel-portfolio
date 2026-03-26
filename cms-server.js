const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { execSync, spawn } = require('child_process');

const PORT = 3001;
const ROOT = __dirname;
const CONTENT_DIR = path.join(ROOT, 'content', 'case-studies');
const ASSETS_DIR = path.join(ROOT, 'assets', 'images');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
};

function send(res, status, body, type = 'application/json') {
  res.writeHead(status, {
    'Content-Type': type,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

function serveStatic(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) return send(res, 404, { error: 'Not found' });
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

function parseMultipart(req, callback) {
  let body = Buffer.alloc(0);
  req.on('data', chunk => { body = Buffer.concat([body, chunk]); });
  req.on('end', () => {
    const contentType = req.headers['content-type'] || '';
    const boundaryMatch = contentType.match(/boundary=(.+)/);
    if (!boundaryMatch) return callback(new Error('No boundary'), null, null);
    const boundary = '--' + boundaryMatch[1];
    const parts = body.toString('binary').split(boundary);
    let fileBuffer = null, fileName = '', fieldName = '';
    for (const part of parts) {
      if (part.includes('Content-Disposition') && part.includes('filename=')) {
        const fnMatch = part.match(/filename="([^"]+)"/);
        const nameMatch = part.match(/name="([^"]+)"/);
        if (fnMatch) fileName = fnMatch[1];
        if (nameMatch) fieldName = nameMatch[1];
        const headerEnd = part.indexOf('\r\n\r\n');
        if (headerEnd !== -1) {
          const fileData = part.slice(headerEnd + 4, part.lastIndexOf('\r\n'));
          fileBuffer = Buffer.from(fileData, 'binary');
        }
      }
    }
    callback(null, { fileName, fieldName, buffer: fileBuffer });
  });
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;
  const method = req.method;

  if (method === 'OPTIONS') {
    res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' });
    return res.end();
  }

  // Admin UI
  if (pathname === '/' || pathname === '/admin') {
    return serveStatic(res, path.join(ROOT, 'admin.html'));
  }

  // Static assets
  if (pathname.startsWith('/assets/')) {
    return serveStatic(res, path.join(ROOT, pathname));
  }

  // GET /api/projects
  if (method === 'GET' && pathname === '/api/projects') {
    fs.readdir(CONTENT_DIR, (err, files) => {
      if (err) return send(res, 500, { error: 'Cannot read content dir' });
      const projects = files.filter(f => f.endsWith('.json')).map(f => {
        try { return JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, f), 'utf8')); }
        catch { return null; }
      }).filter(Boolean);
      return send(res, 200, projects);
    });
    return;
  }

  // GET /api/projects/:slug
  if (method === 'GET' && pathname.startsWith('/api/projects/')) {
    const slug = pathname.replace('/api/projects/', '');
    fs.readFile(path.join(CONTENT_DIR, `${slug}.json`), 'utf8', (err, data) => {
      if (err) return send(res, 404, { error: 'Not found' });
      send(res, 200, data, 'application/json');
    });
    return;
  }

  // PUT /api/projects/:slug
  if (method === 'PUT' && pathname.startsWith('/api/projects/')) {
    const slug = pathname.replace('/api/projects/', '');
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        fs.writeFile(path.join(CONTENT_DIR, `${slug}.json`), JSON.stringify(data, null, 2), err => {
          if (err) return send(res, 500, { error: 'Write failed' });
          send(res, 200, { ok: true });
        });
      } catch { send(res, 400, { error: 'Invalid JSON' }); }
    });
    return;
  }

  // POST /api/projects
  if (method === 'POST' && pathname === '/api/projects') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (!data.slug) return send(res, 400, { error: 'slug required' });
        const fp = path.join(CONTENT_DIR, `${data.slug}.json`);
        if (fs.existsSync(fp)) return send(res, 409, { error: 'Slug exists' });
        fs.writeFile(fp, JSON.stringify(data, null, 2), err => {
          if (err) return send(res, 500, { error: 'Write failed' });
          send(res, 201, { ok: true });
        });
      } catch { send(res, 400, { error: 'Invalid JSON' }); }
    });
    return;
  }

  // DELETE /api/projects/:slug
  if (method === 'DELETE' && pathname.startsWith('/api/projects/')) {
    const slug = pathname.replace('/api/projects/', '');
    fs.unlink(path.join(CONTENT_DIR, `${slug}.json`), err => {
      if (err) return send(res, 404, { error: 'Not found' });
      send(res, 200, { ok: true });
    });
    return;
  }

  // POST /api/upload/:slug — image upload
  if (method === 'POST' && pathname.startsWith('/api/upload/')) {
    const slug = pathname.replace('/api/upload/', '');
    const uploadDir = path.join(ASSETS_DIR, slug);
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    parseMultipart(req, (err, file) => {
      if (err || !file.buffer) return send(res, 400, { error: 'Upload failed' });
      const ext = path.extname(file.fileName) || '.jpg';
      const safeName = file.fileName.replace(/[^a-z0-9._-]/gi, '-').toLowerCase();
      const dest = path.join(uploadDir, safeName);
      fs.writeFile(dest, file.buffer, err2 => {
        if (err2) return send(res, 500, { error: 'Save failed' });
        send(res, 200, { path: `/assets/images/${slug}/${safeName}` });
      });
    });
    return;
  }

  // POST /api/deploy
  if (method === 'POST' && pathname === '/api/deploy') {
    res.writeHead(200, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
    res.write('Deploying to Vercel...\n');
    const proc = spawn('vercel', ['--prod', '--yes'], { cwd: ROOT });
    proc.stdout.on('data', d => res.write(d.toString()));
    proc.stderr.on('data', d => res.write(d.toString()));
    proc.on('close', code => {
      res.write(code === 0 ? '\n✓ Deployed successfully!\n' : `\n✗ Deploy failed (exit ${code})\n`);
      res.end();
    });
    proc.on('error', err => { res.write(`\n✗ Error: ${err.message}\n`); res.end(); });
    return;
  }

  send(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`\n  Portfolio CMS → http://localhost:${PORT}\n`);
});
