const { chromium } = require('playwright');
const readline = require('readline');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
require('dotenv').config();

const BISTRO_LOGIN = 'https://webaccess.bistrosoft.com/login';
const BISTRO_DASH = 'https://webaccess.bistrosoft.com/dashboard/indexV2';
const BISTRO_REPORT = 'https://webaccess.bistrosoft.com/dashboard/report';
const FORM_URL = 'https://docs.google.com/forms/d/e/1FAIpQLSePNS9A5ZGHISdKM29FAtI_2esxHzMOWAK0BS50EEHdmYzUDw/viewform';
const COMERCIO = 'LIMA ENSALADAS - SUIPACHA';

const ROOT = __dirname;
const BISTRO_PROFILE = path.join(ROOT, 'perfil-bistro');
const GOOGLE_PROFILE = path.join(ROOT, 'perfil-google');
const GOOGLE_READY = path.join(ROOT, '.google-session-ready');
const DOWNLOAD_DIR = path.join(ROOT, 'descargas');
const NOTAS_DIR = path.join(ROOT, 'notas-app', 'notas');

const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = msg => console.log(`[${new Date().toLocaleTimeString('es-AR')}] ${msg}`);

function hoy() {
  const d = new Date();
  return {
    dd: String(d.getDate()).padStart(2, '0'),
    mm: String(d.getMonth() + 1).padStart(2, '0'),
    yyyy: String(d.getFullYear()),
  };
}

function notasHoyPath() {
  const { dd, mm, yyyy } = hoy();
  return path.join(NOTAS_DIR, `notas-${yyyy}-${mm}-${dd}.json`);
}

function leerNotasHoy() {
  const file = notasHoyPath();
  if (!fs.existsSync(file)) return '';
  try {
    const notas = JSON.parse(fs.readFileSync(file, 'utf8'));
    return notas.map(n => `[${n.hora}] ${n.texto}`).join('\n');
  } catch {
    return '';
  }
}

function archivarNotasHoy() {
  const file = notasHoyPath();
  if (fs.existsSync(file)) fs.renameSync(file, file.replace(/\.json$/, '.enviado.json'));
}

function prompt(rl, text) {
  return new Promise(resolve => rl.question(text, resolve));
}

async function promptRequired(rl, text) {
  while (true) {
    const value = (await prompt(rl, text)).trim();
    if (value) return value;
  }
}

async function launchAutomated(profileDir, label) {
  fs.mkdirSync(profileDir, { recursive: true });
  log(`Abriendo Chrome (${label})...`);
  return chromium.launchPersistentContext(profileDir, {
    headless: false,
    channel: 'chrome',
    acceptDownloads: true,
    viewport: null,
    args: ['--start-maximized', '--no-default-browser-check', '--no-first-run'],
    ignoreDefaultArgs: ['--enable-automation', '--no-sandbox'],
  });
}

function chromeExe() {
  const candidates = [
    process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, 'Google', 'Chrome', 'Application', 'chrome.exe'),
    process.env['PROGRAMFILES(X86)'] && path.join(process.env['PROGRAMFILES(X86)'], 'Google', 'Chrome', 'Application', 'chrome.exe'),
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'Application', 'chrome.exe'),
  ].filter(Boolean);
  return candidates.find(p => fs.existsSync(p));
}

function openNormalGoogleChrome() {
  const exe = chromeExe();
  if (!exe) throw new Error('No encontre Google Chrome instalado.');
  fs.mkdirSync(GOOGLE_PROFILE, { recursive: true });
  const child = spawn(exe, [
    `--user-data-dir=${GOOGLE_PROFILE}`,
    '--no-first-run',
    '--no-default-browser-check',
    FORM_URL,
  ], { detached: true, stdio: 'ignore' });
  child.unref();
}

async function waitEnter(text) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await new Promise(resolve => rl.question(text, () => { rl.close(); resolve(); }));
}

async function prepareGoogleLogin() {
  console.log('');
  log('Abriendo Chrome NORMAL para preparar la sesion de Google.');
  log('Inicia sesion, espera a que aparezca el formulario y CERRA esa ventana.');
  openNormalGoogleChrome();
  await waitEnter('Cuando hayas cerrado ese Chrome, presiona Enter para continuar... ');
  fs.writeFileSync(GOOGLE_READY, new Date().toISOString(), 'utf8');
}

