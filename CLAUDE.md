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

## Publicacion de cambios

Antes de considerar terminada una modificacion:

1. revisar que los archivos cambiados esten en `main`;
2. incrementar `VERSION` si el cambio debe distribuirse;
3. comprobar que `reporte.bat` siga arrancando el updater antes de `reporte.js`;
4. no incluir credenciales, perfiles ni datos locales;
5. mantener README y este archivo actualizados cuando cambie el mecanismo de instalacion o actualizacion.
