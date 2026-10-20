# Backend de Slotly

Clerk autentica las cuentas; Convex verifica sus JWT y guarda el perfil del negocio y sus servicios. La configuración de desarrollo está explicada en el [README principal](../README.md). No se guardan claves ni tokens en este directorio.

- `auth.config.ts`: emisor de Clerk y audiencia `convex`.
- `schema.ts`: `businesses` con índice por propietario y `services` con índice `by_businessId`.
- `businesses.ts`: `getMyBusiness` y `createMyBusiness`, ambas autenticadas y validadas. El propietario procede de la identidad verificada, nunca del cliente. La comprobación de existencia y la inserción son una sola transacción.
- `services.ts`: `listMyServices` y `createMyService`. Ambas resuelven el negocio desde la identidad verificada y rechazan cuentas sin sesión o sin negocio. No aceptan propietario ni negocio del cliente. Listado paginado por negocio, más recientes primero; nombre recortado de 1 a 100 caracteres y duración como entero positivo seguro. La tabla solo contiene `businessId`, `name`, `durationMinutes` y los campos de sistema.
- `_generated/`: tipos y referencias generados por la CLI oficial. Se conservan en el repositorio; no deben editarse manualmente.

Inicia el backend de desarrollo con `pnpm convex:dev`. Al cambiar el esquema o las funciones, la CLI valida, regenera tipos y actualiza ese backend. Para regenerar explícitamente los tipos, usa `pnpm exec convex codegen`.

`pnpm test` ejecuta los tests de negocio y servicios con `convex-test` y los esquemas Zod del formulario, todos en memoria. `pnpm test:local` conserva la comprobación inicial de negocios de `scripts/test-businesses-local.mjs`: escribe perfiles sintéticos en el entorno local y no admite producción ni proyectos cloud.

El alcance actual es un negocio por cuenta con un único propietario y varios servicios por negocio, solo creación y consulta. No añadir otras operaciones o tablas sin autorización del siguiente reto.
