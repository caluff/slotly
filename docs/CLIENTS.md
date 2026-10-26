# Clientes — Reto 14, identidad de contacto por correo

Fecha: **24/10/2026**. Estado vigente: **alta/reutilización por correo comprobada con reservas reales. Aviso de recuperación corregido y verificado tras recarga real, antes y después de cancelar una cita adicional expresamente autorizada. Servicio y horario originales conservados, sin aviso falso ni duplicado.**

El cierre anterior con dos fichas por ID y tres citas canceladas sigue siendo una validación del incremento anterior. La primera prueba por correo añadió una ficha y dos citas, finalmente Canceladas. Una autorización posterior permitió una única cita pública adicional para verificar la corrección de recuperación, también Cancelada. El total actual es **18 citas y 3 fichas**; las 17 citas y tres fichas anteriores a esa corrección conservan sus documentos completos, al igual que los seguimientos de Reto13.

## Contrato aceptado vigente

- Una confirmación nueva pública o privada con **nombre y correo** valida y normaliza el correo: espacios externos retirados y minúsculas, máximo 254 caracteres normalizados, formato email y sin controles/formato. No elimina puntos ni etiquetas `+` de proveedores.
- La identidad de contacto es **negocio + correo normalizado**, resuelta por un índice dentro de la misma transacción que reserva el horario. Se crea una ficha solo cuando no existe y la reserva puede confirmarse. Una reserva rechazada o abortada no deja una ficha, una cita o un recibo de creación huérfanos.
- Compartir nombre con correos diferentes mantiene dos fichas; el mismo correo en negocios distintos también. Reutilizar una ficha conserva su ID, nombre, correo y alta. La cita conserva el nombre introducido en esa reserva como snapshot; seleccionar una ficha guardada obtiene su nombre del servidor. No renombra citas anteriores ni el perfil.
- El selector privado conserva la elección explícita por ID. Las fichas legadas sin correo siguen disponibles sin rellenarlas, fusionarlas o duplicarlas. No se introduce un correo oculto al elegirlas. Cambiar entre modos limpia la identidad incompatible.
- Crear una ficha manual requiere nombre y correo nuevos y usa la misma unicidad. Puede existir sin citas por decisión explícita del propietario. Si el correo ya está guardado, reutiliza esa ficha y confirma la intención mediante su recibo propio, sin sobrescribirla.
- El correo es un dato de contacto, **no** autenticación ni una dirección verificada. No hay envíos de emails, OTP, cuentas de cliente, teléfono, notas, edición, archivo, borrado, fusión, importación o infraestructura nueva.

## Comandos, recuperación y privacidad

Las nuevas creaciones privadas llevan UUID de operación y un recibo privado por negocio/operación. Su huella fija servicio/contexto, fecha/inicio, nombre y correo normalizados o ID elegido. La creación, enlace, reserva, atención y recibo se confirman en una transacción. Un replay devuelve el ID original; otro contenido con la misma operación conflictúa. La consulta autenticada `getMyAppointmentCreation` recupera el recibo exacto, aunque después se haya movido o cancelado la cita. No busca por nombre/correo, no infiere una intención de otro homónimo y no reabre documentos posteriores.

La UI guarda el comando privado antes del envío, restaura su contexto al recargar y bloquea cambios ante una respuesta incierta. Primero permite comprobar ese comando y, tras ausencia confirmada, reenviar el mismo. Consultas/replays/recuperaciones no repiten el toast de creación. La ficha manual tiene un recibo por comando tanto si se insertó como si se reutilizó; primer resultado creado/reutilizado informa una vez, replay y comprobación no repiten el aviso.

Los comandos manuales ya aceptados por el incremento anterior siguen recuperándose por su `creationKey` original sin correo. Los recibos públicos legados sin huella/correo conservan su replay original sin crear ficha. Las nuevas confirmaciones públicas incluyen el correo y contexto en la huella privada del intento: cambiarlo conflictúa. El recibo público visible mantiene solo servicio, fecha, inicio, fin y zona horaria; no expone nombre, correo, ID de ficha, propietario o historial de un registro existente. No existe búsqueda pública ni comprobación de existencia por email.

Las antiguas creaciones privadas no tenían UUID ni recibo de creación: no se inventa una recuperación exacta retrospectiva. Un borrador incierto de ese formato falla cerrado y pide revisar Agenda; las citas históricas siguen utilizables por su ID con los flujos originales.

## Esquema y conservación

Esquema aditivo: `clients.email` opcional para el legado e índice negocio/email; `creationKey` permanece opcional como compatibilidad. Nuevas tablas `clientCreationReceipts` y `privateBookingReceipts`, con lecturas puntuales por negocio/operación. Huella opcional en los recibos públicos para distinguir nuevas confirmaciones de las legadas. `appointments.clientId` sigue siendo opcional para documentos anteriores.

No hay migraciones, backfill, asociación por nombre/correo de citas ya existentes o jobs nuevos para el legado. Resolver completo, ocupación, semana, excepciones, bloqueos, cuota pública, resultados, llegada, ausencia y Deshacer mantienen sus reglas. Catálogo e historial siguen paginados y acotados a 20 registros por página; el correo solo se presenta al propietario en sus fichas/listas/selector.

## Criterios de aceptación de la ampliación

