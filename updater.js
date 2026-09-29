const fs = require('fs');
const path = require('path');
const os = require('os');
const https = require('https');
const { spawnSync } = require('child_process');

const REPO = 'guerrasur/reporte';
const BRANCH = 'main';
const BASE = __dirname;
const VERSION_FILE = path.join(BASE, 'VERSION');

const SKIP_TOP_LEVEL = new Set([
  '.git',
  '.env',
  '.bistro-credentials.json',
  '.google-session-ready',
  'node_modules',
  'perfil-google',
  'perfil-bistro',
  'chrome-profile',
  'perfil-bot',
  'descargas',
  'notas-app'
]);

function localVersion() {
  try { return fs.readFileSync(VERSION_FILE, 'utf8').trim(); }
  catch { return '0'; }
}

function get(url, extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Reporte-updater',
        ...extraHeaders
      }
    }, res => {
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
        res.resume();
        return get(res.headers.location, extraHeaders).then(resolve, reject);
      }
      if (res.statusCode < 200 || res.statusCode >= 300) {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', c => body += c);
        res.on('end', () => reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 200)}`)));
        return;
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    });
    req.setTimeout(20000, () => req.destroy(new Error('Timeout consultando GitHub')));
    req.on('error', reject);
  });
}

async function remoteVersion() {
  const data = await get(
    `https://api.github.com/repos/${REPO}/contents/VERSION?ref=${BRANCH}`,
    { Accept: 'application/vnd.github.raw' }
  );
  return data.toString('utf8').trim();
}

function copyTree(srcRoot) {
  const stack = [srcRoot];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const src = path.join(current, entry.name);
      const rel = path.relative(srcRoot, src);
      const parts = rel.split(path.sep);
      if (SKIP_TOP_LEVEL.has(parts[0])) continue;

      if (entry.isDirectory()) {
        stack.push(src);
        continue;
      }

      let dest = path.join(BASE, rel);
      if (rel.toLowerCase() === 'reporte.bat') {
        dest = path.join(BASE, 'reporte.bat.new');
      }

      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
    }
  }
}

async function applyUpdate() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'reporte-update-'));
  const zip = path.join(tmp, 'main.zip');
  const out = path.join(tmp, 'out');

  try {
    const zipData = await get(`https://api.github.com/repos/${REPO}/zipball/${BRANCH}`);
    fs.writeFileSync(zip, zipData);

    const ps = spawnSync('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-Command',
      `Expand-Archive -LiteralPath '${zip.replace(/'/g, "''")}' -DestinationPath '${out.replace(/'/g, "''")}' -Force`
    ], { stdio: 'inherit' });

    if (ps.status !== 0) throw new Error('No se pudo descomprimir la actualizacion.');

    const roots = fs.readdirSync(out, { withFileTypes: true }).filter(e => e.isDirectory());
    if (!roots.length) throw new Error('El ZIP de GitHub no contiene la carpeta esperada.');

    copyTree(path.join(out, roots[0].name));

    console.log('Actualizando dependencias...');
    const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    const npm = spawnSync(npmCmd, ['install', '--no-audit', '--no-fund'], {
      cwd: BASE,
      stdio: 'inherit'
    });
    if (npm.status !== 0) {
      console.log('Aviso: npm install fallo. El programa intentara iniciar igualmente.');
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

async function main() {
  const local = localVersion();
  let remote;
  try {
    remote = await remoteVersion();
  } catch (err) {
    console.log(`No se pudieron consultar actualizaciones (${err.message}). Se inicia igual.`);
    return;
  }

  if (remote === local) {
    console.log(`Reporte v${local}: ya esta actualizado.`);
    return;
  }

  console.log(`Actualizando Reporte de v${local} a v${remote}...`);
  try {
    await applyUpdate();
    console.log(`Listo. Reporte actualizado a v${remote}.`);
  } catch (err) {
    console.log(`La actualizacion fallo (${err.message}). Se inicia con la version actual.`);
  }
}

main();
