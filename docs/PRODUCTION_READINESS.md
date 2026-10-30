# Preparación de producción

30/10/2026, America/Montevideo. El usuario autorizó preparar y verificar producción, excluyendo expresamente el correo transaccional por no disponer de remitente propio. Se conserva una aplicación, el proyecto Vercel existente y la rama `main`. Los datos de desarrollo y las pruebas del lunes no se migran ni se restauran.

## Veredicto actual

**Decisión posterior30/10: publicación gratuita de portfolio.** El propietario no dispone de dominio propio y elige conservar `slotly-gold.vercel.app` y coste cero. Se acepta usar Clerk/Convex de desarrollo para esa finalidad, sin contratar PRO, comprar dominio, migrar datos o activar correo. Esta decisión cierra la solicitud de elegir dominio/plan: no se siguen solicitando para publicar el portfolio. No constituye una certificación de operación comercial con clientes reales.

Se incorpora `SLOTLY_APP_ENV=portfolio` como modo explícito. Su build/arranque exige claves Clerk de desarrollo, destino Convex `dev:` coincidente con su URL HTTPS, origen público HTTPS y correo desactivado. El modo `production` conserva sus exigencias live/prod; no se desactiva la comprobación ni se confunde el ámbito Production de Vercel con el tipo de instancia de autenticación. El código publicado se compila optimizado con `NODE_ENV=production`.