| ID | Comprobación | Evidencia/estado |
| --- | --- | --- |
| E01 | Trim/case de correo; puntos y etiquetas no se equiparan; datos inválidos rechazados | Motor real y validación UI de lectura. |
| E02 | Dos reservas con el mismo correo en un negocio usan una ficha, pública y privada | Motor local y E2E real con sesión Clerk existente: ambas rutas comparten un único clientId. |
| E03 | Manual/manual y manual/reserva reutilizan sin cambiar nombre/alta; comando reutilizado recuperable exactamente | Motor real, recibos y snapshots completos. |
| E04 | Homónimos con distinto correo y mismo correo en distintos negocios permanecen separados | Motor real, lecturas de propiedad y carreras. |
| E05 | Elección de ficha legada por ID sin correo ni actualización implícita | Motor real y CUA sobre las dos fichas actuales, solo borrador. |
| E06 | Error de validación, disponibilidad, servicio, capacidad o cuota no deja ficha de una reserva fallida | Motor real y comparación completa de documentos. |
| E07 | Carrera de un hueco permite un ganador; crear/reutilizar y reserva son atómicos | HTTP independientes, barrera, skipQueue y controles seriales. |
| E08 | Replays y payload distinto con igual operación, incluidos correo/contexto | Motor real; conflicto o acuse original sin timestamps renovados. |
| E09 | Recuperación privada tras movimiento/cancelación/ABA y reinicio | Recibo exacto e inmutable, sin reapertura o falso positivo por homónimo. |
| E10 | Recibos públicos y comandos manuales legados siguen funcionando | Fixtures de documentos legados solo en SQLite temporal, sin migrar datos reales. |
| E11 | Ningún contacto/perfil privado se enumera o expone al público | Allowlist, digest independiente del catálogo de clientes y pruebas de auth/propiedad. |
| E12 | Paginación estable, límite 20 y rangos reactivos expandidos | 206 fichas sintéticas, 145 coincidencias de prefijo y división sin omisiones. |
| E13 | UI correo, foco/error, teclado, Escape, borradores, lupa y 36px | CUA real de lectura a 1440/1280/390/320; 12 puntos de matriz y elección legada. |
| E14 | 15 citas, 2 fichas y datos/seguimientos reales protegidos iguales | Comparaciones antes/después por ID/hash; nuevas tablas de recibos vacías. |
| E15 | Dos nuevas reservas reales por el mismo correo, recarga e historial | **Ejecutado por planificación con autorización: una ficha, dos citas y ambas Canceladas al terminar, sin duplicado tras recarga.** |

## Verificación nueva y límites

Evidencia: `C:/Users/dcalu/.codex/slotly-evidence/reto14-clients/auto-email-main-20261024/`.

- Motor nuevo: **108 solicitudes concurrentes, 54 carreras, 3 rondas**, más **16 grupos seriales principales y 9 complementarios**. Alta/reutilización públicas/privadas/manuales, unicidad por negocio, hueco único, rechazo sin huérfanos, incertidumbre/recuperación, recibos legados, cancelación/movimiento/ABA, privacidad, 46 minutos históricos, paginación y reinicio real de SQLite. Se registran los órdenes observados; los controles seriales complementan ambos órdenes sin atribuirlos a las carreras.
- Regresiones ejecutadas por el cambio de creación: Servicios **120 solicitudes/60 carreras +20 controles seriales** y Deshacer **96/48 +16**. Total de esa campaña: 324 solicitudes/162 carreras. Los 9 controles complementarios son otra ejecución sin carreras y no se suman como nuevas solicitudes concurrentes. Informes crudos y resumen con atribuciones en la carpeta de evidencia.
- Lint pertinente, tipos completos sin emitir y build completo Turbopack 16.4.2 correctos. Build de las fuentes nuevas en salida temporal propia con `distDir`/`tsconfigPath`, sin editar la configuración principal, construir sobre `.next` o reiniciar servidores; procedimiento/versionado y restauración por hashes en evidencia. No es un build reutilizado del alcance anterior.
- CUA con sesión Clerk existente, solo lecturas/borradores y rechazos de validación locales: 13 capturas finales naturales, sin reescalado. El viewport público tiene barra de desplazamiento y sus imágenes de contenido omiten ese margen; tamaños reales declarados en `capture-metadata.json`. Sondeos preliminares desfasados excluidos. Sin errores de consola observados. Viewport restaurado y pestañas propias cerradas.
- Fuentes/datos/configuración/automatizaciones preservados por hashes. Código/esquema/tipos sincronizados solo con `daniel-caluff / slotly / dev / determined-poodle-377`. Sin producción, commit/push/PR, otras funcionalidades o nuevas escrituras reales.

Las suites generales extensas de Reto 13 y su evidencia anterior no se atribuyen a esta ejecución. Tampoco se acredita UI real de creación por correo, pérdida real de red durante un commit, toast de éxito/replay cloud, toque nativo, lector de pantalla o carga/abuso de producción. La verificación nueva del motor usa HTTP y Convex/SQLite reales con datos/identidades sintéticas, no Clerk ni carreras cloud. No se añadieron unitarios ni otra app/demo/worktree.

## Prueba real autorizada y ejecutada — 24/10/2026

Nombre: **Validación correo R14**. Correo normalizado: **validacion-r14-correo@example.test**; dominio reservado de prueba, sin envío de mensajes. Servicio **servicio 2, 35 minutos**. Martes **27/10/2026**, **America/Montevideo**.

