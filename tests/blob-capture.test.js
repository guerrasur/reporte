const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { installBlobCapture } = require('../report-download');

function fixture() {
  let nativeClicks = 0;
  class Anchor {
    click() { nativeClicks++; }
    dispatchEvent() { nativeClicks++; return true; }
  }
  class Reader {
    async readAsDataURL(blob) {
      this.result = 'data:application/octet-stream;base64,' + Buffer.from(await blob.arrayBuffer()).toString('base64');
      this.onload();
    }
  }
  const context = { window: {}, HTMLAnchorElement: Anchor, FileReader: Reader, fetch,
    document: { addEventListener() {}, removeEventListener() {} } };
  const originalClick = Anchor.prototype.click;
  const originalDispatch = Anchor.prototype.dispatchEvent;
  vm.runInNewContext(`(${installBlobCapture.toString()})()`, context);
  return { context, Anchor, originalClick, originalDispatch, clicks: () => nativeClicks };
}

for (const mode of ['click', 'dispatch', 'data']) {
  test(`export ${mode}: exact binary content, no native download, restore hooks`, async () => {
    const f = fixture();
    const bytes = Buffer.from([0, 255, 128, 80, 75, 3, 4, 10, 13]);
    const a = new f.Anchor();
    a.download = 'reporte.xlsx';
    a.href = mode === 'data' ? 'data:application/octet-stream;base64,' + bytes.toString('base64')
      : URL.createObjectURL(new Blob([bytes]));
    if (mode === 'dispatch') a.dispatchEvent({ type: 'click' });
    else a.click();
    if (mode !== 'data') URL.revokeObjectURL(a.href);
    const result = await f.context.window.__reporteExport.result;
    assert.equal(result.error, undefined);
    assert.deepEqual(Buffer.from(result.data, 'base64'), bytes);
    assert.equal(f.clicks(), 0);
    f.context.window.__reporteExport.restore();
    assert.equal(f.Anchor.prototype.click, f.originalClick);
    assert.equal(f.Anchor.prototype.dispatchEvent, f.originalDispatch);
    assert.equal(f.context.window.__reporteExport, undefined);
  });
}

test('normal HTTP links keep their native behavior', () => {
  const f = fixture();
  const a = new f.Anchor();
  a.href = 'https://example.test/report.xlsx';
  a.click();
  assert.equal(f.clicks(), 1);
  assert.equal(f.context.window.__reporteExport.started, false);
  f.context.window.__reporteExport.restore();
});

test('failed blob read is reported rather than silently saved', async () => {
  const f = fixture();
  const a = new f.Anchor();
  a.href = 'blob:invalid';
  a.click();
  const result = await f.context.window.__reporteExport.result;
  assert.ok(result.error);
  assert.equal(result.data, undefined);
  f.context.window.__reporteExport.restore();
});
