# Cierre de la primera versión de Slotly

**Entrega21,25/10/2026:** documentación y presentación terminadas en la copia principal y revisadas por planificación. El [estado actual](PROJECT_CONTEXT.md) distingue ejecución y pendientes; los apartados siguientes conservan el alcance acordado y los registros de cada etapa.

| Reto | Resultado y alcance |
| --- | --- |
|16 Cancelar | Implementado y E2E real de desarrollo completado por planificación con autorización. |
|17 Reprogramar | Implementado y E2E real de desarrollo completado: identidad/duración conservadas y cancelación final; motor local separado. |
|18 Revisar | Revisión integral aceptada; sin vulnerabilidades confirmadas dentro de su alcance y límites de terceros explícitos. |
|19 Operar | Preparación aceptada: recuperación/acuse claros, retry, build Node24 aislado y guía operativa. |
|20 Publicar | Publicación/guardas anónimas aceptadas; producción separada y vacía, sin autenticación positiva validada. |
|21 Presentar | README, arquitectura, capturas reales y conciliación documental; sin cambios de ejecución ni nueva publicación. |

**Pendientes independientes:** credenciales Google propias y E2E autenticado de producción; remitente/credencial y envío real15; pruebas protegidas del lunes26/10 de13. No se ejecutaron rollback real ni CI remoto. No se afirma que todos los flujos estén totalmente validados. [Pasos de Google y release](RELEASE.md).

## Alcance acordado y registros de ejecución

25/10/2026, America/Montevideo. El usuario autorizó implementar el Reto16 y continuar con los retos restantes, comprobar cada uno y explicar el conjunto al terminar. Se fija este cierre en seis retos, sin añadir nuevas funcionalidades fuera de este alcance. La planificación y revisión se realizan en este chat; el código, en el chat de implementación existente y directamente en la copia principal.

## Reto16 — Cancelación pública segura

Solo las nuevas reservas públicas obtienen un enlace privado para consultar datos mínimos de su cita y cancelarla sin cuenta. Se muestra/copia desde la confirmación y funciona con el correo desactivado. La posesión del enlace concede únicamente ese acceso; un correo, nombre o ID no lo sustituye. El secreto debe ser impredecible, guardarse en servidor únicamente mediante su hash y no aparecer en registros, analítica, referers o DTO ajenos. Recarga/replay recuperan el mismo comando, sin emitir accesos nuevos ni migrar reservas anteriores.

Cancelar exige Confirmada, inicio futuro según servidor y revisión explícita vigente. Un cambio del propietario exige revisar otra vez; reintentos no sobrescriben cambios posteriores. La cancelación conserva historial y libera ocupación en ambas rutas. Confirmación accesible, teclado/foco/Escape, estados honestos y controles36px. Las transacciones y jobs existentes mantienen sus reglas.

Aceptación: acceso limitado y errores genéricos; tokens inválidos/ajenos rechazados; cancelación y replay estables; conflictos/ABA seguros; disponibilidad/historial correctos; privacidad y legado preservados; integración HTTP real local, UI pertinente y comprobaciones estáticas correctas.

Registro de implementación25/10, anterior al E2E: implementado/sincronizado solo en desarrollo;207 carreras/414 solicitudes del motor real local,45/90 de gestión,28 grupos seriales de gestión y regresiones pertinentes correctas. Secretos solo hash en servidor, legado sin backfill, TTL90d/revocación, recibos originales y transacciones/jobs conservados. «Reservar otra cita» distingue una intención nueva de la recuperación. Lint/tipos/build con salida propia y revisión visual de estados reales sin escritura. **Actualización posterior: planificación completó la prueba real autorizada16/17 en desarrollo; enlace/copia, diálogo, cancelación, recarga/replay y reset comprobados.** Contrato y evidencia: [PUBLIC_MANAGEMENT.md](PUBLIC_MANAGEMENT.md). El avance17 se registra debajo;18–21 conservan su alcance.

## Reto17 — Reprogramación pública segura