| Ruta | Nueva cita solicitada |
| --- | --- |
| Reserva pública | 08:30–09:05 |
| Nueva cita privada, introduciendo nombre/correo otra vez (sin selector guardado) | 09:30–10:05 |

El humano autorizó expresamente estas dos reservas y su cancelación. Planificación volvió a comprobar las franjas y que el correo no existía. La reserva pública creó la ficha; la privada introdujo otra vez nombre/correo en modo «Nombre y correo», con mayúsculas y espacios externos, sin seleccionar la ficha guardada. Ambas apuntan a `k57ffsd8gr1vfnkx0yp9q49yvx8gyphm`, cuyo documento completo y alta `1792895345031` permanecen idénticos entre fases. La entrada de tipo email puede retirar por sí misma espacios externos; la normalización de servidor conserva su evidencia de motor local anterior.

- Pública: `jh7df76pd64xmffc9bsg79j7358gzhg8`, 08:30–09:05. Privada: `jh751j2yveveehh7xv4y185jgn8gy2vr`, 09:30–10:05. Ambas confirmadas una vez, visibles en un solo historial tras recarga y finalmente **Canceladas, versión 1**, conservando IDs, vínculos, snapshots y horarios.
- La capacidad vuelve a 28 opciones iguales en público y privado. El mismo intento público tras recarga/cancelación recuperó su recibo original sin crear otra ficha/cita ni reabrir la cancelada; los recibos público y privado completos permanecen inmutables.
- Los documentos anteriores de las once tablas observadas y los cuatro archivos protegidos de Reto13 se cotejaron por ID/hash completo antes/después: las 15 citas, dos fichas y demás filas previas permanecen intactas. No se modificaron las pruebas/automatizaciones del lunes, configuración, autenticación, servidores o pestaña humana. Las pestañas propias se cerraron.
- Estado final: **3 fichas y 17 citas**, incluidas las dos nuevas Canceladas. Una ficha de prueba permanece deliberadamente; no se ejecutó borrado. Cero errores de consola observados. Sin correos enviados ni nuevas pruebas de concurrencia, OS o resultados del lunes atribuidas a esta ejecución.

**Incidencia menor observada en el ensayo inicial, resuelta posteriormente:** al recargar el formulario público con su intento aceptado guardado aparecía «El servicio cambió» aunque el catálogo/contexto no cambiaban. El replay ya funcionaba sin alterar los datos. La corrección y su prueba real posterior se registran a continuación; la evidencia del fallo original se conserva.

**Corrección posterior autorizada — 24/10/2026:** el formulario restaura también `expectedService` y representa servicio/horario desde el comando pendiente. Recuperar un comando inmutable no consulta disponibilidad actual ni lo compara con el catálogo de una reserva nueva. El legado sin contexto muestra el inicio guardado, sin inventar duración ni afirmar cambios. Para una confirmación nueva se conserva la comparación del contexto observado (nombre/duración/versión) y el rechazo/aviso del servidor; no se suprimen los cambios reales de servicio.

Verificación inicial de implementación: lint acotado y TypeScript completo correctos; revisión estática de restauración, legado y guardas. CUA del formulario nuevo en principal a1280×720, controles36px y cero errores de consola, sin confirmar. Esa primera observación no acreditaba recuperación: las pestañas del ensayo original estaban cerradas. Los intentos acotados de restaurar el almacenamiento mediante herramientas disponibles no fueron admitidos; no se atribuye una inyección ni un replay a esos intentos. Los17 turnos/3 fichas, recibos y cuatro archivos de seguimiento R13 conservaron sus hashes. Evidencia inicial: `C:/Users/dcalu/.codex/slotly-evidence/reto14-clients/public-recovery-message-20261024/`.

**Cierre real posterior por planificación, autorizado expresamente:** el humano aprobó una única reserva pública adicional del27/10 **10:30–11:05**, servicio2, con el mismo nombre/correo ficticios y cancelación al terminar. Se creó `jh78j1fgr4ghf7gfcs8ke6d3v58gztcg`, vinculada a la ficha existente `k57ffsd8gr1vfnkx0yp9q49yvx8gyphm`; cero perfiles nuevos. La recarga natural conservó servicio2/35min e intervalo10:30–11:05 sin el aviso falso. Reintentar el mismo comando devolvió su recibo original con documentos idénticos. Se canceló solo esta nueva cita, versión1, y se repitió la recuperación tras cancelación: sin aviso falso, duplicados, nuevas altas o reapertura. La captura final es una captura natural de página completa, sin reescalado.

Los snapshots completos de la nueva cita/recibo y los hashes por ID de las17 citas/3 clientes y demás filas anteriores, más los cuatro archivos R13, verifican conservación. Quedan18 citas/3 fichas, incluida la nueva Cancelada. Cero errores de consola, pestañas propias cerradas, pestaña humana intacta y servidores originales conservados. No backend/sync, cambios de catálogo, configuración, permisos, unitarios, suites de motor o build sobre `.next` activo. La guarda de cambios reales para una reserva nueva y el legado sin contexto se revisan estáticamente, sin fingir cambios de catálogo reales.

