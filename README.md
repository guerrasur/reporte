# Reporte diario Bistrosoft -> Google Form

Automatiza la descarga de los reportes diarios de Bistrosoft y deja preparado el Google Form. El envio y los archivos adjuntos siguen siendo manuales.

## Cambio importante: login de Google

Google ya no se autentica dentro del navegador controlado por Playwright. El proyecto usa dos perfiles separados:

- `perfil-bistro/`: navegador automatizado para Bistrosoft.
- `perfil-google/`: sesion de Google. Si vence, el script cierra Playwright y abre Chrome normal para que inicies sesion de forma manual y segura.

Esto evita el flujo que terminaba en el mensaje de Google indicando que el navegador o la app no eran seguros.

## Instalacion

```powershell
cd C:\reporte
npm install
```

Copia `.env.example` como `.env` y completa las credenciales de Bistrosoft si queres que el inicio de sesion sea automatico:

```env
BISTRO_USER=tu_usuario
BISTRO_PASS=tu_contrasena
```

El archivo `.env` es opcional. Si falta, esta incompleto o todavia contiene los valores de ejemplo, inicia sesion manualmente en la ventana de Bistrosoft la primera vez y presiona Enter en la consola cuando veas el panel. El perfil `perfil-bistro/` conserva la sesion para las siguientes ejecuciones. Si la sesion vence, repetis el ingreso manual.

`reporte.bat` ejecuta el reporte.

## Primera autenticacion de Google

No es obligatorio prepararla antes: si el script detecta que falta sesion, abre Chrome normal automaticamente.

Tambien podes hacerlo manualmente con:

```text
google-login.bat
```

Inicia sesion, espera a que cargue el formulario y cierra ese Chrome. La proxima corrida reutiliza esa sesion.

## Flujo diario

1. Pide `Sobrantes`, `Desperdicios` y `Aclaraciones`.
2. Abre Bistrosoft con un perfil dedicado.
3. Si hace falta, inicia sesion en Bistrosoft con `.env` o manualmente en Chrome.
4. Descarga `Ranking de V. Diario` y `Caja`.
   Si Chrome se cierra o falla la descarga, abre Bistrosoft en Chrome normal para descargar los reportes faltantes de hoy. Guarda los Excel, cierra esa ventana y presiona Enter: continua con el formulario y conserva los datos ya ingresados. Si Ranking ya se guardo, no necesitas descargarlo otra vez.
5. Cierra el navegador de Bistrosoft.
6. Abre el Google Form con el perfil de Google.
7. Si Google requiere autenticacion, cierra Playwright y abre Chrome normal para iniciar sesion; al volver, retoma automaticamente.
8. Completa fecha, sobrantes, desperdicio y observaciones.
9. Deja la ventana abierta para adjuntar los dos archivos y enviar manualmente.

## Archivos que NO se versionan

`.env`, perfiles de Chrome, cookies, caches, `node_modules`, descargas y notas diarias estan excluidos por `.gitignore`. No subas el RAR completo al repositorio: contiene datos de sesion y credenciales locales.

## Si Google vuelve a cerrar la sesion

No intentes iniciar sesion desde una ventana de Playwright. Deja que `reporte.js` abra Chrome normal o ejecuta `google-login.bat`, inicia sesion, cierra ese Chrome y vuelve a correr `reporte.bat`.


## Actualizaciones automaticas

`reporte.bat` comprueba actualizaciones en GitHub antes de iniciar el programa.

El mecanismo funciona asi:

1. `reporte.bat` ejecuta `updater.js`.
2. `updater.js` compara el archivo local `VERSION` con `VERSION` de la rama `main` de `guerrasur/reporte`.
3. Si ambas versiones coinciden, Reporte inicia normalmente.
4. Si la version remota es distinta, descarga el ZIP actual de `main`, reemplaza los archivos del programa y ejecuta `npm install` si cambian las dependencias o falta Playwright.
5. `reporte.bat` se actualiza de forma segura mediante `reporte.bat.new`: el launcher nuevo se aplica en el siguiente arranque para no reemplazar el BAT mientras esta ejecutandose.
6. Si GitHub no responde o la actualizacion falla, Reporte conserva la instalacion actual e intenta iniciar normalmente.

El actualizador no debe borrar ni reemplazar datos locales. Se preservan, entre otros:

- `.env`
- `node_modules/`
- `perfil-google/`
- `perfil-bistro/`
- `descargas/`
- `notas-app/`
- archivos y sesiones locales excluidos por `.gitignore`

### Regla obligatoria al publicar cambios

Todo cambio que deba llegar automaticamente a las PCs instaladas debe incrementar `VERSION` en el mismo conjunto de cambios.

Ejemplo:

```text
1.1.1 -> 1.1.2
```

Si se modifica codigo en `main` pero no se incrementa `VERSION`, las instalaciones que ya tengan esa misma version consideraran que estan actualizadas y no descargaran los archivos nuevos.

La primera copia antigua que no tenga `updater.js` requiere una actualizacion manual una sola vez. Desde una version que ya incluya el updater, las siguientes actualizaciones se realizan al abrir `reporte.bat`.

## Reversion v1.1.11

El script `reporte.js` vuelve exactamente al de v1.1.4 (commit `107a30b`), que descargaba ambos Excel en la instalacion del usuario. Los adjuntos y el envio del formulario son manuales. Si Bistrosoft pide login y no hay credenciales en `.env`, iniciar sesion en la ventana y presionar Enter en la consola.

Se conserva el actualizador actual y la exclusion de archivos locales, incluido `.bistro-credentials.json`. No se borran perfiles, credenciales ni descargas. El numero 1.1.11 permite distribuir la reversion automaticamente.

## v1.1.12: continuar si falla una descarga

Se mantiene la descarga nativa de la version restaurada. Si falla, el programa ofrece continuar mediante descarga manual en Chrome normal y luego prepara el formulario. No usa captura de Blob ni reintentos automaticos. Los datos ingresados se conservan mientras el programa espera. No envia el formulario ni adjunta archivos automaticamente. Esta salida evita que un cierre durante `download.saveAs` aborte todo el cierre diario; no determina la causa del cierre de Chrome en la PC.

Verificacion de regresiones: `node --test tests/report-download.test.js`.
