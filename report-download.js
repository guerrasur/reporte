const fs = require('fs');
const path = require('path');

// Runs in the report page, only while its export button is being clicked.
function installBlobCapture() {
  const key = '__reporteExport';
  const proto = HTMLAnchorElement.prototype;
  const originalClick = proto.click;
  const originalDispatch = proto.dispatchEvent;
  const state = window[key] = { started: false, result: null };

  function capture(anchor) {
    if (!anchor || !/^(blob:|data:)/i.test(anchor.href)) return false;
    if (state.started) return true;
    state.started = true;
    state.result = (async () => {
      try {
        // Start reading before the exporting library revokes the object URL.
        const blob = await (await fetch(anchor.href)).blob();
        const data = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result.split(',')[1]);
          reader.onerror = () => reject(new Error('No se pudo leer el Excel generado.'));
          reader.readAsDataURL(blob);
        });
        return { data, name: anchor.download || 'reporte.xlsx' };
      } catch (err) {
        return { error: err.message };
      }
    })();
    return true;
  }

  // FileSaver and spreadsheet exporters also click detached anchors.
  proto.click = function (...args) {
    if (!capture(this)) return originalClick.apply(this, args);
  };
  proto.dispatchEvent = function (event) {
    if (event.type === 'click' && capture(this)) return true;
    return originalDispatch.call(this, event);
  };
  const listener = event => {
    if (capture(event.target.closest?.('a'))) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };
  document.addEventListener('click', listener, true);
  state.restore = () => {
    proto.click = originalClick;
    proto.dispatchEvent = originalDispatch;
    document.removeEventListener('click', listener, true);
    delete window[key];
  };
}

async function saveReportDownload(page, trigger, destinationBase) {
  await page.evaluate(installBlobCapture);
  let timer;
  let onDownload;
  const nativeDownload = new Promise((resolve, reject) => {
    onDownload = download => resolve({ download });
    page.once('download', onDownload);
    timer = setTimeout(() => reject(new Error('Bistrosoft no genero el archivo en 45 segundos.')), 45000);
  });
  // Attach rejection handlers before clicking, including if the page closes.
  const result = Promise.race([
    nativeDownload,
    page.waitForFunction(() => window.__reporteExport?.started, null, { timeout: 45000 })
      .then(async handle => { await handle.dispose(); return { generated: true }; }),
  ]);
  result.catch(() => {});
  try {
    await trigger();
    const event = await result;
    if (event.generated) {
      console.log('Excel generado por Bistrosoft detectado. Guardando directamente...');
      const file = await page.evaluate(() => window.__reporteExport.result);
      if (file.error) throw new Error(`Error leyendo el Excel: ${file.error}`);
      const data = Buffer.from(file.data, 'base64');
      if (!data.length) throw new Error('Bistrosoft genero un archivo vacio.');
      const ext = path.extname(file.name) || '.xlsx';
      const destination = destinationBase + ext;
      fs.writeFileSync(destination, data);
      return destination;
    }
    // Server-hosted exports still use the normal download path.
    console.log('Bistrosoft entrego una descarga del servidor. Guardando con Chrome...');
    const ext = path.extname(event.download.suggestedFilename()) || '.xlsx';
    const destination = destinationBase + ext;
    await event.download.saveAs(destination);
    return destination;
  } finally {
    clearTimeout(timer);
    page.removeListener('download', onDownload);
    await page.evaluate(() => window.__reporteExport?.restore()).catch(() => {});
  }
}

module.exports = { saveReportDownload, installBlobCapture };
