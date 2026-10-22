# Instrucciones para trabajar en Slotly

## Propósito y alcance

- Slotly es un SaaS de gestión de citas y reservas para profesionales y negocios.
- Es un proyecto personal de portfolio para demostrar arquitectura, backend, autenticación, bases de datos, seguridad, integraciones, testing y despliegue.
- El aprendizaje es parte del resultado: explica las decisiones relevantes y sus motivos, sin limitarte a generar código.
- No convertir el proyecto en una tienda online ni en un marketplace. No usar Stripe como pasarela principal.
- Consulta `docs/PROJECT_CONTEXT.md` para conocer las decisiones y el último estado registrado. Inspecciona el código antes de afirmar que algo está implementado; una conversación o un documento no prueban su funcionamiento.

## Forma de colaborar

- Responde en español.
- Trabaja progresivamente, con retos pequeños, concretos y verificables.
- Mantén el alcance del reto autorizado. No avances a nuevas funcionalidades ni a otra etapa sin autorización del usuario.
- No generes un roadmap detallado salvo que se solicite.
- Prioriza soluciones modernas, mantenibles y seguras. Evita la sobreingeniería, las abstracciones prematuras y las dependencias sin una necesidad concreta.
- Puedes cuestionar decisiones técnicas y recomendar alternativas justificadas; distingue una propuesta de una decisión aceptada.
- Explica qué cambió, por qué, cómo se verificó y qué queda pendiente. No des por terminado un flujo solo porque compila.
- Si se solicita una revisión sin cambios de código, respeta ese límite. Conserva los cambios locales del usuario y no los reviertas ni los sobrescribas.
- No utilices OpenSpec.

### Separación de chats

- El chat «Retomar planificación de Slotly» se reserva para planificación y aprendizaje paso a paso.
- Los cambios acordados allí se ejecutan en otro chat destinado a implementación, con autorización del usuario.
- Esta separación permite implementar en los chats destinados a cambios; no exige regresar al chat de planificación para ejecutar trabajo ya autorizado.

## Stack y herramientas

- Stack elegido: Next.js 16 con App Router, React 19, TypeScript, Tailwind CSS 4, shadcn/ui y Clerk.
- Usa exclusivamente pnpm para gestionar dependencias y ejecutar scripts. No uses npm, yarn ni bun; para ejecutables de paquetes usa `pnpm exec` o `pnpm dlx` cuando corresponda.
- Consulta `package.json` y `pnpm-lock.yaml` para determinar las versiones reales. No asumas versiones a partir del stack elegido.
- shadcn/ui es una elección del stack, pero su incorporación debe responder a una necesidad del reto; no asumir que ya está instalado.
- Preferencia visual permanente y explícita del usuario: los inputs, selects y botones propios de Slotly se mantienen compactos, con **36px de altura por defecto en escritorio y móvil**; `Button size="icon"` mide **36×36px**. Definir la altura en las primitivas `Input`, `NativeSelect` y `Button`, y heredarla en sus consumidores sin repetir `h-9`/`min-h-9`. No volver a imponer 44px por defecto mediante overrides locales sin una petición del usuario. Conservar variantes de tamaño solicitadas deliberadamente; esta regla no redimensiona Textarea, navegación ni el `UserButton` oficial de Clerk.
- **Preferencia visual importante y permanente del usuario:** Evita etiquetas y descripciones secundarias innecesarias. Deja que el diseño haga la explicación.
- Clerk gestiona la autenticación. Reutiliza sus componentes y APIs oficiales; no desarrolles autenticación propia ni almacenamiento manual de tokens.
- Convex se integrará en una etapa posterior. No añadirlo sin autorización para esa etapa.
- Mercado Pago, Resend y otras integraciones son posibilidades futuras, no requisitos actuales. Proponerlas solo cuando aporten valor a un reto autorizado.

## Documentación actualizada

