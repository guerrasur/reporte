const fs = require('fs');
const path = require('path');

// Keep the native Chrome download flow. Handle failures even if the click
// rejects before waitForEvent does (for example when Chrome closes).
async function saveReportDownload(page, trigger, destinationBase) {
  let timer;
  let onDownload;
  let onClose;
  let onCrash;
  const context = page.context();
  const pending = new Promise((resolve, reject) => {
    onDownload = resolve;
    onClose = () => reject(new Error('Chrome se cerro antes de iniciar la descarga.'));
    onCrash = () => reject(new Error('La pestaña de Bistrosoft fallo durante la descarga.'));
    page.once('download', onDownload);
    page.once('close', onClose);
    page.once('crash', onCrash);
    context.once('close', onClose);
    timer = setTimeout(() => reject(new Error('Bistrosoft no inicio la descarga en 45 segundos.')), 45000);
  });
  pending.catch(() => {});
  try {
    await trigger();
    const download = await pending;
    const ext = path.extname(download.suggestedFilename()) || '.xlsx';
    const destination = destinationBase + ext;
    await download.saveAs(destination);
    if (!fs.statSync(destination).size) throw new Error('Bistrosoft descargo un archivo vacio.');
    return destination;
  } finally {
    clearTimeout(timer);
    page.removeListener('download', onDownload);
    page.removeListener('close', onClose);
    page.removeListener('crash', onCrash);
    context.removeListener('close', onClose);
  }
}

async function collectReports({ download, close, openManual, wait, log }) {
  const paths = {};
  try {
    paths.ventaPath = await download('Ranking de V. Diario', 'venta');
    paths.cajaPath = await download('Caja', 'caja');
  } catch (err) {
    log(`No se pudo completar la descarga automatica: ${err.message}`);
    await close();
    log('Tus sobrantes, desperdicios y aclaraciones siguen guardados para esta ejecucion.');
    await openManual(paths);
    await wait();
    return paths;
  }
  await close();
  return paths;
}

module.exports = { saveReportDownload, collectReports };
