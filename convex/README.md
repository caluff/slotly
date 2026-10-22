# Backend de Slotly

Clerk autentica las cuentas; Convex verifica sus JWT y guarda el perfil del negocio y sus servicios. La configuración de desarrollo está explicada en el [README principal](../README.md). No se guardan claves ni tokens en este directorio.

- `auth.config.ts`: emisor de Clerk y audiencia `convex`.
- `schema.ts`: negocios propios y catálogo, horario, excepciones, bloqueos, citas y recibos públicos; índices por los recursos y rangos que se consultan.
- `businesses.ts`: `getMyBusiness` y `createMyBusiness`, ambas autenticadas y validadas. El propietario procede de la identidad verificada, nunca del cliente. La comprobación de existencia y la inserción son una sola transacción.
- `services.ts`: `listMyServices`, `getMyService`, `createMyService` y `changeMyService`, autenticadas por negocio propio. Catálogo paginado, archivo/restauración lógica, revisiones y replays explícitos, nombre recortado de1–100 caracteres. Duración nueva/edición explícita: entero seguro mínimo15 y múltiplo de5; legado46 sin migración. Nuevas reservas comprueban servicio activo y contexto visto en la transacción; movimientos conservan duración histórica. Contrato y evidencia en [SERVICES.md](../docs/SERVICES.md).
- `_generated/`: tipos y referencias generados por la CLI oficial. Se conservan en el repositorio; no deben editarse manualmente.

Inicia el backend de desarrollo con `pnpm convex:dev`. Al cambiar el esquema o las funciones, la CLI valida, regenera tipos y actualiza ese backend. Para regenerar explícitamente los tipos, usa `pnpm exec convex codegen`.

La suite unitaria de Vitest/`convex-test` se retiró por petición expresa del usuario el 22/10/2026: 16 archivos y configuración, con 471 casos ejecutados históricamente. No queda una suite de unitarios equivalente; se reduce esa cobertura automatizada. Los resultados anteriores conservan su valor como evidencia de su ejecución, sin acreditar que los tests sigan presentes.

Se conservan `scripts/test-appointments-engine.mjs`, sus módulos de reservas públicas, fechas especiales y bloqueos, y `scripts/test-businesses-local.mjs`. Reto12 añade `scripts/service-engine-scenarios.mjs`; son integración/concurrencia real, no unitarios. `pnpm test:local` sigue siendo la comprobación inicial opcional de negocios: escribe perfiles sintéticos en el entorno local y no admite producción ni proyectos cloud. `pnpm test:appointments:engine` usa un motor temporal aislado, sin leer `.env.local/.convex`; genera allí su fixture de legado, nunca en cloud. Las pruebas no se repitieron por la retirada de unitarios; sí se ejecutan de nuevo al cambiar los contratos del Reto12.

El alcance actual es un negocio por cuenta con un único propietario, catálogo gestionable y reservas privadas/públicas con Agenda, horario, excepciones y bloqueos individuales. No añadir otras etapas sin autorización.

El refinamiento de Reto12 añade `getMyServiceUndo` y `undoMyService`: ticket de operación/revisión y snapshot previo exclusivamente servidor. Undo de edición restaura valores; undo de creación archiva la misma identidad. Sin sobreescritura posterior, borrado físico o relajación de duraciones normales. Para ejecutar solo las nuevas carreras reales de undo, `pnpm test:appointments:engine --service-undo-only --report <ruta absoluta externa>`; las matrices anteriores permanecen disponibles en el comando sin ese filtro. Evidencia y límites en `docs/SERVICES.md`.