Extiende únicamente el enlace anterior con reprogramación de una Confirmada futura, manteniendo ID, cliente, servicio y duración histórica. Opciones derivadas del mismo resolver compartido de ocupación, semana, excepciones y bloqueos. Confirmación del contexto revisado y comando estable ante recarga/incertidumbre. No nueva ficha/cita ni correo de reprogramación.

Aceptación: movimiento atómico y un ganador por capacidad; origen/destino y adyacencia correctos; recibo original inmutable; doble/replay/ABA/cancelación/cambios del propietario seguros; tokens y datos ajenos inaccesibles; UI y regresiones pertinentes comprobadas.

Registro de implementación25/10, anterior al E2E: implementado y sincronizado solo en desarrollo. Conserva capacidad16/TTL/revocación y cita/cliente/servicio/duración histórica; comparte resolver y escritura efectiva privada sin alterar guardas/R13. Acuse técnico único por comando, también no-op, para rechazar UUID con otro destino; sin otra cita/ficha ni renovación de timestamp/versión/jobs/toast en noop/replay. Diarios move:v1 y cancel16 separados; incertidumbre bloquea otra intención. Campaña final159 carreras/318 solicitudes (R17 54/108, cancelación16 45/90, servicios60/120),38grupos seriales principales (36R17+2controles suplementarios16), más2de Deshacer separados. Dos llamadas stub totales, cero correo real. Lint/tipos/build propios correctos; UI capturada solo en estados genéricos y revisada estáticamente. **E2E positivo posterior completado por planificación en desarrollo.** Al entregar la implementación se conservaban18citas/3fichas/36jobs y aún no había accesos/acuses nuevos; la ejecución posterior dejó20citas/4fichas/48jobs, descritos al final de este documento. Contrato/evidencia en PUBLIC_MANAGEMENT.md y C:/Users/dcalu/.codex/slotly-evidence/reto17-public-rescheduling/20261025-main/. El avance18 corresponde a la entrega posterior.

## Reto18 — Revisión integral y seguridad

Revisar los flujos completos públicos/privados, permisos, DTO, secretos de gestión, cuotas y consultas acotadas. Resolver defectos demostrados dentro de esos contratos. Reutilizar pruebas válidas y añadir integración solo para riesgos o fallos no cubiertos. No incorporar un nuevo framework de unitarios, nuevas funciones de negocio ni una auditoría de producción ficticia.

Aceptación: hallazgos relevantes resueltos o delimitados con evidencia; cobertura real y regresiones atribuidas por capa; comprobaciones finales pertinentes; datos y pruebas protegidas intactos.

Estado25/10: revisión terminada y entregada a planificación, sin vulnerabilidades demostradas que requieran cambios de ejecución. Auditoría independiente, modelo de arquitectura y pases focales;238archivos de código/texto/configuración revisados de246rutas,8activos binarios excluidos/preservados. Matriz de permisos/DTO/capacidades/replay/ocupación/jobs/correo y límites en [SECURITY_REVIEW.md](SECURITY_REVIEW.md). La hipótesis Clerk se cierra mediante inspección instalada acotada: no se demostró transmisión del fragmento ni se garantiza el SDK/CDN remoto. Fuentes runtime/config iguales a17; evidencia local/lint/tipos/build y E2E real posterior reutilizados por hash, sin nuevas campañas/escrituras. Audit previo sin avisos y package/lock intactos. Conservados14tablas/20citas/4fichas/48jobs y4archivos R13 por IDs/hashes completos, servidores y configuración. Solo cambios documentales; índice y diff exclusivo18 en `C:/Users/dcalu/.codex/slotly-evidence/reto18-security/20261025-main/`. Revisión posterior aceptada por planificación antes de19. No cierra R13 del lunes ni correo real; los textos/reintento se resolvieron en19.

## Reto19 — Preparación operativa

Preparar comprobaciones reproducibles y documentación de configuración, arranque, recuperación, fallos de conexión, publicación y reversión; verificar los estados de error/carga accesibles y corregir fallos existentes relevantes. Sin infraestructura de observabilidad nueva, PII en logs, endpoints de diagnóstico públicos ni cambios automáticos de datos. Cualquier automatización de CI usa configuración sintética o secretos referenciados, nunca credenciales incorporadas.

