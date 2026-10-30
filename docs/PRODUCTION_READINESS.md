# Preparación de producción

30/10/2026, America/Montevideo. El usuario autorizó preparar y verificar producción, excluyendo expresamente el correo transaccional por no disponer de remitente propio. Se conserva una aplicación, el proyecto Vercel existente y la rama `main`. Los datos de desarrollo y las pruebas del lunes no se migran ni se restauran.

## Veredicto actual

**Preparación técnica implementada; la activación y validación final de producción siguen pendientes.** La publicación que existía al comenzar servía `977a235` con Clerk/Convex de desarrollo. No se presenta esa publicación como una release ya convertida a producción.

Clerk conserva la instancia de producción anterior y su proxy en `slotly-gold.vercel.app`; el diagnóstico oficial indica DNS/SSL completos, correo DNS pendiente y Google sin credenciales de producción. La guía vigente de Clerk exige un dominio propio para su despliegue soportado en Vercel. Se ha pedido al propietario qué dominio utilizar; no se compra uno ni se usa el estado histórico del proxy como certificación nueva. Google de desarrollo no equivale a Google de producción.

## Cambios operativos

- `pnpm build` comprueba primero la configuración. Una publicación Vercel Production o `SLOTLY_APP_ENV=production` requiere claves Clerk `live`, `CONVEX_DEPLOYMENT=prod:<nombre>` coincidente con la URL HTTPS de Convex, `SLOTLY_SITE_URL` HTTPS y `SLOTLY_EMAIL_READY=false`. Los mensajes muestran nombres/requisitos, nunca valores. Es una comprobación de coherencia, no una autenticación de credenciales ni una consulta del tipo real del backend.
- La instrumentación repite esa comprobación al iniciar. Los registros propios de error usan evento, hora, patrón de ruta y método; omiten mensajes/stack del error, URL real, parámetros, cuerpos y cabeceras. Los registros internos de Next/Clerk/Convex conservan sus propias políticas; no se promete que este hook filtre los logs de terceros.
- `/api/health` se ejecuta por petición, sin caché. Comprueba una consulta constante de Convex con límite de cuatro segundos; devuelve únicamente `{"status":"ok"}`/200 o `{"status":"unavailable"}`/503. No enumera negocios, versiones, contactos, destinos o credenciales. No comprueba Google ni garantiza una transacción de reserva.
- Cabeceras generales: `nosniff`, `SAMEORIGIN`, `no-referrer`, permisos de cámara/micrófono/geolocalización desactivados y CSP para `frame-ancestors`, `object-src` y `base-uri`. No se presenta esta política como una CSP completa contra XSS.
- CI en GitHub Actions: Node24, pnpm12.11.2, lockfile congelado, lint, build aislado, auditoría y motor real sintético. Acciones fijadas por SHA, permisos `contents: read`, sin credenciales cloud. El ZIP oficial del motor Windows se verifica por SHA256 antes de ejecutarlo. Las pruebas de autogestión solo usan un stub local para correo; nunca Resend real.
- La primera ejecución remota pasó instalación/lint/build/auditoría y encontró un problema del arnés al compilar componentes entre unidades Windows distintas (checkout D:, temporal C:). Se añade un fallback bajo `node_modules/.cache` en la misma unidad, exclusivamente para el workspace sintético con marcador y limpieza acotada. No configura otro backend de aplicación ni toca `.env.local` real. El resultado del siguiente CI debe verificarse antes de declararlo superado.
- Un workflow separado prepara lecturas públicas cada quince minutos, sin sesión ni escrituras. Permanece deshabilitado hasta fijar `SLOTLY_MONITOR_ENABLED=true` y `SLOTLY_SMOKE_ORIGIN` tras verificar la release. La planificación de GitHub puede retrasarse y sus avisos dependen de la configuración de notificaciones del propietario; no se promete monitorización con SLA ni entrega de alertas ya probada.

## Respaldo y recuperación

Se exportaron snapshots nuevos de desarrollo y producción mediante la CLI oficial, con almacenamiento, a evidencia privada fuera de Git. Producción tenía cero negocios/citas/clientes. Además se creó desde el panel un respaldo inicial de `tremendous-chihuahua-369`, con almacenamiento, completado en un segundo y retención indicada de siete días. No se importó ningún snapshot en cloud.