**Publicación gratuita comprobada:** [Slotly](https://slotly-gold.vercel.app), proyecto existente en plan Vercel Hobby confirmado por lectura, fuentes `19e3a3a414e5dbdb8a9d77c7f49d41af19032342`, despliegue `dpl_FFUwmSRca4Kr1uY3ePYTzhpumBb3` READY y alias correcto. Las tres variables públicas de selección se ajustaron exclusivamente en el ámbito Production de Vercel: modo portfolio, origen HTTPS y `dev:determined-poodle-377`. Se conservaron las claves sensibles existentes, los otros ámbitos y `.env.local`. No se compró ni activó un recurso de pago. La release `977a235` y los rechazos descritos abajo son antecedentes, no una release comercial validada.

Clerk conserva la instancia de producción anterior y su proxy en `slotly-gold.vercel.app`; el diagnóstico oficial indicó DNS/SSL completos, correo DNS pendiente y Google sin credenciales de producción. La [guía vigente](https://clerk.com/docs/guides/development/deployment/vercel) exige dominio propio para producción. Se mantiene la instancia Development existente; sus [límites y arquitectura](https://clerk.com/docs/guides/development/managing-environments) no se presentan como producción. La demo anónima permite probar el producto sin crear una cuenta. Google sigue con la conexión de desarrollo existente y sus cuentas de prueba, sin ampliar el público OAuth en este trabajo.

## Cambios operativos

- `pnpm build` comprueba primero la configuración. `SLOTLY_APP_ENV=production` requiere claves Clerk `live` y `CONVEX_DEPLOYMENT=prod:<nombre>`; `portfolio` exige claves de desarrollo y `dev:<nombre>`. Ambos comprueban coincidencia con la URL HTTPS de Convex, `SLOTLY_SITE_URL` HTTPS y `SLOTLY_EMAIL_READY=false`. Vercel Production exige elegir uno de estos modos explícitos. Los mensajes muestran nombres/requisitos, nunca valores. Es una comprobación de coherencia, no una autenticación de credenciales ni una consulta del tipo real del backend.
- La instrumentación repite esa comprobación al iniciar. Los registros propios de error usan evento, hora, patrón de ruta y método; omiten mensajes/stack del error, URL real, parámetros, cuerpos y cabeceras. Los registros internos de Next/Clerk/Convex conservan sus propias políticas; no se promete que este hook filtre los logs de terceros.
- `/api/health` se ejecuta por petición, sin caché. Comprueba una consulta constante de Convex con límite de cuatro segundos; devuelve únicamente `{"status":"ok"}`/200 o `{"status":"unavailable"}`/503. No enumera negocios, versiones, contactos, destinos o credenciales. No comprueba Google ni garantiza una transacción de reserva.
- Cabeceras generales: `nosniff`, `SAMEORIGIN`, `no-referrer`, permisos de cámara/micrófono/geolocalización desactivados y CSP para `frame-ancestors`, `object-src` y `base-uri`. No se presenta esta política como una CSP completa contra XSS.
- CI en GitHub Actions: Node24, pnpm12.11.2, lockfile congelado, lint, build aislado, auditoría y motor real sintético. Acciones fijadas por SHA, permisos `contents: read`, sin credenciales cloud. El ZIP oficial del motor Windows se verifica por SHA256 antes de ejecutarlo. Las pruebas de autogestión solo usan un stub local para correo; nunca Resend real.
- La primera ejecución remota pasó instalación/lint/build/auditoría y encontró un problema del arnés al compilar componentes entre unidades Windows distintas (checkout D:, temporal C:). Se añadió un fallback bajo `node_modules/.cache` en la misma unidad, exclusivamente para el workspace sintético con marcador y limpieza acotada. No configura otro backend de aplicación ni toca `.env.local` real. La [segunda ejecución remota](https://github.com/caluff/slotly/actions/runs/41067313957), fuentes `0df42836dd7ac4542772d23a25f2d57955dea1c4`, terminó **success** en todos los pasos, incluido export/import y rearme. La ejecución fallida anterior no se cuenta como cobertura superada.
- Monitor público activado con `SLOTLY_MONITOR_ENABLED=true` y `SLOTLY_SMOKE_ORIGIN=https://slotly-gold.vercel.app`. Ejecuta lecturas anónimas cada quince minutos en un runner estándar del repositorio público, sin sesión, secretos cloud ni escrituras. La [ejecución manual nueva](https://github.com/caluff/slotly/actions/runs/41071081019) terminó success. La planificación de GitHub puede retrasarse y sus avisos dependen de la configuración de notificaciones del propietario; no se promete monitorización con SLA ni entrega de alertas ya probada.

## Verificación de la publicación gratuita

Evidencia nueva e independiente: `C:/Users/dcalu/.codex/slotly-evidence/portfolio-release-20261030/`.

- Ocho casos de configuración CLI con valores sintéticos correctos: production válido, rechazo de claves dev en production, portfolio válido, rechazo de claves live/backend prod/origen local/correo activo en portfolio y rechazo de Vercel Production sin modo aceptado. No usan credenciales ni peticiones externas.
- Lint dirigido, tipos y build optimizada aislada correctos. Build Node24/Next16.4.2 con marcador `bad3cb0e-4917-4c2f-b43d-3a4f01aaf0b4`, sin sustituir `.next` activo.
- [CI remoto nuevo](https://github.com/caluff/slotly/actions/runs/41070559052) de las fuentes `19e3a3a414e5dbdb8a9d77c7f49d41af19032342` terminado success: instalación congelada, lint, build, auditoría y los ocho pasos de integración del motor real sintético en Windows limpio. Reejecución en otro entorno, sin sumar casos a las campañas locales anteriores ni atribuirlas al cloud.
- Seis comprobaciones HTTP públicas correctas: portada, demo, acceso, gestión sin capacidad, dashboard anónimo y salud. Dashboard devuelve200 de streaming con redirección a sign-in, sin contenido privado; salud200 genérica y no-store. Cabeceras comprobadas.
- Google real desde la portada publicada con la cuenta de prueba ya autorizada: llegada a Agenda, negocio leído desde Convex y persistencia tras recarga. Demo publicada cargada, sin errores de consola en la pestaña propia. No se repitió cierre de sesión en esta ejecución ni se amplió el público de Google.
- Rollback real del alias a `dpl_DNgggnzoYj8Yj9Su3FwidFQLf2ck`/`977a235`, observado por lectura, y promoción de vuelta a `dpl_FFUwmSRca4Kr1uY3ePYTzhpumBb3`/`19e3a3a`, READY y alias verificados. Sin restaurar datos ni cambiar el backend.
- Comparación propia antes/después:17 tablas/sistemas inventariados con IDs/hashes idénticos, incluidas20citas,4clientes,48trabajos y3avisos. Tres archivos protegidos existentes idénticos, incluida la configuración local y evidencia R13. No hubo altas, reservas, cancelaciones ni acciones sobre las pruebas del lunes.

Las campañas de motor de la preparación anterior se documentan debajo con su entorno y autoría; no se suman a estas comprobaciones públicas ni se presentan como concurrencia cloud.

## Respaldo y recuperación

Se exportaron snapshots nuevos de desarrollo y producción mediante la CLI oficial, con almacenamiento, a evidencia privada fuera de Git. Producción tenía cero negocios/citas/clientes. Además se creó desde el panel un respaldo inicial de `tremendous-chihuahua-369`, con almacenamiento, completado en un segundo y retención indicada de siete días. No se importó ningún snapshot en cloud.

El panel marca la programación automática como **PRO** y actualmente `Never`. El propietario decidió mantener coste cero: se conservan respaldos/exportaciones manuales y el procedimiento de restauración probado, sin activar periodicidad de pago. Se acepta esta limitación para el portfolio; un respaldo inicial no equivale a una política periódica ni garantiza recuperación continua de datos reales.

El ZIP conserva documentos y archivos, pero **no incluye código, configuración, variables ni trabajos programados**. El procedimiento de recuperación es:

1. Detener la admisión de operaciones en el despliegue afectado y conciliar las operaciones posteriores al snapshot. Identificar y revisar el destino exacto antes de cualquier importación. Nunca ensayar sobre desarrollo protegido o sobre una base activa.
2. Disponer del commit/esquema compatible, configuración privada custodiada y snapshot con almacenamiento. Restaurar primero en un destino vacío autorizado; comprobar IDs, referencias, recibos, historiales y bytes de archivos. Un export no demuestra que la restauración funcione.
3. Revisar el inventario de citas futuras. `internal.recovery.rearmAppointmentJobs` admite hasta50 contextos explícitos por llamada, UUID v4 de la recuperación y `dryRun`. Solo rearma Confirmadas futuras habilitadas. Conserva las citas sin escribirlas; excluye legado, terminales e iniciadas/pasadas, que requieren conciliación. El helper mantiene la supresión de ausencia: puede recuperar sus recordatorios sin volver a habilitar No asistió.
4. Revisar primero `dryRun:true`, después aplicar con el mismo UUID/contextos y `dryRun:false`. Cada recuperación distinta necesita un UUID nuevo; sus reintentos mantienen el original. Índice/recibo transaccional evita duplicar trabajos del mismo comando, incluso concurrentemente. Un conflicto de contexto revierte el lote completo. Es una función interna administrativa, sin endpoint de UI ni ejecución automática al desplegar/importar.
5. Comprobar disponibilidad y scheduler, realizar un recorrido autenticado de la release y reabrir operaciones. El correo permanece desactivado. Restaurar un snapshot de otra instancia Clerk no migra sus cuentas ni arregla por sí solo la propiedad de los negocios.

La prueba nueva del arnés exportó un ZIP con10 documentos y un archivo, sustituyó exclusivamente su SQLite/almacenamiento sintéticos por un destino vacío y restauró con la CLI. Hash de documentos idéntico, IDs/metadata/archivo verificados; cuatro trabajos antes del export y cero al importar, cuatro después del rearme. Doble HTTP independiente, replay, dryRun, conflicto/rollback de lote, rechazo anónimo, legado/pasado y reinicio comprobados. Un caso adicional conserva la supresión de ausencia y recupera solo tres recordatorios. No acredita una restauración destructiva de producción ni notificaciones del SO.

## Verificación de la preparación anterior y límites

Evidencia privada: `C:/Users/dcalu/.codex/slotly-evidence/production-readiness-20261030/`. Los snapshots privados no se publican como artefactos de CI o portfolio.

| Capa | Resultado observado |
| --- | --- |
| Configuración CLI | Seis casos con valores sintéticos: formato coherente aceptado; claves dev, backend incoherente, origen local, correo activo y Vercel Production marcado desarrollo rechazados. Sin red ni secretos impresos. |
| Build/estática | Build optimizada aislada Node24/Next16.4.2, tipos y lint correctos. Salida UUID propia y configuración compartida conservada. |
| Runtime optimizado | Backend sintético inaccesible:503 genérico, `no-store` y evento estructurado observados. El proceso propio se detuvo y su salida volvió a evidencia; `.next` de desarrollo no se usó. |
| HTTP local anónimo | Seis rutas, cabeceras, salud200 y redirección de dashboard sin sesión correctos. El200 de dashboard es streaming con instrucción de redirección, no acceso privado. |
| General, motor real local | 774HTTP participantes/372carreras, tres rondas, con21 controles seriales de resultados y demás regresiones del informe. |
| Llegada/ausencia, motor local | 96HTTP/48carreras, tres rondas; no prueba permisos/entrega nativa. |
| Clientes/servicios/Deshacer, motor local | 324HTTP/162carreras, en su informe independiente. |
| Autogestión/servicios, motor local | 318HTTP/159carreras; únicamente proveedor de correo controlado en loopback. |
| Archivo / apariencia | 24HTTP/12carreras y18HTTP/9carreras, respectivamente, en ejecuciones distintas. |
| Calendario público | Seis grupos seriales, sin carreras. |
| Dependencias de ejecución | Auditoría nueva: cero vulnerabilidades conocidas reportadas. No es garantía universal de seguridad. |
| CI remoto | Instalación congelada, lint, build, auditoría y los ocho pasos de integración del workflow correctos en Windows limpio. Repite las campañas en otro entorno; no suma sus casos a las métricas locales. |

No se suman estas ejecuciones como casos únicos. La suite general detectó un drift del arnés: el adaptador añadía correo a un replay legado sin correo. Se corrigió el caller de esa prueba para enviar el payload original exacto; la comprobación de una reserva nueva en el pasado ahora aporta el contacto/contexto requeridos. No se cambió el contrato público para conseguir un resultado verde. La ejecución general final superó ambas comprobaciones; los intentos fallidos anteriores no se cuentan como cobertura superada adicional.

El backend de desarrollo recibió esquema/código aditivo y producción las fuentes actuales en su destino existente; el correo de producción quedó explícitamente `false`. Comparación de desarrollo antes/después:20citas,4clientes,48trabajos, demás documentos y archivos protegidos por hashes, sin nuevas reservas ni acciones sobre R13.

Los cambios se subieron a `main` en `71a7936` y el ajuste del arnés en `0df4283`. Vercel rechazó la build candidata por la configuración de desarrollo existente: faltan `SLOTLY_APP_ENV=production`, claves Clerk live, selección/URL de Convex producción y origen HTTPS. No se eludió la guarda. El alias conserva la release anterior `dpl_DNgggnzoYj8Yj9Su3FwidFQLf2ck` en estado READY, fuentes `977a235`. Esto verifica la conservación de la versión activa ante un build rechazado; no equivale a un rollback/promoción de una nueva release de producción.

## Límites de una futura operación comercial

- Dominio/configuración definitiva de Clerk y Google de producción; cuenta real, recarga, salida, rechazo anónimo y lectura de Convex en esa release. No bloquea la publicación gratuita de portfolio aceptada.
- Política periódica de backups activada y comprobada; la opción nativa observada requiere PRO y queda excluida del presupuesto actual.
- La publicación y el monitor del portfolio se verifican en su evidencia específica; no sustituyen los E2E de una eventual instancia comercial. El CI remoto anterior sí está superado en el commit de código enlazado arriba.
- El ensayo de rollback/promoción del portfolio está completado arriba. Una eventual instancia comercial necesitaría su propia comprobación de autenticación/configuración y recuperación.
- R13 real: entrega nativa/segundo plano y tramo con toda la app cerrada siguen pendientes. El permiso de Notification aparece granted en IAB, lo que no demuestra entrega del SO. No se repiten las citas protegidas del lunes ni se crea otra cita sin un plan concreto de prueba.

El correo transaccional es una exclusión aceptada, no un pendiente para esta puesta en producción. No se configura remitente, no se habilitan envíos ni se contrata infraestructura de correo.