Aceptación: instrucciones contrastadas con scripts reales, comprobaciones ejecutables, secretos separados, errores útiles sin filtraciones y plan de recuperación verificable. No se confunde una receta de restauración con una restauración real ejecutada.

Estado25/10: implementado y posteriormente aceptado por coordinación antes de20. Mensaje neutral al restaurar el intento y Confirmación original para el acuse inmutable; Gestión consulta el estado vigente, sin modificar protocolo/backend. Error público conectado a `retry()` conforme a docs16.4/Context7. Retirado alias `test:local` que usaba BD persistente; legado/config/respaldos intactos y no ejecutados. Nuevo runner `verify:build` con Node24, salida/tsconfig UUID propios y conservación de configuración compartida; build final/tipos Turbopack16.4.2 con Node24.19.0 correctos, lint y TypeScript sin emisión correctos. README y [OPERATIONS.md](OPERATIONS.md) contrastan arranque/CLI/binario/recuperación/publicación/reversión sin provisionar ni ejecutar CI/rollback/despliegue. UI propia fresca1280×720 con36px/sin desborde; ramas de recuperación/acuse verificadas por fuente/build sin fabricar storage/capacidades o reservas. Motor/E2E16–17 reutilizados,0escrituras reales/sync/correos,14tablas/20citas/4fichas/48jobs y4archivos R13 preservados. Evidencia y diff incremental en `C:/Users/dcalu/.codex/slotly-evidence/reto19-operations/20261025-main/`. Reto13 del lunes/correo real permanecen independientes. La publicación20 se realizó después de aceptar esta entrega.

## Reto20 — Despliegue verificable

Decisión humana posterior del25/10: usar una **dirección gratuita de Vercel**, sin compra de dominio ni servicios de pago. Planificación comprobó por lectura la cuenta conectada y la ausencia de un proyecto Slotly. La elección no permite usar proyectos ajenos ni publicar los datos protegidos del desarrollo. La preparación y verificación del destino deben respetar esa separación.

Inspeccionar el destino de hosting disponible y preparar un despliegue de las fuentes finales con configuración explícita, separación de datos y rollback. No publicar el backend dev con datos protegidos como producción, copiar secretos de otros proyectos, cambiar Clerk/servidores o contratar servicios. Completar preparación y revisión antes de solicitar el dato o aprobación concreta que realmente falte para publicar. Si falta destino, credencial o autorización específica, registrar el bloqueo exacto y continuar con las demás tareas independientes.

Aceptación: build final válido sin romper .next activo, configuración/destino revisados, comprobación del despliegue si puede ejecutarse autorizado y estado real honesto si no. No declarar producción validada a partir de un build local.

Resultado20: [publicación y guardas anónimas](RELEASE.md) comprobadas y aceptadas por planificación, release final `dpl_2hvB1JjAvPbRzNp25vawRfLkeueA`. Google sin credenciales propias y E2E autenticado de producción pendiente; ningún dato de desarrollo se importó. No rollback real.

## Reto21 — Presentación y entrega del portfolio

Conciliar README y documentación vigente: propósito, arquitectura, uso, decisiones, evidencias por capa, capturas útiles, límites y pendientes reales. No imágenes con secretos ni promesas de pruebas no ejecutadas. Explicar al usuario cada reto al terminar.

Aceptación: documentación coherente con fuentes/evidencia finales, sin presentar estados históricos como actuales y entrega comprensible con pendientes concretos.

## Límites permanentes de esta continuación

