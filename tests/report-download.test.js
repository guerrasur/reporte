const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require('playwright');
const { saveReportDownload } = require('../report-download');

test('captures browser exports without native downloads; preserves HTTP downloads', async t => {
  const bytes = Buffer.from([0x50, 0x4b, 3, 4, 0, 255, 128, 10, 13, 42]);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'reporte-test-'));
  const server = http.createServer((req, res) => {
    if (req.url === '/file') {
      res.writeHead(200, { 'Content-Disposition': 'attachment; filename="test.xlsx"' });
      return res.end(bytes);
    }
    res.end('<button id="export">Export</button><a id="http" href="/file">Download</a>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ acceptDownloads: true });
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    let nativeDownloads = 0;
    page.on('download', () => nativeDownloads++);
    for (const mode of ['click', 'dispatch', 'data']) {
      await t.test(mode, async () => {
        await page.evaluate(({ mode, bytes }) => {
          window.originalAnchorClick = HTMLAnchorElement.prototype.click;
          document.querySelector('#export').onclick = () => {
            const a = document.createElement('a');
            a.download = 'test.xlsx';
            a.href = mode === 'data'
              ? 'data:application/octet-stream;base64,' + btoa(String.fromCharCode(...bytes))
              : URL.createObjectURL(new Blob([new Uint8Array(bytes)]));
            if (mode === 'dispatch') a.dispatchEvent(new MouseEvent('click'));
            else a.click();
            if (mode !== 'data') URL.revokeObjectURL(a.href);
          };
        }, { mode, bytes: [...bytes] });
        const saved = await saveReportDownload(page, () => page.click('#export'), path.join(dir, mode));
        assert.deepEqual(fs.readFileSync(saved), bytes);
        assert.equal(nativeDownloads, 0);
        assert.equal(await page.evaluate(() => HTMLAnchorElement.prototype.click === window.originalAnchorClick), true);
      });
    }
    await t.test('HTTP attachment', async () => {
      const saved = await saveReportDownload(page, () => page.click('#http'), path.join(dir, 'http'));
      assert.deepEqual(fs.readFileSync(saved), bytes);
      assert.equal(nativeDownloads, 1);
      assert.equal(page.isClosed(), false);
    });
    await t.test('failed click restores interception', async () => {
      await assert.rejects(saveReportDownload(page, async () => { throw new Error('failed click'); }, path.join(dir, 'bad')), /failed click/);
      assert.equal(await page.evaluate(() => HTMLAnchorElement.prototype.click === window.originalAnchorClick), true);
    });
  } finally {
    if (browser) await browser.close();
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
