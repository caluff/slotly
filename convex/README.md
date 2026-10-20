# Backend de Slotly

Clerk autentica las cuentas; Convex verifica sus JWT y guarda el perfil del negocio. La configuración de desarrollo está explicada en el [README principal](../README.md). No se guardan claves ni tokens en este directorio.

- `auth.config.ts`: emisor de Clerk y audiencia `convex`.
- `schema.ts`: tabla `businesses` e índice por propietario.
- `businesses.ts`: `getMyBusiness` y `createMyBusiness`, ambas autenticadas y validadas. El propietario procede de la identidad verificada, nunca del cliente. La comprobación de existencia y la inserción son una sola transacción.
- `_generated/`: tipos y referencias generados por la CLI oficial. Se conservan en el repositorio; no deben editarse manualmente.

Inicia el backend de desarrollo con `pnpm convex:dev`. Al cambiar el esquema o las funciones, la CLI valida, regenera tipos y actualiza ese backend. Para regenerar explícitamente los tipos, usa `pnpm exec convex codegen`.

Las pruebas están en `tests/businesses.test.ts` y `scripts/test-businesses-local.mjs`; se ejecutan mediante `pnpm test` y, con el backend local activo, `pnpm test:local`. La segunda comprobación escribe perfiles sintéticos en el entorno local y no admite producción ni proyectos cloud.

El alcance actual es un negocio por cuenta con un único propietario, solo creación y consulta. No añadir otras operaciones o tablas sin autorización del siguiente reto.