async function googleContextWithSession() {
  // En el primer uso NO abrimos Google dentro de Playwright: eso puede hacer
  // que Google rechace el login por detectar flags de automatizacion.
  if (!fs.existsSync(GOOGLE_READY)) {
    await prepareGoogleLogin();
  }

  let context = await launchAutomated(GOOGLE_PROFILE, 'Google Form');
  let page = context.pages()[0] || await context.newPage();
  await page.goto(FORM_URL, { waitUntil: 'domcontentloaded' });
  await sleep(3500);

  if (await page.locator('div[role="listitem"]').first().isVisible().catch(() => false)) {
    return { context, page };
  }

  // La sesion vencio o no quedo bien guardada. Cerramos el navegador
  // automatizado ANTES de pedir el login para que el usuario nunca intente
  // autenticarse dentro de Playwright.
  await context.close().catch(() => {});
  try { fs.unlinkSync(GOOGLE_READY); } catch {}

  log('La sesion de Google no esta disponible. Se abrira Chrome normal.');
  await prepareGoogleLogin();

  context = await launchAutomated(GOOGLE_PROFILE, 'Google Form');
  page = context.pages()[0] || await context.newPage();
  await page.goto(FORM_URL, { waitUntil: 'domcontentloaded' });
  await sleep(4000);

  const ok = await page.locator('div[role="listitem"]').first().isVisible().catch(() => false);
  if (!ok) {
    await context.close().catch(() => {});
    try { fs.unlinkSync(GOOGLE_READY); } catch {}
    throw new Error('Google sigue sin mostrar el formulario. Cerra Reporte, ejecuta google-login.bat, inicia sesion en Chrome normal y volve a probar.');
  }
  return { context, page };
}

async function closeModals(page) {
  for (let pass = 0; pass < 3; pass++) {
    const selectors = [
      '[aria-label="Close"], [aria-label="Cerrar"]',
      'button.close, .modal .close, .mat-dialog-container button',
      '.modal-header button, .modal button:has-text("×")',
    ];
    let closed = false;
    for (const selector of selectors) {
      const loc = page.locator(selector);
      for (let i = 0; i < await loc.count(); i++) {
        if (await loc.nth(i).isVisible().catch(() => false)) {
          await loc.nth(i).click({ timeout: 2000 }).catch(() => {});
          closed = true;
          await sleep(500);
        }
      }
    }
    if (!closed) break;
  }
}

async function bistroLogin(page) {
  await page.goto(BISTRO_DASH, { waitUntil: 'domcontentloaded' });
  await sleep(3000);
  await closeModals(page);

  const needsLogin = page.url().includes('/login') || await page.locator('input[type="password"]').count() > 0;
  if (!needsLogin) return;

  const user = process.env.BISTRO_USER;
  const pass = process.env.BISTRO_PASS;
  if (!user || !pass) throw new Error('Faltan BISTRO_USER/BISTRO_PASS en .env');

  if (!page.url().includes('/login')) await page.goto(BISTRO_LOGIN, { waitUntil: 'domcontentloaded' });
  const userInput = page.locator('input[type="email"], input[name="username"], input[name="email"], input[type="text"]').first();
  const passInput = page.locator('input[type="password"]').first();
  await userInput.waitFor({ timeout: 15000 });
  await userInput.fill(user);
  await passInput.fill(pass);

  const submit = page.getByRole('button', { name: /ingresar|iniciar|entrar|login|acceder/i }).first();
  if (await submit.count()) await submit.click();
  else await passInput.press('Enter');

  await page.waitForFunction(() => !location.href.includes('/login'), { timeout: 40000 });
  await sleep(3000);
  await closeModals(page);
}

async function selectCommerce(page) {
  if (await page.getByText(/1\s+comercios?\s+seleccionados?/i).first().count()) return;
  const filter = page.getByText(/filtro\s+comercios|comercios?\s+seleccionados?/i).first();
  if (!await filter.count()) throw new Error('No encontre el filtro de comercios.');
  await filter.click();
  await sleep(1500);

  const option = page.getByText(COMERCIO, { exact: false }).first();
  if (!await option.count()) throw new Error(`No encontre ${COMERCIO} en el filtro.`);
  await option.click();
  await sleep(800);

  const apply = page.getByRole('button', { name: /aplicar|aceptar|confirmar|ok/i }).first();
  if (await apply.count() && await apply.isVisible().catch(() => false)) await apply.click();
  else await page.keyboard.press('Escape');
  await sleep(1500);
}

