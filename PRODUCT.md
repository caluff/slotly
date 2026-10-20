# Slotly

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Profesionales y negocios que necesitan gestionar citas y reservas.

## Product Purpose

Gestiona tus citas de forma sencilla. El proyecto se desarrolla en etapas pequeñas e independientes.

## Capabilities and Constraints

La etapa actual incluye portada, registro e inicio de sesión oficiales de Clerk, menú de cuenta y dashboard protegido con creación y consulta del perfil del negocio y sus servicios en Convex. Un negocio por cuenta, con un único propietario, nombre y zona horaria IANA; varios servicios por negocio, cada uno con nombre y duración en minutos enteros positivos. El Reto 04 añade consulta y edición de una configuración semanal de atención por negocio: siete días abiertos o cerrados, un tramo por día abierto y guardado atómico de la semana completa, en hora local de la zona IANA existente. Admite una semana totalmente cerrada y distingue esa configuración de no haber guardado ninguna. El Reto 04 está cerrado funcionalmente en desarrollo, con las confirmaciones del usuario y las pruebas reales del agente de planificación, incluido el aislamiento entre dos cuentas. Correo y Google dependen de la configuración de Clerk. Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4 y pnpm. Los formularios reutilizan shadcn/ui, React Hook Form y Zod.

El Reto 05 incorpora una consulta privada de opciones de inicio y fin para un servicio propio y una fecha concreta, derivadas del horario semanal y la zona IANA del negocio. Los comienzos se separan 15 minutos desde la apertura; la duración determina el fin y puede producir alternativas solapadas. Se admite terminar exactamente al cierre y se excluyen comienzos pasados según el reloj del servidor. La consulta distingue ausencia de negocio o servicios, horario sin configurar, semana/día cerrado y ausencia de opciones. Se actualiza cada 30 segundos y al recuperar foco; la interfaz retira las opciones al vencer su inicio. Se omiten horas inexistentes o repetidas y opciones que cruzan un cambio de offset; apertura/cierre ambiguos dejan ese día sin opciones con explicación. No se guardan documentos de huecos ni se comprueba ocupación. El Reto 05 queda cerrado funcionalmente en desarrollo tras la revisión estática del código y de las evidencias por el chat de planificación, sin nuevas pruebas ni confirmaciones manuales del usuario. El detalle de evidencia, límites y autorización posterior de commit/push está en `docs/PROJECT_CONTEXT.md`.

El Reto 06 añade creación y listado privado de citas por fecha desde el dashboard. Una agenda por negocio, con capacidad de una cita a la vez para todos sus servicios. Se eligen servicio propio, fecha y una opción libre; solo se pide el nombre del cliente. El backend normaliza el nombre, calcula el fin con la duración real y crea una cita confirmada. La disponibilidad excluye todos los solapes, con fin excluido: el fin de una cita puede coincidir con el inicio de la siguiente. Comprobación y escritura se ejecutan en una sola mutación transaccional, que vuelve a validar horario vigente, paso, futuro, zona y DST. Las citas conservan sus instantes al cambiar la semana. El listado incluye cliente, servicio e inicio/fin en la zona IANA del negocio. La interfaz conserva los datos ante errores, actualiza opciones/listado y confirma mediante un único toast después del éxito. El Reto 06 queda cerrado funcionalmente en desarrollo tras la revisión estática y la prueba completa con Clerk/cloud del agente de planificación, incluida una cita autorizada que permanece guardada, su persistencia tras recarga y la ocupación compartida entre servicios. La concurrencia real se verificó únicamente en motor local aislado por implementación; no se probaron carreras cloud ni la segunda cuenta real en este reto. Evidencia, ejecutores, autorización y estado final en `docs/PROJECT_CONTEXT.md`. El usuario autorizó posteriormente revisar el diff y, si es correcto, hacer commit y subir el Reto 06 a GitHub; el resultado de la publicación se verificará y comunicará en planificación.

No implementar edición o eliminación del negocio o sus servicios, edición/cancelación/reprogramación de citas, clientes como módulo separado, correo/teléfono del cliente, precios, empleados, invitaciones, roles, múltiples negocios o agendas, múltiples tramos diarios, excepciones por fecha, vacaciones o festivos, agenda pública, sincronización con calendarios, pagos ni notificaciones por correo u otros canales externos hasta que el usuario solicite otra etapa. Las escrituras actuales usan el único toast global; consultar opciones no emite toast de éxito. No simular usuarios en la aplicación ni crear autenticación propia. Conservar la configuración existente y los secretos en el servidor. Las pruebas automatizadas usan identidades sintéticas en memoria o un motor local aislado y se distinguen de las pruebas reales con Clerk.

## Experiencia del espacio privado

Antes del Reto 07 se reorganiza la experiencia de las funciones existentes en cuatro vistas: Agenda, Servicios, Horario y Negocio. La navegación superior compacta pasa a una segunda fila en móvil. Agenda es la entrada: consulta todas las citas del día, inicia en hoy según la zona del negocio y permite fecha/anterior/siguiente/Hoy sin seleccionar un servicio. Nueva cita y Nuevo servicio abren formularios bajo demanda. La disponibilidad se consulta automáticamente según servicio y fecha; las confirmaciones conservan las garantías del Reto 06. Los borradores permanecen al cambiar de vista o cerrar paneles; salir del documento requiere aviso si hay cambios. Horario conserva el guardado explícito de toda la semana. Negocio ofrece consulta o creación inicial; no edición. La reorganización inicial no modificó tablas, endpoints, reglas de ocupación ni datos reales.

La extensión posterior de Agenda añade Buscar citas sin conocer el día: nombre del cliente, servicio, período y rango opcional combinables, paginación de todas las fechas propias y Ver día. Mantiene los borradores y los controles propios heredados de 36px. Añade una lectura autorizada y dos índices en desarrollo, sin nuevas escrituras de citas ni cambios en sus garantías. El lote UX/UI y filtros está validado en desarrollo con 268 tests y las verificaciones y límites registrados en `docs/PROJECT_CONTEXT.md`. El usuario autorizó después revisar el diff y, si es correcto, hacer commit y subirlo a GitHub; planificación verificará y comunicará el resultado de la publicación, todavía no acreditado en este registro. No se amplía el alcance a producción ni al Reto 07.

## Brand Commitments

Nombre: Slotly. Interfaz limpia, profesional y responsive. Preferencia confirmada por el usuario: clara con acentos verdes.

Usar el logo aportado por el usuario, conservando el calendario y la palabra Slotly, con fondo transparente y el calendario adaptado al verde de la app.
