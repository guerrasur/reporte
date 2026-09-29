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

Cuando Bistrosoft pida iniciar sesion por primera vez, Reporte solicita usuario y contrasena una sola vez. La contrasena no se muestra al escribirla y queda cifrada en `.bistro-credentials.json` para tu usuario de Windows. En las siguientes ejecuciones completa el login automaticamente, tambien si vence la sesion del navegador. Para cambiar las credenciales, ejecuta `configurar-bistro.bat`.

Si ya usas `.env`, Reporte sigue aceptando esas credenciales y les da prioridad:

```env
BISTRO_USER=tu_usuario
BISTRO_PASS=tu_contrasena
```

El archivo `.env` es opcional. `perfil-bistro/` conserva la sesion para las siguientes ejecuciones.

`reporte.bat` ejecuta el reporte.

## Primera autenticacion de Google

No es obligatorio prepararla antes: si el script detecta que falta sesion, abre Chrome normal automaticamente.

Tambien podes hacerlo manualmente con:

```text
google-login.bat
```

Inicia sesion, espera a que cargue el formulario y cierra ese Chrome. La proxima corrida reutiliza esa sesion.
Si Chrome queda activo en segundo plano despues de cerrar la ventana, `reporte.bat` cierra solamente los procesos que usan `perfil-google/` antes de continuar con el formulario.

## Flujo diario

1. Pide `Sobrantes`, `Desperdicios` y `Aclaraciones`.
2. Abre Bistrosoft con un perfil dedicado.
3. Si hace falta, inicia sesion en Bistrosoft con las credenciales locales.
4. Descarga `Ranking de V. Diario` y `Caja`.
   Antes de descargar, elimina los archivos `bistrosoft_venta_...` y `bistrosoft_caja_...` cuya fecha en el nombre sea la de ayer. No borra otros archivos ni los de fechas anteriores.
5. Cierra el navegador de Bistrosoft.
6. Abre el Google Form con el perfil de Google.
7. Si Google requiere autenticacion, cierra Playwright y abre Chrome normal para iniciar sesion; al volver, retoma automaticamente.
8. Completa fecha, sobrantes, desperdicio y observaciones.
9. Deja la ventana abierta para adjuntar los dos archivos y enviar manualmente.

## Archivos que NO se versionan

`.env`, `.bistro-credentials.json`, perfiles de Chrome, cookies, caches, `node_modules`, descargas y notas diarias estan excluidos por `.gitignore`. No subas el RAR completo al repositorio: contiene datos de sesion y credenciales locales.

## Si Google vuelve a cerrar la sesion

No intentes iniciar sesion desde una ventana de Playwright. Deja que `reporte.js` abra Chrome normal o ejecuta `google-login.bat`, inicia sesion, cierra ese Chrome y vuelve a correr `reporte.bat`.


## Actualizaciones automaticas

`reporte.bat` comprueba actualizaciones en GitHub antes de iniciar el programa.

El mecanismo funciona asi:

1. `reporte.bat` ejecuta `updater.js`.
2. `updater.js` compara el archivo local `VERSION` con `VERSION` de la rama `main` de `guerrasur/reporte`.
3. Si ambas versiones coinciden, Reporte inicia normalmente.
4. Si la version remota es distinta, descarga el ZIP actual de `main`, reemplaza los archivos del programa y ejecuta `npm install` para incorporar dependencias nuevas.
5. `reporte.bat` se actualiza de forma segura mediante `reporte.bat.new`: el launcher nuevo se aplica en el siguiente arranque para no reemplazar el BAT mientras esta ejecutandose.
6. Si GitHub no responde o la actualizacion falla, Reporte conserva la instalacion actual e intenta iniciar normalmente.

El actualizador no debe borrar ni reemplazar datos locales. Se preservan, entre otros:

- `.env`
- `.bistro-credentials.json`
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