Evidencia nueva del cierre real: `C:/Users/dcalu/.codex/slotly-evidence/reto14-clients/public-recovery-message-20261024/real-reload-verified/verification-status.json`. El pendiente visual anterior queda cerrado; el veredicto de Reto13 del lunes sigue independiente y pendiente.

Evidencia nueva de planificación: `C:/Users/dcalu/.codex/slotly-evidence/reto14-clients/real-email-e2e-20261024/verification-status.json`, con observaciones CUA, cinco capturas nativas, snapshots de datos protegidos y verificación de documentos completos. Las suites de motor/build anteriores no se repitieron ni se atribuyen a esta prueba real.

---

# Antecedentes del incremento por ID — históricos

Lo siguiente conserva el contrato inicial, las restricciones de aislamiento ya revocadas, su implementación y el cierre real anterior por ID. **No redefine el alcance vigente por correo ni convierte su E2E pendiente en una prueba superada.**

## Contrato inicial por ID

Fecha: **24/10/2026**. Estado: **validado en el alcance acordado; integrado en principal y E2E real de escritura autorizado superado**.

El usuario autorizó inicialmente una implementación aislada, después su integración en principal y finalmente el plan concreto de escrituras reales descrito al final. Clientes está disponible en localhost:3001 y determined-poodle-377, solo desarrollo. Los criterios siguientes son el contrato aceptado; las fases anteriores se conservan como históricas y el cierre vigente es el E2E real autorizado. Las12 citas preexistentes y los seguimientos de Reto13 del lunes26/10 permanecen intactos. Los únicos registros nuevos son dos fichas ficticias autorizadas y tres citas del27/10 que finalizaron Canceladas.

## Objetivo

Permitir al propietario reutilizar un cliente al crear citas privadas y consultar sus citas vinculadas. Actualmente una cita solo guarda `clientName`; no existe una ficha reutilizable ni una relación con un cliente.

La identidad será el ID del registro de cliente. El nombre se usa para presentar y buscar; compartir nombre no implica ser la misma persona. Cada cita conserva además el nombre guardado al confirmarse, como ya conserva el servicio y su intervalo históricos.

## Alcance del primer incremento

1. **Sección Clientes en el espacio privado.** Acceso desde el rail y el panel existente, conservando Agenda, fecha, escala, filtros, historial de navegación y borradores. La apertura/cierre seguirá los patrones de panel y diálogo actuales.
2. **Crear un cliente.** Nombre obligatorio de 1–100 caracteres, normalización NFC, espacios externos retirados e internos consecutivos reducidos, sin caracteres de control/formato. Es la misma regla básica vigente para nombres de citas. El servidor valida y asigna negocio, ID y fecha de alta; el navegador no decide el propietario.
3. **Listar y buscar clientes propios.** Orden estable por nombre normalizado y un desempate estable; 20 registros por página y carga adicional explícita. La búsqueda de este incremento es por inicio del nombre, sin distinguir mayúsculas, tildes o espacios sobrantes. Consultas acotadas y paginadas; no descargar el catálogo completo para buscarlo en el navegador.
4. **Detalle de cliente.** Nombre, alta e historial paginado de citas vinculadas, con fecha/hora, servicio histórico y los cuatro estados existentes. Orden por inicio de cita descendente, con desempate estable. La presentación aporta contexto de alta e historial para distinguir homónimos; no los fusiona ni elige uno automáticamente.
5. **Elegir un cliente guardado en Nueva cita privada.** Buscar/seleccionar una ficha y confirmar el cliente elegido. El nombre libre actual permanece disponible para una cita sin ficha. Cambiar entre ambos modos requiere una acción explícita y no conserva una selección oculta contradictoria. La creación de fichas se hace desde Clientes en este incremento; guardar una cita de nombre libre no crea una ficha automáticamente.

Una ficha es independiente de una reserva: crearla no ocupa un horario y cancelar el borrador de una cita no elimina al cliente elegido. Clientes nuevos todavía sin citas muestran un estado vacío honesto.

## Relación, historial y compatibilidad

- Se prevé una colección privada de clientes pertenecientes a un negocio y una referencia **opcional** `clientId` en las citas nuevas vinculadas. El esquema exacto y los índices se resolverán al implementar con los patrones del repositorio; no se provisiona otra base o infraestructura.
- Al confirmar con un cliente guardado, el servidor verifica su pertenencia al mismo negocio y obtiene su nombre desde la ficha en la misma operación que valida y reserva el horario. No confía en una pareja arbitraria ID/nombre recibida del navegador.
- La cita mantiene su `clientName` histórico. Consultar una ficha no modifica nombres, estados, versiones, intervalos, servicio histórico, recibos o metadatos de sus citas.
- Las citas anteriores, privadas de nombre libre y públicas continúan funcionando sin `clientId`. No se hace backfill, barrido, conversión o asociación por coincidencia de nombre. Esas citas siguen disponibles en Agenda y su buscador actual; no se presentan como historial vinculado de una ficha.
- La reserva pública sigue solicitando el nombre y no crea fichas ni consulta el catálogo privado. Los recibos públicos originales, DTO y digest mantienen su contrato y no incorporan identificadores o datos de Clientes.
- Reprogramar, cancelar, registrar llegada/resultados y Deshacer conservan la relación si existe y todas sus garantías actuales. El nuevo módulo no cambia las reglas de ocupación, reloj de servidor, scheduler, fases de avisos o ausencia automática.

## Escrituras y recuperación

