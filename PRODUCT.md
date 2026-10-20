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

No implementar edición o eliminación del negocio o sus servicios, precios, empleados, invitaciones, roles, múltiples negocios, múltiples tramos diarios, excepciones por fecha, vacaciones o festivos, creación de turnos o reservas, bloqueo de horarios ocupados, agenda pública, sincronización con calendarios, pagos ni notificaciones por correo u otros canales externos hasta que el usuario solicite otra etapa. Las confirmaciones de creación de servicios y guardado del horario mediante el único toast global sí forman parte de la interfaz actual; consultar opciones no emite toast de éxito. No simular usuarios en la aplicación ni crear autenticación propia. Conservar la configuración existente y los secretos en el servidor. Las pruebas automatizadas usan identidades sintéticas y se distinguen de las pruebas reales con Clerk.

## Brand Commitments

Nombre: Slotly. Interfaz limpia, profesional y responsive. Preferencia confirmada por el usuario: clara con acentos verdes.

Usar el logo aportado por el usuario, conservando el calendario y la palabra Slotly, con fondo transparente y el calendario adaptado al verde de la app.