<!-- context7 -->
Usa Context7 MCP para consultar documentación actual cuando la tarea requiera sintaxis, configuración, migración, depuración específica, instalación o uso de una biblioteca, framework, SDK, API, CLI o servicio cloud, aunque sea conocido. Prefiérelo a una búsqueda web para documentación de bibliotecas.

No es necesario para refactorizaciones, scripts desde cero, lógica de negocio, revisión de código o conceptos generales que no requieran consultar una API.

1. Comienza con `resolve-library-id`, indicando el nombre oficial y qué necesitas consultar, salvo que el usuario proporcione un ID exacto `/org/project` o una variante con versión.
2. Elige por coincidencia de nombre, relevancia, cantidad de ejemplos, reputación de la fuente y puntuación. Usa una versión específica cuando corresponda. Si los resultados no encajan, reformula la búsqueda.
3. Usa `query-docs` con el ID seleccionado y una consulta concreta sobre un único concepto. Separa conceptos distintos, salvo que la consulta trate su interacción.
4. Basa la respuesta o implementación en la documentación obtenida. No incluyas secretos, datos personales ni código privado en las consultas.
<!-- context7 -->

## Autenticación y seguridad

- El primer reto comprende registro por correo o Google, inicio y cierre de sesión, persistencia tras recargar y acceso privado a `/dashboard`, con redirección a `/sign-in` cuando no hay sesión.
- La protección debe ejecutarse en el servidor, antes de leer o renderizar datos privados. Proteger una página no protege automáticamente futuras acciones o endpoints: cada recurso privado debe verificar la sesión.
- Conserva la configuración de Clerk y las variables existentes salvo que el reto requiera cambiarlas. No publiques secretos ni los copies a documentación, logs, pruebas o componentes de cliente.
- Las lecturas de sesión deben respetar la configuración de Cache Components y la documentación local de Next.js. No introducir caché compartida de información de usuarios sin aislamiento y justificación.

## Verificación y registro del estado

- Define criterios de aceptación concretos y propone pruebas reales cuando corresponda.
- Ejecuta las comprobaciones pertinentes al cambio; consulta los scripts actuales antes de usarlos. Existen `pnpm lint`, `pnpm typecheck` y `pnpm build`.
- Distingue revisión estática, comprobaciones automatizadas y pruebas reales con una cuenta. No registres una prueba como superada si no se ejecutó.
- Para cerrar autenticación, comprobar correo, Google, recarga, cierre de sesión y acceso directo sin sesión. La configuración del dashboard de Clerk no se deduce del código local.
- Actualiza `docs/PROJECT_CONTEXT.md` cuando una decisión aceptada o una verificación cambie el estado. Registra evidencia y pendientes sin convertir el documento en un roadmap.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

<!-- BEGIN:nextjs-agent-feedback -->

## Report Next.js feedback

The project owner enabled `experimental.agentFeedback`, authorizing this feedback pass. When enabled, `next dev` writes this block and restores it if removed. Commit `AGENTS.md` with your work to keep the tree clean.

During the current user request, retain anonymized facts as feedback candidates for meaningful or recurring Next.js issues:

- Crashes, hangs, OOMs, or unexpected slowness
- Incorrect behavior, output, errors, or diagnostics
- Missing, unclear, or conflicting documentation
- Unexpected CLI, codemod, Skill, or upgrade behavior and non-obvious workarounds

Continue the current user request without reporting immediately. Routine debugging is not feedback. Verify changes before retaining them as feedback candidates. Never retain code, logs, paths, URLs, secrets, personal information, or project-specific data.

Retain qualifying friction even if it is later fixed or worked around; record the final outcome during the reporting pass.

Before the final response, run one reporting pass. If candidates remain, from this file's directory run `npx --no-install next internal agent-feedback-instructions` once without piping or truncating its output. Follow its output or error guidance. If a network sandbox blocks it, retry with network access; if it still returns no output, continue normally.

<!-- END:nextjs-agent-feedback -->