- Cada intención de crear un cliente tiene un identificador de operación estable y autenticado. Doble clic, Enter repetido o replay del mismo comando producen un único cliente y no renuevan la fecha de alta.
- Reutilizar un comando con otro contenido se rechaza. Dos intenciones independientes pueden crear dos clientes homónimos con IDs e historiales diferentes; el nombre normalizado no es una clave única de identidad.
- Ante una respuesta incierta se conserva el intento y se comprueba el comando exacto, también tras recargar. No se recupera una creación buscando solo el nombre ni se emite otra creación a ciegas.
- La recuperación existente de creación de citas deberá distinguir el cliente elegido y el modo nombre libre: dos fichas con el mismo nombre no pueden dar por confirmado el intento de la otra. Se preserva el flujo anterior para citas sin ficha.
- Una confirmación efectiva genera el único toast de éxito correspondiente. Consultas, replays y operaciones sin cambio no duplican avisos ni efectos.

## Criterios de aceptación

| ID | Comprobación | Resultado exigido |
| --- | --- | --- |
| C01 | Crear un cliente válido y recargar | Una sola ficha propia, mismo ID/nombre/alta; disponible en listado y selector. |
| C02 | Enviar nombre vacío, de más de 100 caracteres o con controles | Rechazo en servidor y error accesible en UI, sin crear una ficha. Espacios y Unicode válidos se normalizan con la regla acordada. |
| C03 | Buscar un prefijo con otra capitalización o tildes y recorrer más de una página | Coincidencias propias y orden estable; sin duplicados, descarga global ni falso final si quedan páginas. Cambiar búsqueda reinicia su cursor. |
| C04 | Crear dos homónimos mediante intenciones diferentes | Dos IDs y perfiles distinguibles; seleccionar uno no asocia ni muestra las citas del otro. |
| C05 | Consultar o usar un ID de otro negocio, o actuar sin sesión | Rechazo en servidor y ausencia de datos ajenos, tanto en listado/detalle/historial como al confirmar citas. |
| C06 | Elegir una ficha y confirmar una cita privada | Cita vinculada al ID correcto y con nombre obtenido por el servidor; horario, servicio y ocupación validados por el resolver transaccional existente. Persistencia tras recargar. |
| C07 | Crear una cita de nombre libre y consultar citas antiguas/públicas | Flujo anterior conservado, sin crear o asociar fichas automáticamente ni modificar documentos existentes. |
| C08 | Abrir el historial de dos clientes y recorrer más de 20 citas vinculadas | Cada historial contiene solo sus citas, una vez cada una, con los cuatro estados y snapshots correctos. No se confunde con la búsqueda global por nombre. |
| C09 | Doble envío, replay, contenido distinto con la misma operación y respuesta incierta | Un efecto por intención; conflicto cuando corresponde, fecha de alta estable y recuperación por comando exacto. No confundir intenciones de clientes homónimos. |
| C10 | Crear simultáneamente dos citas para el mismo hueco, seleccionando clientes distintos | Se conservan la exclusión transaccional y el único ganador permitido; la incorporación de Clientes no abre capacidad ni duplica reservas. |
| C11 | Reprogramar, cancelar, llegar, marcar resultado o Deshacer una cita vinculada en datos aislados | Misma identidad/referencia/nombre histórico, versiones y guardas de Reto 13; sin alterar disponibilidad o jobs por leer el historial. |
| C12 | Teclado, Escape, cierre/reapertura, errores y pantallas de 1440/1280/390/320 px | Controles propios de 36 px y botones de icono de 36×36 px, foco útil, borradores conservados, un toast y scroll interno; Agenda y paneles existentes permanecen utilizables. |
| C13 | Comparar reserva pública y recibos antes/después | Sin exposición de catálogo/ID del cliente, propietario o historial privado; recibos originales inmutables y reserva pública de nombre libre conservada. |
| C14 | Revisar el entorno y los seguimientos de Reto 13 | Pruebas del 26/10 sin cambios de IDs, horarios, datos, comandos, automatizaciones o entorno de ejecución. No declarar Reto 13 cerrado antes de su veredicto real. |

## Límites de este incremento

No incluye teléfono, correo, notas privadas, edición/archivo/eliminación o fusión de fichas, importación/exportación, vincular o cambiar el cliente de citas ya guardadas, cuentas de clientes, contactos externos ni comunicaciones. Estos límites evitan convertir la primera ficha reutilizable en un CRM completo y reducen datos personales que todavía no necesita el flujo.

## Protección de las pruebas del lunes 26/10

- La definición inicial solo añadió documentación. La implementación posterior autorizada se realizó exclusivamente en el worktree de Reto14, sin operar la app o el backend compartidos.
- Mientras Reto13 espera sus pruebas reales, cualquier desarrollo/verificación de Reto14 se mantiene **aislado de la copia, servidores y backend que ejecutan esas pruebas**. No modificar por HMR la app usada por esos seguimientos, sincronizar código/esquema de Reto14 al dev compartido ni migrar/escribir registros reales. La integración en ese entorno se pospone hasta concluir las pruebas y revisar su resultado.
- Permanecen intactos `Validación Reto13`,26/10 12:00–12:35, y su seguimiento12:36; `Validación R13 Llegada`,15:30–16:05; `Validación R13 Ausencia`,16:15–16:50; preparación15:10, llegada prevista15:26, cierre temporal16:21–16:51 y veredicto conjunto posterior.
- Se preservan ambas automatizaciones, sus autorizaciones y los archivos de evidencia/progreso. Tampoco se cambia catálogo, horarios, excepciones, bloqueos, enlace público, Clerk, sesiones, variables, destino, infraestructura, bases locales o respaldos.
- Los contratos de Reto13 y el lote local existente se conservan; no hay reset, reversiones, publicación o commit/push/PR autorizados por esta definición.