El panel marca la programación automática como **PRO** y actualmente `Never`. No se cambió el plan. La decisión de coste permanece pendiente; un respaldo inicial no sustituye una política periódica de recuperación.

El ZIP conserva documentos y archivos, pero **no incluye código, configuración, variables ni trabajos programados**. El procedimiento de recuperación es:

1. Detener la admisión de operaciones en el despliegue afectado y conciliar las operaciones posteriores al snapshot. Identificar y revisar el destino exacto antes de cualquier importación. Nunca ensayar sobre desarrollo protegido o sobre una base activa.
2. Disponer del commit/esquema compatible, configuración privada custodiada y snapshot con almacenamiento. Restaurar primero en un destino vacío autorizado; comprobar IDs, referencias, recibos, historiales y bytes de archivos. Un export no demuestra que la restauración funcione.
3. Revisar el inventario de citas futuras. `internal.recovery.rearmAppointmentJobs` admite hasta50 contextos explícitos por llamada, UUID v4 de la recuperación y `dryRun`. Solo rearma Confirmadas futuras habilitadas. Conserva las citas sin escribirlas; excluye legado, terminales e iniciadas/pasadas, que requieren conciliación. El helper mantiene la supresión de ausencia: puede recuperar sus recordatorios sin volver a habilitar No asistió.
4. Revisar primero `dryRun:true`, después aplicar con el mismo UUID/contextos y `dryRun:false`. Cada recuperación distinta necesita un UUID nuevo; sus reintentos mantienen el original. Índice/recibo transaccional evita duplicar trabajos del mismo comando, incluso concurrentemente. Un conflicto de contexto revierte el lote completo. Es una función interna administrativa, sin endpoint de UI ni ejecución automática al desplegar/importar.
5. Comprobar disponibilidad y scheduler, realizar un recorrido autenticado de la release y reabrir operaciones. El correo permanece desactivado. Restaurar un snapshot de otra instancia Clerk no migra sus cuentas ni arregla por sí solo la propiedad de los negocios.

La prueba nueva del arnés exportó un ZIP con10 documentos y un archivo, sustituyó exclusivamente su SQLite/almacenamiento sintéticos por un destino vacío y restauró con la CLI. Hash de documentos idéntico, IDs/metadata/archivo verificados; cuatro trabajos antes del export y cero al importar, cuatro después del rearme. Doble HTTP independiente, replay, dryRun, conflicto/rollback de lote, rechazo anónimo, legado/pasado y reinicio comprobados. Un caso adicional conserva la supresión de ausencia y recupera solo tres recordatorios. No acredita una restauración destructiva de producción ni notificaciones del SO.

## Verificación nueva y límites

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

No se suman estas ejecuciones como casos únicos. La suite general detectó un drift del arnés: el adaptador añadía correo a un replay legado sin correo. Se corrigió el caller de esa prueba para enviar el payload original exacto; la comprobación de una reserva nueva en el pasado ahora aporta el contacto/contexto requeridos. No se cambió el contrato público para conseguir un resultado verde. La ejecución general final superó ambas comprobaciones; los intentos fallidos anteriores no se cuentan como cobertura superada adicional.

El backend de desarrollo recibió esquema/código aditivo y producción las fuentes actuales en su destino existente; el correo de producción quedó explícitamente `false`. Comparación de desarrollo antes/después:20citas,4clientes,48trabajos, demás documentos y archivos protegidos por hashes, sin nuevas reservas ni acciones sobre R13.

## Puertas aún abiertas

- Dominio/configuración definitiva de Clerk y Google de producción; cuenta real, recarga, salida, rechazo anónimo y lectura de Convex en esa release.
- Política periódica de backups acordada, activada y comprobada; la opción nativa observada requiere PRO.
- CI remoto, monitor activado y publicación frontend final: no se deducen de que existan sus archivos locales.
- Ensayo de rollback/promoción de la release verificada y confirmación del alias/datos después. Todavía no se ejecutó en este trabajo.
- R13 real: entrega nativa/segundo plano y tramo con toda la app cerrada siguen pendientes. El permiso de Notification aparece granted en IAB, lo que no demuestra entrega del SO. No se repiten las citas protegidas del lunes ni se crea otra cita sin un plan concreto de prueba.

El correo transaccional es una exclusión aceptada, no un pendiente para esta puesta en producción. No se configura remitente, no se habilitan envíos ni se contrata infraestructura de correo.
