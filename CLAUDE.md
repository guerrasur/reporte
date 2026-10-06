# CLAUDE.md - Reporte

## Proyecto

Reporte automatiza el cierre diario desde Bistrosoft hacia un Google Form.

Repositorio: `guerrasur/reporte`
Rama de distribucion: `main`
Launcher de Windows: `reporte.bat`
Script principal: `reporte.js`
Actualizador: `updater.js`
Version distribuida: archivo `VERSION`

## Regla critica de actualizaciones

El programa se actualiza automaticamente al abrir `reporte.bat`.

`updater.js` NO compara commits ni fechas. Compara solamente:

- el contenido del `VERSION` local;
- el contenido de `VERSION` en `main` de GitHub.

Por lo tanto, TODO cambio que deba distribuirse a instalaciones existentes debe incrementar `VERSION` en el mismo trabajo.

Ejemplo:

```text
1.1.1 -> 1.1.2
```

Nunca publicar una correccion funcional en `main` sin subir `VERSION`, porque los clientes con la misma version no descargaran el cambio.

## Flujo del updater

Al iniciar:

1. `reporte.bat` verifica Node.js y npm.
2. Si falta Playwright/`node_modules`, ejecuta `npm install`.
3. Ejecuta `node updater.js`.
4. El updater consulta `VERSION` en GitHub.
5. Si hay una version distinta, descarga el ZIP de `main`.
6. Copia los archivos del programa sobre la instalacion local.
7. Ejecuta `npm install --no-audit --no-fund`.
8. Si `reporte.bat` cambio, lo guarda como `reporte.bat.new`; el BAT lo reemplaza en el siguiente arranque.
9. Si la consulta o la actualizacion falla, se informa el error y se intenta iniciar la version instalada.

## Datos locales que deben preservarse

Nunca borrar, versionar ni reemplazar datos sensibles o generados localmente:

- `.env`
- `node_modules/`
- `perfil-google/`
- `perfil-bistro/`
- `chrome-profile/`
- `perfil-bot/`
- `descargas/`
- `notas-app/`
- `.google-session-ready`
- cookies, caches y credenciales locales

Mantener estas exclusiones alineadas entre `.gitignore` y la lista de exclusiones de `updater.js`.

## Google

El login de Google debe realizarse solamente en Chrome normal, nunca dentro de una ventana controlada por Playwright.

`google-login.bat` abre Chrome normal con `perfil-google`. El script principal reutiliza esa sesion ya autenticada.

Si la sesion expira, cerrar el contexto automatizado antes de pedir al usuario que vuelva a iniciar sesion.

No reintroducir un flujo donde el usuario intente autenticarse dentro de Playwright.

## Dependencias

Si se modifica `package.json` o `package-lock.json`, el updater ejecuta `npm install` despues de aplicar la actualizacion.

El primer arranque tambien instala dependencias automaticamente si falta Playwright.

## Credenciales de Bistrosoft

`.env` es opcional. Si faltan `BISTRO_USER` o `BISTRO_PASS`, o siguen con los valores de `.env.example`, el script espera a que la persona inicie sesion manualmente en el Chrome de Bistrosoft y confirme con Enter. `perfil-bistro/` conserva esa sesion. Con credenciales configuradas, el login automatico sigue disponible. Nunca versionar `.env` ni las sesiones.

## Publicacion de cambios

Antes de considerar terminada una modificacion:

1. revisar que los archivos cambiados esten en `main`;
2. incrementar `VERSION` si el cambio debe distribuirse;
3. comprobar que `reporte.bat` siga arrancando el updater antes de `reporte.js`;
4. no incluir credenciales, perfiles ni datos locales;
5. mantener README y este archivo actualizados cuando cambie el mecanismo de instalacion o actualizacion.

## Reversion solicitada: v1.1.11

v1.1.11 restauro el flujo de v1.1.4 (`107a30b`). Mantener los adjuntos manuales. No reintroducir captura de Blob ni reintentos automaticos tras cierres de Chrome. Se conserva `updater.js` actual: instala dependencias solo cuando cambian o falta Playwright; Windows ejecuta npm con shell. Mantener `.bistro-credentials.json` excluido del actualizador y de git aunque este flujo no lo utilice.

## Descargas v1.1.12

`report-download.js` mantiene la descarga nativa y verifica que el archivo guardado no este vacio. Ante un fallo en los reportes, cierra el contexto de Bistrosoft, abre Chrome normal con `perfil-bistro` y pide descargar manualmente los Excel faltantes. Tras Enter continua con el Google Form usando los datos ingresados en esa misma ejecucion. No reintenta ni anuncia como guardados archivos cuya descarga fallo. Adjuntos y envio siguen siendo manuales. El mensaje de cierre no identifica por si solo la causa del cierre de Chrome.
