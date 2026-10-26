# Confirmaciones de citas por correo — Reto 15

Fecha: **25/10/2026**, America/Montevideo. Alcance autorizado: una confirmación transaccional por cada reserva nueva efectiva pública o privada. **Implementado y sincronizado en desarrollo; motor, regresiones, tipos/build y UI de configuración bloqueada comprobados. Remitente, credencial propios de Slotly y envío real pendientes por decisión humana.** No se envía nada desde la configuración actual.

## Contrato

La activación es explícita por negocio y solo del propietario. Un campo ausente significa desactivado. El estado se lee del servidor de forma reactiva y se guarda con revisión para evitar que una pestaña sobrescriba un cambio posterior. Activar exige la configuración del servidor; su ausencia bloquea la activación, nunca las reservas. Desactivar detiene las confirmaciones que todavía no comenzaron a enviarse. Una llamada ya autorizada/en curso puede ser aceptada y no se puede retirar.

Cada nueva cita registra un único evento privado en `emailConfirmations` dentro de la misma transacción que crea la cita, vincula el cliente y escribe su recibo. Los replays vuelven antes de ese paso. No se crean eventos por consultar, recargar, crear fichas manuales, cambiar ajustes o recuperar recibos anteriores. No hay migración, backfill, cron ni recorrido de las citas existentes. Las reservas realizadas con el ajuste apagado quedan desactivadas definitivamente para este incremento; activarlo después no las incorpora.

El evento fija negocio, servicio, nombre introducido en la reserva, fecha, inicio/fin, zona horaria y versión original de la cita. Al estar habilitado/configurado y tener destinatario, también fija el JSON completo enviado al proveedor y su clave. El correo normalizado introducido se usa en las reservas por nombre/correo; la ficha reutilizada no aporta otro nombre o historial. Una selección explícita por ID usa los datos autorizados de esa ficha. La ficha legada sin correo conserva una reserva válida y un evento «Sin destinatario», sin escribirle correo ni inferirlo.

El HTML y el texto plano se generan una sola vez. El mensaje contiene Slotly, negocio, servicio, fecha, intervalo y zona horaria; sin publicidad, enlaces de gestión, imágenes remotas o tracking. Todos los textos dinámicos del HTML se escapan y los encabezados eliminan controles/saltos de línea. El HTML es de una columna, con idioma/dirección, título, encabezado semántico, tamaños legibles y contraste alto. No se han certificado Outlook/Gmail, modo oscuro o lector de pantalla mediante un envío real.

## Procesamiento durable e incertidumbre

La mutación programa otra mutación interna, de forma atómica. Esta obtiene el claim y programa una acción interna de envío y un watchdog durable. Se utiliza un lease de90 segundos y una generación creciente. Solo una autorización por generación puede iniciar una llamada externa. La finalización exige esa generación y el estado correspondiente; un trabajo viejo o una segunda finalización no renueva timestamps ni sobrescribe otro resultado.

Antes del claim y de autorizar la llamada se releen el ajuste, configuración y cita. Una cancelación, movimiento, cambio de versión (incluido mover y volver) o intervalo ya pasado evita enviar la confirmación original obsoleta. Esto no modifica las reglas ni jobs de cancelación, reprogramación o Reto13. Una incertidumbre previa se conserva como revisión, incluso si luego se desactiva el ajuste, falta configuración, cambia la cita o el proveedor devuelve un error permanente.

Hay **tres intentos totales como máximo**, incluido el inicial y los claims recuperados tras un crash. El timeout HTTP es15 segundos. Los reintentos transitorios esperan al menos30 y60 segundos y respetan un `Retry-After` superior. Son recuperables5xx,429 de frecuencia,409 concurrente de idempotencia y errores/timeouts de transporte;408 se trata como incierto. Rechazos permanentes, credenciales/permisos inválidos, supresiones y cuotas diarias/mensuales no generan bucles. No hay reenvío manual ni reinicio automático de eventos agotados.

La clave estable es `slotly/appointment-confirmation/<appointmentId>` y el cuerpo se reutiliza byte a byte. Resend conserva claves24 horas: Slotly termina su ventana un minuto antes, contada conservadoramente desde el primer claim. Nunca agenda un reintento que alcance o exceda esa ventana. Una respuesta perdida puede haber sido aceptada; dentro de la ventana se consulta implícitamente su mismo resultado mediante el mismo envío idempotente, sin inventar una intención nueva. Fuera de ventana o al agotar intentos inciertos queda revisión. **No se promete exactly-once absoluto ni llegada al buzón.**

## Estados privados