async function downloadReport(page, section, suffix) {
  log(`Descargando ${section}...`);
  await page.goto(BISTRO_REPORT, { waitUntil: 'domcontentloaded' });
  await sleep(3500);
  await closeModals(page);
  await selectCommerce(page);

  const todayTab = page.getByText('Hoy', { exact: true }).first();
  if (await todayTab.count()) {
    await todayTab.click().catch(() => {});
    await sleep(2000);
  }

  await page.getByText(section, { exact: false }).first().click();
  await sleep(4000);
  const button = page.getByText(/descargar\s+detalle/i, { exact: false }).first();
  await button.waitFor({ timeout: 20000 });

  const downloadPromise = page.waitForEvent('download', { timeout: 45000 });
  await button.click();
  const download = await downloadPromise;

  const { dd, mm, yyyy } = hoy();
  const ext = path.extname(download.suggestedFilename()) || '.xlsx';
  const destination = path.join(DOWNLOAD_DIR, `bistrosoft_${suffix}_${yyyy}-${mm}-${dd}${ext}`);
  await download.saveAs(destination);
  log(`Guardado: ${destination}`);
  return destination;
}

function questionBlock(page, text) {
  return page.locator('div[role="listitem"]').filter({ hasText: text }).first();
}

async function fillForm(page, data, ventaPath, cajaPath) {
  await page.goto(FORM_URL, { waitUntil: 'domcontentloaded' });
  await sleep(2500);
  await page.evaluate(() => { try { localStorage.clear(); } catch {} }).catch(() => {});
  await page.reload({ waitUntil: 'networkidle' });
  await sleep(4000);

  if (!await page.locator('div[role="listitem"]').first().isVisible().catch(() => false)) {
    throw new Error('El Google Form no esta disponible con la sesion actual.');
  }

  const { dd, mm, yyyy } = hoy();
  const dateInput = questionBlock(page, 'Fecha').locator('input[type="date"], input[type="text"]').first();
  await dateInput.waitFor({ timeout: 30000 });
  const type = await dateInput.getAttribute('type');
  if (type === 'date') await dateInput.fill(`${yyyy}-${mm}-${dd}`);
  else await dateInput.fill(`${dd}/${mm}/${yyyy}`);

  async function fill(question, value) {
    const input = questionBlock(page, question).locator('input[type="text"], textarea').first();
    await input.waitFor({ timeout: 15000 });
    await input.fill(String(value));
    if (await input.inputValue() !== String(value)) {
      await input.fill('');
      await input.type(String(value), { delay: 50 });
    }
  }

  await fill('Sobrantes', data.sobrantes);
  await fill('Desperdicio', data.desperdicios);
  await fill('Observaciones', data.aclaraciones);

  console.log('');
  log('Formulario preparado. Los adjuntos y el envio siguen siendo manuales.');
  log(`Venta total: ${ventaPath}`);
  log(`Caja: ${cajaPath}`);
}

(async () => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const sobrantes = await promptRequired(rl, 'Sobrantes: ');
  const desperdicios = await promptRequired(rl, 'Desperdicios: ');
  const notas = leerNotasHoy();
  let aclaraciones;
  if (notas) {
    console.log('\nNotas cargadas hoy:\n' + notas + '\n');
    const value = (await prompt(rl, 'Enter para usarlas o escribi otras Aclaraciones: ')).trim();
    aclaraciones = value || notas;
  } else {
    aclaraciones = await promptRequired(rl, 'Aclaraciones: ');
  }
  rl.close();

  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
  let bistro = null;
  let google = null;

  try {
    bistro = await launchAutomated(BISTRO_PROFILE, 'Bistrosoft');
    const bistroPage = bistro.pages()[0] || await bistro.newPage();
    await bistroLogin(bistroPage);
    const ventaPath = await downloadReport(bistroPage, 'Ranking de V. Diario', 'venta');
    const cajaPath = await downloadReport(bistroPage, 'Caja', 'caja');
    await bistro.close();
    bistro = null;

    const g = await googleContextWithSession();
    google = g.context;
    await fillForm(g.page, { sobrantes, desperdicios, aclaraciones }, ventaPath, cajaPath);
    archivarNotasHoy();

    log('LISTO. Adjunta los dos archivos y envia el formulario.');
    await new Promise(() => {});
  } catch (err) {
    console.error('\nERROR:', err.message);
    process.exitCode = 1;
    await sleep(15000);
  } finally {
    if (bistro) await bistro.close().catch(() => {});
    if (google) await google.close().catch(() => {});
    process.exit(process.exitCode || 0);
  }
})();
