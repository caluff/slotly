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

No implementar edición o eliminación del negocio o sus servicios, precios, empleados, invitaciones, roles, múltiples negocios, múltiples tramos diarios, excepciones por fecha, vacaciones o festivos, generación de huecos, turnos, reservas, agenda pública, sincronización con calendarios, pagos ni notificaciones por correo u otros canales externos hasta que el usuario solicite otra etapa. Las confirmaciones de creación de servicios y guardado del horario mediante el único toast global sí forman parte de la interfaz actual. No simular usuarios en la aplicación ni crear autenticación propia. Conservar la configuración existente y los secretos en el servidor. Las pruebas automatizadas usan identidades sintéticas y se distinguen de las pruebas reales con Clerk.

## Brand Commitments

Nombre: Slotly. Interfaz limpia, profesional y responsive. Preferencia confirmada por el usuario: clara con acentos verdes.

Usar el logo aportado por el usuario, conservando el calendario y la palabra Slotly, con fondo transparente y el calendario adaptado al verde de la app.