| Estado | Significado |
| --- | --- |
| No solicitada | Cita sin evento, incluida la historia anterior al incremento. |
| Desactivada | No se solicitó el envío o se detuvo antes de iniciarlo. |
| Sin destinatario | La reserva es válida; la ficha elegida no tiene correo válido. |
| Sin configurar | No puede enviarse con la configuración disponible; no se rescata mediante un backfill posterior. |
| Pendiente | En cola, esperando backoff o en proceso con lease. |
| Enviado | El proveedor devolvió su identificador de aceptación. No acredita entrega/inbox. |
| Fallido | Error permanente o agotamiento sin acuse; no hay más intentos automáticos. |
| Requiere revisión | Puede existir una aceptación previa o se agotó la ventana segura. No se reenvía automáticamente. |
| Omitida | Cita cancelada/modificada/pasada antes de comenzar, sin incertidumbre previa. |

Solo el propietario consulta ajustes y estado puntual por cita. No se lista una bandeja global. Las funciones públicas no aceptan remitente, propietario, payload o destinatario arbitrario para enviar; el worker y sus transiciones son internos y validados. Recibos/DTO públicos mantienen sus allowlists originales sin contactos, eventos, IDs de clientes o estados privados.

## Configuración pendiente

Las tres variables son **exclusivas del backend Convex**: `SLOTLY_EMAIL_FROM`, `SLOTLY_EMAIL_RESEND_API_KEY`, `SLOTLY_EMAIL_READY`. En `.env.example` están vacías y no son variables públicas. No se cambiaron `.env.local` ni secretos existentes. El remitente debe tener formato `Slotly <dirección del dominio propio verificado>`; placeholders y dominios reservados se rechazan. La puerta READY solo se establece tras verificar remitente/credencial y contar con la autorización específica de envío. Después sigue siendo necesaria la activación por negocio.

El destino HTTP del proveedor está fijado en el código de la acción; no hay URL configurable desde el navegador o el entorno. No se instala un SDK porque la API HTTP existente y `fetch` bastan para esta única operación. No se han creado dominios, DNS, credenciales, buzones, permisos o infraestructura. El correo continúa siendo contacto no verificado, nunca autenticación.

## Criterios de aceptación

| ID | Criterio | Resultado y evidencia ejecutada |
| --- | --- | --- |
| C01 | Defaultfalse, ajuste por owner, revisión entre pestañas y bloqueo sin configuración | Motor real y UI real de configuración ausente. |
| C02 | Nuevas reservas pública/privada generan un solo evento durable con snapshot correcto | HTTP y documentos completos en Convex/SQLite. |
| C03 | Replays, doble solicitud, recuperación y otro payload no duplican eventos/envíos lógicos | Carreras, recibos y proveedor controlado. |
| C04 | Rollback o rechazo de reserva no deja eventos/fichas huérfanos | Transacciones reales y snapshots antes/después. |
| C05 | Legado por ID sin correo conserva la reserva y estado honesto | Mutación privada real y documento de ficha intacto. |
| C06 | Payload usa el nombre de reserva, sin filtrar el perfil reutilizado | Reservas reales del arnés y capturas HTTP del proveedor. |
| C07 | Claim concurrente, acción duplicada, watchdog y fencing | HTTP independientes/barrera/skipQueue y leases sintéticos locales. |
| C08 | Finalización duplicada/vieja no modifica el resultado ni timestamps | Documentos completos y dos finalizaciones concurrentes. |
| C09 | Máximo3 intentos totales y backoff efectivo/429 | Contadores, plazos, solicitudes y una espera real del scheduler. |
| C10 | Error permanente/cuota/supresión no se reintenta | Respuestas HTTP controladas y estados terminales. |
| C11 | Timeout/respuesta perdida conserva clave/cuerpo y acuse original | Transporte HTTP real al stub; aceptación lógica única. |
| C12 | Incertidumbre seguida de rechazo/configuración ausente/desactivación sigue en revisión | Controles seriales, sin pérdida del estado anterior. |
| C13 | Fuera de24h no hay un reenvío ciego | Deadline y Retry-After excedido sin otra llamada. |
| C14 | Cancelar/mover/ABA antes de enviar evita confirmación obsoleta | Mutaciones originales y guardas en claim/autorización. |
| C15 | Desactivar antes de iniciar detiene pendientes | Estado persistido y cero llamadas posteriores. |
| C16 | Outbox y retry sobreviven al reinicio | Mismo SQLite, documentos iguales y retry programado real. |
| C17 | Propiedad, privacidad, acceso interno y lecturas acotadas | Denegaciones y allowlists originales. |
| C18 | HTML/texto, escape, zona horaria e intervalo histórico coherentes | Payload sintético30/46min; catálogo/históricos35/46 preservados por regresiones y lectura real. |
| C19 | Históricos, lectura/manual y18 citas reales no se incorporan | Fixtures legados y hashes reales antes/después. |
| C20 | Interfaz compacta, teclado/Escape y cuatro anchos, sin activar ni enviar | CUA principal1440/1280/390/320, capturas y límites declarados. |

## Evidencia y límites de la entrega

Evidencia nueva: `C:/Users/dcalu/.codex/slotly-evidence/reto15-email-confirmations/20261025-main/`. C01–C19 se verifican mediante las ejecuciones de motor/revisión descritas; C20 mediante CUA real de lectura y revisión visual. El envío real no forma parte de una prueba superada. Las cifras históricas R13/R14 no se presentan como nuevas.

