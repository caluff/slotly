# Slotly

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Profesionales y negocios que necesitan gestionar citas y reservas.

## Product Purpose

Gestiona tus citas de forma sencilla. El proyecto se desarrolla en etapas pequeñas e independientes.

## Capabilities and Constraints

La etapa actual incluye portada, registro e inicio de sesión oficiales de Clerk, menú de cuenta y dashboard protegido con creación y consulta del perfil del negocio en Convex. Un negocio por cuenta, con un único propietario, nombre y zona horaria IANA. Correo y Google dependen de la configuración de Clerk. Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4 y pnpm. Usar shadcn/ui cuando aporte valor.

No implementar edición o eliminación del negocio, empleados, invitaciones, roles, múltiples negocios, servicios, disponibilidad, citas, calendarios, pagos ni notificaciones hasta que el usuario solicite otra etapa. No simular usuarios en la aplicación ni crear autenticación propia. Conservar la configuración existente y los secretos en el servidor. Las pruebas automatizadas usan identidades sintéticas y se distinguen de las pruebas reales con Clerk.

## Brand Commitments

Nombre: Slotly. Interfaz limpia, profesional y responsive. Preferencia confirmada por el usuario: clara con acentos verdes.

Usar el logo aportado por el usuario, conservando el calendario y la palabra Slotly, con fondo transparente y el calendario adaptado al verde de la app.