## Verificación y cierre previstos

No se reintroducen unitarios ni Vitest/convex-test/equivalentes. La verificación futura incluye integración con Convex/SQLite real aislado y datos sintéticos, clientes HTTP independientes y barrera para las carreras relevantes; autorización A/B/sin sesión, documentos completos, recuperación, paginación/homónimos y privacidad. El arnés no lee `.env.local`/`.convex` ni cambia el destino de la app y limpia únicamente recursos propios con ruta/marcador comprobados.

UI mediante CUA con transporte aislado para flujo, accesibilidad y responsive; lint/tipos/build/diff pertinentes al cambio final. No se repiten suites correctas ajenas al impacto sin un motivo concreto. Se distinguen siempre fuente revisada, prueba aislada, prueba con Clerk real y evidencia previa.

Antes del E2E real de Reto14 se propondrán las fichas y las citas concretas necesarias, con sus fechas/horarios, para autorización de esas escrituras. Las autorizaciones ya cumplidas y las pruebas protegidas de Reto13 no se reutilizan para ese fin. El reto no se cierra solo por compilar: requiere evidencia de los criterios anteriores y registrar pendientes de forma explícita.

## Implementación aislada — 24/10/2026

Raíz: `C:/Users/dcalu/.codex/worktrees/a694/slotly`. Base Git `d46d58d373b1dc3e2ef7168427f903cdc8e5e898` más la instantánea de fuentes vigente de Reto13. Se verificaron **204 SHA256 exactos** desde la copia congelada `source-snapshot-20261024/files/` antes de implementar. El diagnóstico inicial de finales de línea/12 discrepancias quedó reconciliado mediante esas copias crudas; no se fabricó una base ni se consultaron credenciales de la copia principal.

### Contrato implementado

- `clients.createMyClient({name,operationId})` autentica, resuelve el negocio y normaliza/valida el nombre. La fila conserva `name`, `normalizedName`, `businessId`, `createdAt` servidor y `creationKey`; la identidad es `_id`. Índices por negocio/nombre normalizado y negocio/operación. La lectura del comando y la inserción son una transacción: replay devuelve la ficha original sin renovar el alta; otro nombre normalizado con la misma operación rechaza. Homónimos con operaciones independientes son válidos.
- `getMyClientCreation` recupera **el comando exacto** y verifica también su contenido. El formulario guarda ese comando en `sessionStorage` de la pestaña, por ID de negocio, **antes** de enviarlo. Si no puede persistirlo no envía la creación. Una respuesta incierta conserva nombre bloqueado y operación; tras comprobar ausencia se puede reenviar ese mismo comando. No se recupera por nombre. Solo `outcome=created` emite toast; replay/consulta no lo duplican.
- `listMyClients` aplica prefijo normalizado mediante rango del índice, sin `collect`, filtro global o descarga previa. Orden ascendente por nombre y desempate implícito estable del índice de Convex. Página inicial/máxima entregada de20. El límite de lectura del motor es por lotes: **`numItems` y `maximumRowsRead` por sí solos no son un tope de filas devueltas para un `endCursor` reactivo**. Si ese rango crece a más de20 filas, se retienen sus filas y se devuelve `SplitRequired` con el `splitCursor` exacto del motor; el SDK divide el rango antes de mostrarlo. No se recorta una página perdiendo su cola. Se verificó reconstrucción exacta de ventanas expandidas, tanto del catálogo como del historial.
- `getMyClient` y `listMyClientAppointments` comprueban pertenencia antes de devolver datos. Historial por índice negocio/`clientId`/inicio, descendente, paginado20, snapshots de nombre/servicio/intervalo y cuatro estados. No consulta por coincidencia de nombre ni modifica citas al leer.
- `appointments.clientId` es opcional. Al confirmar una cita vinculada, `createMyAppointment` lee la ficha propia y toma su nombre **dentro de la misma transacción** que ejecuta `bookableSlot`; ignora el nombre arbitrario recibido junto al ID. Se conserva `clientName` como snapshot. `clientId` solo se incorpora a DTO privados pertinentes. Reserva pública, DTO/digest/recibos originales y citas previas/libres continúan sin asociación automática.
- Nueva cita permite Nombre libre/Cliente guardado mediante acción explícita; cambiar de modo limpia selección y nombre incompatibles. Elegir ficha enfoca Cambiar cliente; Tab continúa a Servicio. El borrador conserva modo/ficha y contexto visto de servicio al cerrar/cambiar entre editor y diálogo. La recuperación existente de una cita exige igualdad de `clientId` además del horario/nombre, incluida la ausencia del ID para nombre libre.
- No se modificaron resolver, reglas de ocupación, funciones de resultado/atención, snapshots de avisos o programación de jobs. Movimiento/cancelación/resultados/llegada/Deshacer conservan la referencia. Una corrección acotada en `BusinessServices` evita publicar de nuevo la misma página del SDK en cada render: se reprodujo un bucle heredado al montar todas las secciones y se verificó su corrección con componentes reales. No cambia servicios, comandos o reglas de negocio.