- Campaña final: **386 solicitudes en193 carreras**. Reto15 aporta62 solicitudes/31 carreras (30 en3 rondas y una de acciones duplicadas); la regresión nueva de clientes108/54, servicios120/60 y Deshacer96/48 compone el resto. Los jobs del scheduler y llamadas al stub no se cuentan como participantes adicionales de esas carreras.
- Reto15: **42 grupos seriales principales +7 complementarios**, sin nuevas carreras en el suplemento. Incluyen reinicio de SQLite y espera efectiva de un retry programado, ventana agotada,3 claims de watchdog sin cuarta llamada, escape de HTML, perfil reutilizado, consulta/recibo legado, configuración retirada y acuse perdido. El suplemento fija ambos órdenes explícitos de payload/hueco y verifica un429 con JSON null sin perder Retry-After. Los cambios defensivos finales del parseo/ajuste de plantilla están cubiertos en ese suplemento; no se reejecuta toda la campaña por etiquetas del informe o un import sobrante.
- Proveedor controlado: **75 solicitudes/50 aceptaciones lógicas** en la campaña principal y **8/7** en el suplemento. Son conteos del stub, no correos reales ni entregas. La regresión de clientes reejecutada tiene25 grupos seriales; servicios20 y Deshacer16. Las suites generales R13 intactas se reutilizan como antecedentes.
- Lint pertinente y TypeScript completo correctos. Build completo de la fuente final con Next16.4.2/Turbopack, salida ownUUID y tsconfig propio del runner externo versionado, sin editar next.config/tsconfig ni construir sobre `.next`. El runner usa el transporte interno de configuración de esa versión, no una API pública estable. next-env se restaura exactamente; los PIDs3000/3001 siguen26640/49176.
- Sync explícito y codegen del CLI al dev verificado `daniel-caluff / slotly / determined-poodle-377`, con consulta nula de solo lectura. Solo se añadió el índice de la tabla nueva. Las18 citas,3 fichas y demás11 tablas anteriores conservan IDs/hashes completos; la tabla de correos queda vacía. Los36 registros programados y4 archivos protegidos R13 conservan sus hashes. No se activó la preferencia en negocios reales.
- UI:8 puntos (Ajustes/Detalle legado ×1440/1280/390/320), cero errores de consola, acciones bloqueadas36px, sin overflow; recarga/segunda pestaña, Tab y Escape/foco comprobados. Capturas JPEG naturales tras asentar viewport; escaladas/pintura previa excluidas. Un formulario vacío abierto durante una transición de viewport se cerró sin guardar. Pestañas propias cerradas y viewport restaurado. Impeccable encontró un divisor adicional: retirado, cuatro recapturas y verdict ship limitado a F1 resuelto; el detalle original permanece válido. Otros estados de envío no se fingen en la UI real.

Los informes principales son `engine-final.json`, `engine-orders.json`, `engine-summary.json`, `data-before/after.json`, `scheduled-before/after.json`, `ui-report.json`, `ui-finish-review.md`, `verification-status.json` y el manifiesto/diff de R15. El primer intento diagnóstico correcto conservó un listener del stub abierto tras terminar; se cerró solo ese runner ya finalizado y se corrigió finally. El segundo diagnóstico detectó que el adaptador histórico del arnés añadía correo a un replay legado; se pasó al cliente HTTP crudo. No fueron fallos de reservas ni se suman sus métricas a la campaña final.

El arnés existente ejecuta el backend Convex/SQLite real y clientes HTTP independientes, sin unitarios ni backend en memoria. Solo en su workspace temporal propio sustituye el literal HTTP del proveedor por un stub loopback, usa credenciales/identidades/datos sintéticos y fixtures internos para preparar fases, cancelar sus propios jobs iniciales o hacer vencer sus timestamps. No se instala ese control en la app principal ni se sincronizan fixtures. El stub registra cuerpos, claves, respuestas y aceptaciones lógicas; no acredita entrega real.

Los resultados por índice de `Promise.allSettled` no son una medición del orden temporal o de OCC. El informe final distingue efectos observados, participantes ganadores y controles seriales explícitos. El campo `observedOrder` del informe inicial conserva una etiqueta incorrecta histórica y no acredita serialización; el crudo no se reescribe. Los intentos diagnósticos no se suman como solicitudes nuevas de la campaña final.

Quedan fuera recordatorios, cancelación/reprogramación por correo, campañas, tracking, webhooks de entrega, verificación/OTP, CRM y gestión pública. No se certifican entrega, reputación de dominio, bounces completos de producción, carreras cloud ni permisos del SO. El siguiente envío real requiere primero remitente y credencial propios; después una propuesta con destinatario y cita concretos y autorización específica. No se propone enviar mientras esos datos estén pendientes. El veredicto R13 del lunes26/10 sigue independiente y pendiente.
