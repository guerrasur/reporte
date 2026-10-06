const { test } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { saveReportDownload, collectReports } = require('../report-download');

function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'reporte-download-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const context = new EventEmitter();
  const page = new EventEmitter();
  page.context = () => context;
  return { page, context, base: path.join(dir, 'bistrosoft_venta_2026-10-06') };
}

function assertNoListeners(page, context) {
  for (const event of ['download', 'close', 'crash']) assert.equal(page.listenerCount(event), 0);
  assert.equal(context.listenerCount('close'), 0);
}

test('native download saves exact bytes and waits until saving finishes', async t => {
  const { page, context, base } = fixture(t);
  const bytes = Buffer.from([80, 75, 3, 4, 0, 255, 128, 10, 13]);
  const saved = await saveReportDownload(page, async () => {
    page.emit('download', {
      suggestedFilename: () => 'Ranking.xlsx',
      saveAs: async destination => {
        await new Promise(resolve => setImmediate(resolve));
        fs.writeFileSync(destination, bytes);
      },
    });
  }, base);
  assert.equal(saved, base + '.xlsx');
  assert.deepEqual(fs.readFileSync(saved), bytes);
  assertNoListeners(page, context);
});

for (const event of ['close', 'crash', 'context-close']) {
  test(`browser failure before download (${event}) rejects and cleans listeners`, async t => {
    const { page, context, base } = fixture(t);
    await assert.rejects(saveReportDownload(page, async () => {
      if (event === 'context-close') context.emit('close');
      else page.emit(event);
    }, base), /Chrome se cerro|pestaña de Bistrosoft fallo/);
    assertNoListeners(page, context);
  });
}

test('failed click does not leave a pending unhandled rejection', async t => {
  const { page, context, base } = fixture(t);
  await assert.rejects(saveReportDownload(page, async () => {
    context.emit('close');
    throw new Error('button.click: Target page, context or browser has been closed');
  }, base), /button.click/);
  assertNoListeners(page, context);
});

test('the reported saveAs failure is handled without pretending a file was saved', async t => {
  const { page, context, base } = fixture(t);
  await assert.rejects(saveReportDownload(page, async () => page.emit('download', {
    suggestedFilename: () => 'Ranking.xlsx',
    saveAs: async () => {
      context.emit('close');
      throw new Error('download.saveAs: Target page, context or browser has been closed');
    },
  }), base), /download.saveAs/);
  assert.equal(fs.existsSync(base + '.xlsx'), false);
  assertNoListeners(page, context);
});

test('empty files are rejected', async t => {
  const { page, context, base } = fixture(t);
  await assert.rejects(saveReportDownload(page, async () => page.emit('download', {
    suggestedFilename: () => 'Ranking.xlsx',
    saveAs: async destination => fs.writeFileSync(destination, ''),
  }), base), /archivo vacio/);
  assertNoListeners(page, context);
});

for (const failsAt of ['venta', 'caja']) {
  test(`failure at ${failsAt} continues manually once, preserving previous files`, async () => {
    const events = [];
    const paths = await collectReports({
      download: async (section, suffix) => {
        events.push(suffix);
        if (suffix === failsAt) throw new Error('download.saveAs: Target page, context or browser has been closed');
        return `/descargas/${suffix}.xlsx`;
      },
      close: async () => events.push('closed'),
      openManual: async saved => {
        events.push('normal-chrome');
        assert.deepEqual(saved, failsAt === 'venta' ? {} : { ventaPath: '/descargas/venta.xlsx' });
      },
      wait: async () => events.push('user-finished'),
      log: () => {},
    });
    assert.deepEqual(paths, failsAt === 'venta' ? {} : { ventaPath: '/descargas/venta.xlsx' });
    assert.deepEqual(events, [...(failsAt === 'venta' ? ['venta'] : ['venta', 'caja']), 'closed', 'normal-chrome', 'user-finished']);
  });
}

test('successful reports finish without opening manual Chrome', async () => {
  const events = [];
  const paths = await collectReports({
    download: async (section, suffix) => { events.push(suffix); return suffix + '.xlsx'; },
    close: async () => events.push('closed'),
    openManual: async () => assert.fail('manual browser should not open'),
    wait: async () => assert.fail('no manual wait needed'),
    log: () => {},
  });
  assert.deepEqual(paths, { ventaPath: 'venta.xlsx', cajaPath: 'caja.xlsx' });
  assert.deepEqual(events, ['venta', 'caja', 'closed']);
});
