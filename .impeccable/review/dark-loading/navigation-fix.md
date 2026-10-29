# Comprobación posterior de navegación — 29/10/2026

El aviso `instant-unrendered-segment` se reprodujo en portada y demo con el servidor de desarrollo que seguía abierto. Las comprobaciones acotadas de proveedores y presentación de acceso no lo resolvieron y se retiraron: la estructura original de temas y Clerk quedó restaurada. No se desactivó `instant`, Cache Components ni Partial Prefetching; no se modificaron dependencias, entorno, protección privada o código de negocio.

Se reinició únicamente el servidor de desarrollo de este repositorio, en el mismo puerto3000, y se abrió una pestaña QA nueva. Con esa estructura original, el aviso dejó de reproducirse. Esto acredita la recuperación del estado de desarrollo; no demuestra un defecto concreto del proveedor de temas ni una causa interna aislada de Next. No fue necesario dejar un parche funcional en la aplicación.

## Comprobaciones nuevas

- Recorrido normal CUA portada → demo → portada → dashboard con sesión → reserva pública → portada: páginas cargadas y cero errores de consola registrados en la pestaña limpia. No se inició ni cerró sesión ni se confirmó ninguna reserva.
- Cambio Claro/Oscuro, Claro conservado tras recargar y estado final Oscuro con preferencia guardada. Vistas Mes y Semana de demo operativas.
- Skeleton de agenda retenido temporalmente mediante bloqueo de chunks JS en la pestaña QA:23piezas, nombre accesible y sin desbordamiento a320px. Bloqueo/emulación retirados. En esa secuencia artificial de recuperación se observó un aviso React de actualización antes del montaje; no reapareció en el recorrido normal posterior. No se presenta como consola limpia de toda la sesión ni como prueba de latencia natural.
- Dashboard anónimo por HTTP sin cookies: respuesta200 de streaming con instrucción de redirección a sign-in, sin los nombres de las citas protegidas en el HTML. No se confunde ese200 con una autorización de acceso.
- Las tres citas R13 conservan por lectura UI IDs, nombres, servicio, intervalos y estados:12:00–12:35 Confirmada;15:30–16:05 Completada;16:15–16:50 No asistió. Comparación antes/después igual; ninguna acción de escritura sobre ellas ni nuevas pruebas R13. No se afirma una auditoría nueva de todos los campos internos cloud.
-53fuentes/configuraciones protegidas comparadas por SHA256, incluidas fuentes Convex, entorno local y configuración Next: todas idénticas. Lint, TypeScript sin emisión y diff correctos.
- Build seguro Node24.19.0/Next16.4.2 correcto, marcador `12f11767-db5d-475c-95ee-3c0ae6a6c0a7`, con tipos y salida propia; no construyó encima de `.next` activo.

Evidencia externa: `C:/Users/dcalu/.codex/slotly-evidence/next-navigation-20261029/`. Incluye consola anterior, consola del recorrido normal vacía, captura `home-clean.png`, skeleton, lectura de R13 antes/después, guard anónimo, hashes y build. Las pestañas humanas y sus contextos no se operaron. No hubo sync, migraciones, commit, push o despliegue.

Este registro resuelve el pendiente de navegación descrito en la entrega anterior; los demás límites de autenticación real y R13 permanecen.
