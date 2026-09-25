# Reporte diario Bistrosoft -> Google Form

## Instalacion (una sola vez)

```powershell
mkdir C:\reporte
cd C:\reporte
# copiar aca reporte.js, reporte.bat, .env.ejemplo, README.md
npm init -y
npm i playwright dotenv
npx playwright install chromium
```

Renombrar `.env.ejemplo` a `.env` y poner ahi el usuario y contrasena de Bistrosoft.

### Configurar el alias `reporte`

En PowerShell (como administrador):

```powershell
$path = [Environment]::GetEnvironmentVariable("Path", "User")
[Environment]::SetEnvironmentVariable("Path", "$path;C:\reporte", "User")
```

Cerrar y volver a abrir PowerShell. A partir de ahi, escribiendo `reporte` desde
cualquier carpeta arranca el script.

## Primera corrida

La primera vez el navegador va a pedir login de Google (para el form). Logueate
a mano en esa ventana; queda guardado en `chrome-profile/` y no vuelve a pedirlo.

## Uso diario

```
reporte
```

Pregunta tres cosas y despues hace todo solo:

```
Sobrantes:
Desperdicios:
Aclaraciones:
```

Las tres son obligatorias. Si dejas una vacia, vuelve a preguntar.

## Que hace

1. Verifica sesion de Bistrosoft; si expiro, se loguea con el `.env`
2. Lee "TOTAL VENDIDO" y "EFECTIVO" del dashboard (solapa Hoy)
3. Va a Ventas y reportes -> Ranking de V. Diario -> Descargar detalle
4. Guarda el Excel en `descargas/bistrosoft_AAAA-MM-DD.xlsx`
5. Abre el Google Form y lo **recarga** (por el bug de envios fallidos)
6. Completa fecha, adjunta el Excel, y llena los 5 campos
7. Envia y clickea "Enviar otra respuesta"

Cada paso se loguea en consola con hora, para saber donde fallo si algo sale mal.

## Si Bistrosoft cambia la UI

El script usa **selectores por texto visible**, no por clases CSS. Los puntos a
revisar en `reporte.js`:

| Que cambio | Donde tocar |
|---|---|
| Nombre del reporte | linea con `'Ranking de V. Diario'` |
| Nombre del boton de descarga | regex `/descargar\s+detalle/i` |
| Etiquetas de los montos | regex `TOTAL\s+VENDIDO` y `EFECTIVO` en `leerMontos()` |
| Solapa de fecha | `getByText('Hoy', { exact: true })` |
| Campos del login | selectores en `loginSiHaceFalta()` |

Para debuggear: el navegador corre en modo visible (`headless: false`), asi que
podes ver exactamente donde se traba. Si falla, la ventana queda abierta 60
segundos.

## Si el Form cambia

Los campos se buscan por el texto de la pregunta. Si renombras una pregunta,
actualiza el string correspondiente en `completarForm()`:

- `'Facturación total'`
- `'Facturación en efectivo'`
- `'Sobrantes'`
- `'Desperdicio'`
- `'Observaciones'`

## Notas

- Los montos se leen del dashboard, no del Excel (mas simple y confiable)
- Formato de monto: `$ 1.791.425,00` se envia como `1791425.00`
- Si algun monto no se lee, el script avisa en consola pero sigue con el campo vacio