### Evidencia ejecutada por capa

Carpeta: `C:/Users/dcalu/.codex/slotly-evidence/reto14-clients/implementation-a694-20261024/`. `README.md`, manifiestos y `reto14-only.patch` separan esta entrega de las fuentes heredadas.

| Capa | Ejecución y alcance |
| --- | --- |
| Clientes, motor final | `pnpm run --config.verifyDepsBeforeRun=false test:appointments:engine --clients-only --report <engine-clients-final.json>`: **36 solicitudes participantes /18 carreras /3 rondas y13 grupos seriales**. Convex/SQLite real temporal, HTTP independientes, barrera y `skipQueue`; consultas de recuperación concurrentes sin cola de mutación. Incluye validación, replay/conflicto, recuperación exacta, A/B/sin sesión, homónimos, capacidad única,205 fichas/145 coincidencias densas, rangos reactivos expandidos, historiales47/23, privacidad y reinicio real. Documentos completos/IDs/fechas/snapshots/revisiones/perdedores inmutables comparados; trazas completas de llegada/ausencia/Deshacer vinculados. Los bordes temporales se preparan **dentro de una mutación real de fixture**, no se atribuyen a solicitudes HTTP al milisegundo ni a un reloj público manipulable. |
| Regresiones de esta sesión | Ejecución ampliada `--clients-only --with-service-regressions`, `engine-final.json`: se reutilizan sus **120 solicitudes/60 carreras y20 grupos seriales de servicios**, y **96/48 y16 grupos de Deshacer**. Verifica creación privada/pública, catálogo/revisiones, ocupación, duración histórica46 y snapshots/recibos. Sus36 solicitudes iniciales de Clientes quedan sustituidas por la ejecución final anterior: **no se suman de nuevo**, ni se incorporan intentos fallidos/preliminares. |
| UI | **57 comprobaciones CUA aprobadas y18 JPG nativos** en1440/1280/390/320×720. Componentes reales y motor local propio con identidad administrativa sintética explícita; sin Clerk. Creación/doble envío/toast, búsqueda/páginas/vacíos/errores, dos historiales, selección/modos/borradores, recuperación tras recarga y frente a un homónimo competidor, foco/Enter/Espacio/Tab/Escape, URL/atrás,36px, scroll y movimiento reducido. Fallos de respuesta se inyectan únicamente en el wrapper de preview, sobre escrituras locales reales; no son una pérdida real de red. La recarga pendiente usó el helper de navegación de la preview para superar la cancelación de `beforeunload` del navegador automatizado; se comprobó el mensaje de restauración del componente nuevo. Dos sondeos de tiempo inconclusos y cuatro capturas inválidas se conservan separados y **no cuentan** como aprobación. |
| Revisión de UI | Revisión independiente completa con un hallazgo de foco; arreglo y Verdict Pass **resolved/ship exclusivamente para ese hallazgo**, no aprobación global. Documenter independiente confirma extensión del sistema existente. Detector ejecutado una sola vez sobre los TSX afectados: `[]`; no se atribuye una auditoría de CSS global. |
| Herramientas | `pnpm lint`, `pnpm typecheck`, build predeterminado Turbopack y comprobación del diff de Reto14. Build sin `.env.local`, sin secret key y con clave pública **sintética** de dominio `.invalid`/URL Convex loopback no operativa, solo para compilar. No acredita autenticación desplegada. Versiones/lockfile originales conservados; sin nuevas dependencias o unitarios. |

Órdenes **observados en la ejecución final**: mismo comando creó operación1en1/3 y operación2en2/3; mismo comando/contenido distinto ganó operación1en2/3 y operación2en1/3; capacidad compartida entre clientes distintos ganó operación1en2/3 y operación2en1/3. La consulta concurrente de recuperación precedió a la creación en3/3; los controles seriales cubren consulta→creación y creación→consulta. Operaciones independientes/homónimos/negocios son compatibles. No se inventan órdenes internos de commit o reintentos OCC a partir del transporte. Los resultados completos y el resumen de esa ejecución final están en `engine-clients-final.json` y `engine-summary.json`.

### Aislamiento y cierre pendiente

Dependencias propias: **1947 enlaces comprobados, cero destinos fuera del worktree**. Instalación con lockfile congelado y scripts omitidos; store/cache/state propios, después archivados bajo `node_modules/.slotly-install-state`. No se enlaza `node_modules` de la copia principal. La preview usó exclusivamente **3114**; los motores usaron puertos efímeros loopback y SQLite/configuración/claves sintéticas propios. El informe del motor de pruebas identifica versión y limpieza, pero no registró el número efímero concreto de cada ejecución: no se reconstruye ni inventa ese dato. Los procesos propios se detuvieron, sus SQLite temporales se eliminaron tras validar raíz/marcador y la preview se archivó fuera del producto. No quedan rutas de fixture en `app/` ni fixtures en `convex/` de la app; los módulos del arnés permanecen en `scripts/`.

