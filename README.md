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

Copia `.env.example` como `.env` y completa las credenciales de Bistrosoft:

```env
BISTRO_USER=tu_usuario
BISTRO_PASS=tu_contrasena
```

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
3. Si hace falta, inicia sesion en Bistrosoft usando `.env`.
4. Descarga `Ranking de V. Diario` y `Caja`.
5. Cierra el navegador de Bistrosoft.
6. Abre el Google Form con el perfil de Google.
7. Si Google requiere autenticacion, cierra Playwright y abre Chrome normal para iniciar sesion; al volver, retoma automaticamente.
8. Completa fecha, sobrantes, desperdicio y observaciones.
9. Deja la ventana abierta para adjuntar los dos archivos y enviar manualmente.

## Archivos que NO se versionan

`.env`, perfiles de Chrome, cookies, caches, `node_modules`, descargas y notas diarias estan excluidos por `.gitignore`. No subas el RAR completo al repositorio: contiene datos de sesion y credenciales locales.

## Si Google vuelve a cerrar la sesion

No intentes iniciar sesion desde una ventana de Playwright. Deja que `reporte.js` abra Chrome normal o ejecuta `google-login.bat`, inicia sesion, cierra ese Chrome y vuelve a correr `reporte.bat`.