- No nuevos chats, worktrees, demos ni copias aisladas de app. El arnés existente puede crear su SQLite sintético temporal para integración automatizada.
- No Vitest, convex-test, edge-runtime ni equivalentes; no repetir suites largas válidas sin cambios o hallazgos que lo justifiquen.
- Remitente y credencial propios de Slotly siguen pendientes por decisión humana: no usar usapeek, enviar correos reales, activar envíos ni crear dominios/credenciales/infraestructura.
- Conservar los servidores3000/3001, las pestañas/borradores humanos y los datos reales. Las nuevas pruebas reales con escrituras requieren primero una propuesta concreta; los permisos antiguos ya se cumplieron.
- Conservar los dos seguimientos del lunes26/10 y sus citas/evidencia. No alterar ni declarar validado Reto13 desde esta continuación. Su evolución autorizada el lunes es legítima.
- Guardar evidencia nueva por reto y separar cada diff del lote R13/R14/R15 heredado. Sin commit/push/PR/publicación automática por inferencia.
- En las etapas de implementación16–19, el único sync de código/esquema admisible es el desarrollo verificado daniel-caluff / slotly / dev / determined-poodle-377, aditivo, sin migraciones, backfill ni escrituras de prueba en datos reales. La publicación del Reto20 requiere verificar explícitamente su propio destino y configuración; nunca reutilizar los datos protegidos como datos públicos ni redirigir/reconfigurar el desarrollo.

## Estado histórico al iniciar, sustituido por las entregas anteriores

Reto16–21 pendientes de implementación/verificación. Reto15 implementado en desarrollo y comprobado con proveedor controlado; pendiente envío real. Reto13 conserva sus pruebas reales del lunes pendientes. Base actual protegida:18 citas,3 fichas,11 tablas previas y36 trabajos programados; evidencia de cierre Reto15 en C:/Users/dcalu/.codex/slotly-evidence/reto15-email-confirmations/20261025-main/.

## E2E real ejecutado por planificación —25/10/2026

**Verificación real posterior R16/R17 completada por planificación:** se ejecutaron únicamente las dos reservas autorizadas del27/10. A12:00–12:35 quedó Cancelada v1; B13:00–13:35 se movió al14:00–14:35 conservando su ID y quedó Cancelada v2. Comparten una sola ficha automática, incluso con el correo de la segunda en mayúsculas. Enlace/copia/recarga/replay original/reset, diálogos positivos/teclado/Escape/foco, tamaños1440/1280/390/320 y36px, historial privado y disponibilidad final de28huecos comprobados. No se repitieron suites de motor válidas. Nueva base protegida20citas/4fichas,48jobs,2accesos,1acuse de movimiento y2eventos correo desactivados con0intentos; documentos originales y4archivos R13 intactos por hash. Evidencia nueva `C:/Users/dcalu/.codex/slotly-evidence/reto17-public-rescheduling/real-e2e-20261025/verification-status.json`. El mensaje del intento recuperado y la distinción del acuse original se aclararon en19. Las entregas posteriores18–21 se resumen al comienzo; no se declara probado un fallo de red de navegador ni cerrado R13/correo real.

### Antecedente de la entrega y autorización, sustituido por la ejecución anterior

Reto16 implementado y sincronizado en desarrollo. Planificación revisó fuentes, diff,21 hashes finales y evidencia:45 carreras/90 solicitudes nuevas de gestión,28 grupos seriales y campaña con regresiones207/414; build/lint/tipos correctos. La UI real comprobó borradores y accesos inválidos, no el flujo positivo. Las12 tablas previas,18 citas/3 fichas,36 jobs y seguimientos R13 siguen intactos; accesos nuevos0 y eventos correo0. Evidencia: C:/Users/dcalu/.codex/slotly-evidence/reto16-public-cancellation/20261025-main/.

El humano ya respondió «Autorizar ambas pruebas y cancelaciones» al plan exacto coordinado R16/R17 del27/10, servicio2 de35min: ficha automática «Validación autogestión»/validacion-autogestion@example.test, A12:00–12:35 para gestión/cancelación y B13:00–13:35→14:00–14:35 para reprogramar/cancelar. **Este era el plan previo: planificación lo ejecutó después de revisar la versión17, con el resultado acreditado en el apartado anterior.** El ejecutor de implementación no crea datos ni pregunta otra vez. Ninguna prueba real pendiente se declara superada. La implementación17 ya está verificada por las capas indicadas en su sección;18–21 conservan su alcance para coordinación posterior. La primera lectura de Vercel y la elección humana permanecen en C:/Users/dcalu/.codex/slotly-evidence/reto20-deployment/20261025-main/hosting-preflight.json.