El worktree administrado comparte metadatos Git con el repositorio de origen; no se ejecutaron stage/commit/push/PR ni se modificó su rama. Las verificaciones finales de Git se ejecutan con `GIT_OPTIONAL_LOCKS=0`. Las operaciones de aplicación y datos se limitaron a las raíces propias: no se leyó/copió `.env.local`, `.convex`, sesiones o datos reales, ni se operaron3000/3001/3103, Clerk real, backend remoto o automatizaciones/seguimientos de Reto13. No se atribuye un cotejo de hashes de datos reales, porque no se accedió a ellos.

**Pendiente real:** integrar estas fuentes y esquema en el entorno autorizado solo después del veredicto protegido de Reto13 y autorización correspondiente; después proponer fichas/citas/horarios concretos para aprobar y ejecutar el E2E real de Reto14 con Clerk. No se acredita cloud, producción, carreras remotas, lector de pantalla, hardware táctil o entrega nativa de avisos del sistema. Ninguna autorización de Reto13 se reutilizó para esas escrituras.


## Integración posterior autorizada, 24/10/2026

Se verificaron 204 fuentes de base y se copiaron exactamente los 22 archivos finales a principal. Sincronización aditiva a daniel-caluff:slotly:dev / determined-poodle-377: clients, dos índices propios e índice de historial; clientId opcional, sin asociación retroactiva, migraciones o jobs nuevos. Cinco funciones de Clientes verificadas en metadatos remotos. Después de la copia solo cambian estos dos documentos para registrar la integración.

Lecturas antes/después: las 12 citas y catálogo, semana, excepciones, bloqueos, negocios, recibos y avisos conservan IDs/hashes completos. Dos automatizaciones de Reto 13 y sus dos archivos protegidos idénticos por hash. Clients vacío, sin nuevas fichas/citas. Lint y tipos correctos en principal; build y suites previas reutilizados por coincidencia de fuentes/configuración/versiones, sin build sobre .next compartido.

CUA con sesión Clerk existente y pestaña propia: Clientes muestra el vacío real; Nueva cita consulta Cliente guardado, con selector de 36px y sin errores de consola. Formulario cerrado sin guardar. Servidores 3000/3001 conservados sin reinicios. Evidencia nueva: C:/Users/dcalu/.codex/slotly-evidence/reto14-clients/integration-main-20261024/README.md. Las capturas acreditan lecturas; E2E real de escritura pendiente de plan y autorización concretos. Esta autorización no reutiliza permisos de Reto 13.

## E2E real autorizado y cierre vigente — 24/10/2026

El humano autorizó las dos fichas homónimas «Validación Clientes Álex», tres citas del27/10/2026 con servicio2, reprogramar la primera a11:00 y cancelar las tres al terminar. La ejecución se realizó en la app principal y backend dev real, con sesión Clerk existente. No se reutilizaron autorizaciones Reto13 ni se añadieron otras escrituras.

- Dos fichas propias e independientes, IDs/altas/comandos distintos; nombre normalizado, doble clic de la primera con un único efecto, búsqueda sin tildes/mayúsculas/espacios y persistencia tras recargar comprobados. Las fichas permanecen porque el incremento no incluye borrado/archivo.
- FichaA: cita08:30–09:05, después11:00–11:35 y finalmenteCancelada, versión2. FichaB:09:15–09:50, finalmenteCancelada, versión1. Nombre libre idéntico:10:00–10:35, finalmenteCancelada, versión1, sin clientId. Tres IDs de cita distintos y estables, mismo cliente/servicio/nombre/intervalo histórico salvo el movimiento expresamente autorizado.
- Cada ficha muestra una única cita en su historial; el homónimo y la cita libre quedan excluidos. Recargas comprobadas tras alta, confirmación, movimiento y cancelación. No se creó una tercera ficha ni se asoció el legado.
- Capacidad pública y privada restaurada:28 opciones iguales de35min el27/10, incluidas08:30,09:15,10:00 y11:00. Antes del cierre, la lectura pública acreditó08:30 liberado por el movimiento y11:00 ocupado. No se confirmó ninguna reserva pública; recibos originales intactos.
- Lecturas de documentos completos antes/después: las12 citas anteriores y todas las filas de servicios, horarios, excepciones, bloqueos, negocios, recibos y avisos conservan IDs/hashes. Las dos automatizaciones R13 y los dos archivos de prueba protegidos también son idénticos. Ahora existen15 citas en total:12 previas más3 R14 Canceladas autorizadas. Los seguimientos del lunes mantienen sus citas/horarios/comandos y su veredicto independiente.

Evidencia: `C:/Users/dcalu/.codex/slotly-evidence/reto14-clients/real-e2e-20261024/verification-status.json`, con observaciones/capturas CUA, snapshots reales y cotejo reproducible de documentos completos. Solo se persisten hashes de documentos ajenos; los documentos crudos guardados son los ficticios expresamente autorizados. El observador CLI ejecuta exclusivamente lecturas de tablas, sin despliegue o escrituras administrativas.

Esta ejecución cierra el pendiente real de escritura de Reto14 dentro de su alcance. No se repiten ni se atribuyen al cloud las carreras, paginación densa, noauth/otro propietario o fallos controlados cubiertos por las pruebas locales previas. No se manipuló el reloj, autenticación, infraestructura ni datos anteriores; no hubo código funcional nuevo, commit/push/PR o nuevos entornos. El resultado no acredita notificaciones nativas del SO ni sustituye el veredicto pendiente de Reto13.
