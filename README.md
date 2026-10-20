# Slotly

Plataforma de citas y reservas para profesionales y negocios. La etapa actual incluye autenticación con Clerk, perfil del negocio y sus servicios, horario semanal de atención y consulta privada de opciones de inicio y fin con Convex: un negocio por cuenta, con un único propietario y varios servicios.

## Desarrollo

Stack instalado: Next.js 16.4.2 (App Router), React 19.3, TypeScript, Tailwind CSS 4, Clerk Next.js 7.9.17 y Convex 1.47.0. Utiliza únicamente pnpm.

```sh
pnpm install --frozen-lockfile
```

Configura tus claves de desarrollo de Clerk en `.env.local` siguiendo `.env.example`. Si ese archivo ya existe, conserva sus variables. Activa la integración de Convex en tu instancia de desarrollo de Clerk o crea una plantilla JWT llamada `convex` con el claim `"aud": "convex"` (duración predeterminada: 60 segundos). El `sub` lo genera Clerk; no debe sustituirse por el correo ni por metadatos del cliente.

El proyecto de esta cuenta es [slotly, equipo daniel-caluff](https://dashboard.convex.dev/t/daniel-caluff/slotly). Su entorno activo es **dev/slotly**, un backend cloud de desarrollo en US East (N. Virginia), con nombre `determined-poodle-377`. No hay entorno de producción de Slotly.

Si configuras el repositorio en otro equipo con acceso a esa cuenta, autentica la CLI y selecciona explícitamente el entorno existente. No vuelvas a crear el proyecto ni selecciones NEEDTHISS, que es ajeno a Slotly:

```sh
pnpm exec convex login
pnpm exec convex login status
pnpm exec convex deployment select daniel-caluff:slotly:dev/slotly
```

La selección escribe las variables de Convex en `.env.local`. Conserva las variables existentes de Clerk. No uses `CONVEX_AGENT_MODE=anonymous` para trabajar con este destino; si la tienes en la terminal, elimínala antes de continuar.

Inicia la sincronización de funciones en una terminal:

```sh
pnpm convex:dev
```

`pnpm convex:dev` actualiza el esquema, las funciones y los tipos del entorno cloud seleccionado. Los datos permanecen en Convex aunque cierres esa terminal; el proceso sirve para sincronizar cambios durante el desarrollo. La app de Next.js sigue ejecutándose localmente.

El emisor de Clerk ya está configurado en este backend. Para un entorno nuevo, configura su variable una sola vez usando la **Frontend API URL** de la misma instancia de desarrollo de Clerk:

```sh
pnpm exec convex env set CLERK_JWT_ISSUER_DOMAIN https://TU-INSTANCIA.clerk.accounts.dev --deployment daniel-caluff:slotly:dev/slotly
```

Espera a que Convex indique que las funciones están listas. Después inicia Next.js en otra terminal:

```sh
pnpm dev
```

Abre [localhost:3000](http://localhost:3000).

### Si falla la validación de instant UI durante el desarrollo

El 19 de octubre de 2026 se reprodujo un error genérico de validación cuya causa era un módulo interno ausente del React Client Manifest. El servidor seguía abierto desde antes de instalar dependencias: solicitaba la ubicación anterior de Next.js en `.pnpm`, mientras los manifiestos contenían la ubicación actual. La versión seguía siendo 16.4.2.

Si instalas dependencias o cambia la resolución de pnpm con `pnpm dev` abierto, detén ese proceso y vuelve a ejecutar `pnpm dev`; después recarga la pestaña. En este caso bastó ese reinicio, sin borrar cachés ni modificar componentes o configuración. No asumas que cualquier error con ese mensaje tiene la misma causa: abre su apartado **Caused by** en el overlay y comprueba el error concreto antes de actuar. La consola puede conservar mensajes anteriores; compara los nuevos después de la recarga.

La corrección y las pruebas están registradas en `docs/PROJECT_CONTEXT.md`.

### Respaldo local y migración

La primera implementación utilizó un backend local anónimo, que no pertenecía a la cuenta y por eso no aparecía en su dashboard. Se conservan su base y configuración en `.convex/local/`, sin borrar datos. Antes de cambiar el destino se guardaron una exportación completa y una copia privada de `.env.local` en `.convex/backups/slotly-local-before-cloud-20261019/`. Esa carpeta está excluida de Git; contiene datos y configuración privados y no debe publicarse.

Se migró únicamente el perfil real **slotly / America/Montevideo**, conservando `_id`, `_creationTime`, `ownerId`, `name` y `timeZone`. La importación añadió una fila a la tabla vacía de desarrollo, sin reemplazos ni eliminaciones. Los tres perfiles sintéticos quedaron solo en el respaldo y en la base local. El backend local se detuvo después de la migración, y la app se verificó contra cloud con la sesión real de Clerk.

La evidencia, los comandos de creación e importación y los pendientes están en `docs/PROJECT_CONTEXT.md`. El respaldo permite recuperar el estado anterior; no se debe importar completo sobre cloud para probar la aplicación, porque también contiene datos sintéticos.

## Autenticación

- `/`: portada pública; muestra la bienvenida y el menú oficial de cuenta cuando hay una sesión activa.
- `/sign-in` y `/sign-up`: componentes oficiales de Clerk, con traducción al español. Clerk gestiona correo, contraseña, verificación y Google según la configuración de la instancia.
- `/dashboard`: verifica la sesión en el servidor con `await auth.protect()` antes de consultar el usuario o renderizar contenido privado. Después comprueba la autenticación con Convex y consulta el perfil del propietario actual.
- `UserButton`: gestión de cuenta y cierre de sesión con regreso a `/`. La persistencia de sesión la gestiona Clerk; no se guardan tokens manualmente.

Se reutilizan `ClerkProvider`, `proxy.ts` y `.env.local`, previamente configurados con la CLI. El proxy inicializa Clerk; la página aplica la protección. No se usa `createRouteMatcher`, deprecado en Clerk 7.

Las variables existentes son `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL` y las dos variables `NEXT_PUBLIC_CLERK_SIGN_*_FALLBACK_REDIRECT_URL`. No compartas ni publiques sus valores. `.env.local` permanece excluido de Git.

Después de iniciar sesión o completar el registro, Clerk envía al usuario a `/dashboard` mediante `signInFallbackRedirectUrl` y `signUpFallbackRedirectUrl` en `ClerkProvider`. Esos valores tienen prioridad sobre los fallbacks de `.env.local`; las variables de Clerk se conservaron al cambiar las variables de Convex. Si existe un destino explícito en `redirect_url`, Clerk lo conserva; no se fuerza una redirección que lo reemplace. Se aplica a los componentes oficiales tanto para correo como para Google. La disponibilidad de Google depende de la conexión habilitada en Clerk; no requiere un flujo OAuth propio.

Cache Components ya está habilitado. Las lecturas de sesión se ejecutan dentro de `Suspense`, sin caché compartida de usuarios. Una redirección durante streaming puede conservar HTTP 200: comprueba el destino y la ausencia de contenido privado, además del estado HTTP.

Las páginas y la estructura conservan sus Server Components. El perfil y el formulario son Client Components, con el proveedor oficial `ConvexProviderWithClerk` dentro del proveedor existente de Clerk y limitado al dashboard. El formulario utiliza componentes reales de shadcn/ui adaptados al tema de Slotly, React Hook Form y Zod.

## Perfil del negocio

`convex/schema.ts` define `businesses` con `ownerId`, `name`, `timeZone` e índice `by_ownerId`. Los identificadores y la fecha de creación son los campos de sistema de Convex. `ownerId` es el `subject` de la identidad verificada por el único emisor de Clerk configurado; nunca se acepta como argumento del cliente.

- `getMyBusiness`: requiere autenticación; devuelve solo el perfil de la cuenta actual, o `null` cuando esa cuenta aún no tiene negocio. No expone `ownerId`.
- `createMyBusiness`: requiere autenticación y valida argumentos, nombre de 1 a 100 caracteres tras recortar espacios y zona IANA reconocida por `Intl.DateTimeFormat`. Rechaza offsets numéricos. Consulta el índice y crea en la misma transacción; cualquier segundo envío se rechaza sin modificar el perfil existente.
- La interfaz diferencia comprobación de sesión, consulta pendiente (`undefined`), ausencia de negocio (`null`), guardado, perfil persistido y errores. Los errores de guardado conservan los campos.

`components/business-profile-form.tsx` usa `Controller` con `FieldGroup`, `Field`, `FieldLabel` y `FieldError`, además de `Input`, `Button` y un `NativeSelect` cerrado. Los controles conservan 36px de altura y radio de 6px. No hay descripciones auxiliares permanentes. React Hook Form gestiona valores, errores y envío; `zodResolver` aplica el esquema de `lib/business-profile-schema.ts`: nombre recortado de 1 a 100 caracteres y zona IANA incluida en las opciones permitidas. Los errores de validación quedan asociados a su campo y reciben foco; los errores generales de sesión, duplicado o red se anuncian sin borrar los valores. El envío queda bloqueado durante la petición y, tras el éxito, hasta que la consulta reactiva sustituye el formulario.

`components.json` configura shadcn sin regenerar el CSS global. Los componentes de `components/ui/` se incorporaron mediante la CLI oficial y se adaptaron a las clases y colores existentes; los aliases de tema añadidos no cambian el significado de `accent` ni de `muted`. Las dependencias `cn`, `class-variance-authority`, `radix-ui` y `lucide-react` soportan los componentes oficiales. Para incorporar otro componente, usa `pnpm dlx shadcn@4.22.1 add <componente>` y revisa sus cambios antes de extender el tema.

La validación de Zod mejora la interacción del cliente; los controles de autenticación, propietario, valores y duplicados siguen ejecutándose independientemente en Convex. `pnpm test` ejecuta pruebas en memoria del esquema y de las funciones de backend; no escribe en el despliegue cloud. No ejecutes `test:local` contra ese destino.

No hay edición ni eliminación del negocio, Organizations, sincronización de usuarios, webhooks ni tablas de sesiones. La protección de `/dashboard` no reemplaza la autenticación propia de cada función de Convex.

## Servicios del negocio (Reto 03)

`services` relaciona cada servicio con `businesses` mediante `businessId` e índice `by_businessId`. Guarda solo esa relación, `name`, `durationMinutes` y los campos de sistema de Convex.

- `createMyService` y `listMyServices` verifican la identidad de Clerk y resuelven su negocio por el índice de propietario en cada operación. Rechazan peticiones sin sesión o sin negocio; no aceptan `businessId` ni propietario como argumentos.
- El backend recorta el nombre y exige de 1 a 100 caracteres. La duración debe ser un entero positivo seguro (`1` a `Number.MAX_SAFE_INTEGER`); no se añaden precios ni otras reglas de agenda.
- El dashboard añade «Servicios» solo al encontrar el negocio. Usa una consulta reactiva paginada (20 filas iniciales y «Cargar más servicios»), con los más recientes primero y estado vacío. El servidor limita cada página solicitada a 50 elementos y limita las lecturas.
- `ServiceForm` reutiliza shadcn/ui, React Hook Form y Zod. Distingue texto editable y valor numérico validado, asocia los errores a los campos y conserva valores ante fallos. Bloquea envíos rápidos mientras hay una petición pendiente; tras el éxito limpia y enfoca el nombre para crear otro servicio y muestra un único toast «Servicio creado», sin mensaje inline duplicado. El contenedor global de Sonner sigue el patrón de shadcn/ui, con tema claro y tokens de Slotly; los errores permanecen en el formulario. No se exige unicidad del nombre ni se añade deduplicación entre creaciones intencionales.

El Reto 03 queda cerrado funcionalmente en desarrollo. El usuario confirmó la creación de dos servicios y su persistencia tras recarga, las validaciones negativas sin crear servicios inválidos, la redirección a `/sign-in` sin sesión y la recuperación del perfil y los servicios al volver a entrar. También confirmó el perfil intacto, el aislamiento entre dos cuentas reales y un único toast de éxito sin mensaje junto al botón.

Estas pruebas fueron ejecutadas y reportadas por el usuario. Las comprobaciones de UI sintética del agente usaron respuestas locales sin escrituras remotas; las pruebas en memoria conservan sus límites sobre JWT y concurrencia indicados en «Comprobaciones». El cierre no acredita producción. No hay edición ni eliminación de servicios, precios, pagos ni citas.

## Horario semanal del negocio (Reto 04)

**Cerrado funcionalmente en desarrollo el 20 de octubre de 2026**, con las confirmaciones del usuario y las pruebas reales del agente de planificación de guardado, actualización, validaciones, semana cerrada, recarga, nueva sesión y aislamiento entre dos cuentas. La evidencia automatizada, los ejecutores, el estado final de las cuentas y los límites se registran en `docs/PROJECT_CONTEXT.md`. No se validaron producción ni concurrencia del motor cloud. El usuario autorizó revisar, hacer commit y push del Reto 04; el resultado de la publicación se verifica y comunica en el chat de planificación.

- `weeklySchedules` contiene una configuración por negocio, relacionada mediante `businessId` e índice `by_businessId`. La mutación consulta ese índice e inserta o actualiza el mismo documento dentro de una transacción. El índice no es una restricción SQL de unicidad: la garantiza esta ruta de escritura transaccional, con los reintentos de Convex ante conflictos.
- `getMyWeeklySchedule` y `saveMyWeeklySchedule` autentican cada petición y resuelven el negocio desde `identity.subject`. Rechazan ausencia de sesión o negocio y no aceptan propietario, negocio ni identificador de horario del cliente.
- Convención: `dayOfWeek` ISO **1=lunes…7=domingo**, una entrada por día y orden persistido ascendente. `isOpen` indica atención. Las horas `start`/`end` son texto local **`HH:mm` de 24 horas, de `00:00` a `23:59`**, en la zona IANA del negocio; no representan fechas ni instantes UTC. Cada día abierto exige ambas horas y `end > start`. `24:00`, segundos, offsets e intervalos nocturnos se rechazan. En días cerrados ambas horas se normalizan a `null`, sin exigir horarios a sus controles deshabilitados.
- La semana completa se valida antes de escribir: un error no modifica ningún día. Se permite cerrar los siete. `null` como resultado de la consulta significa que todavía no existe configuración; una semana cerrada guardada sí devuelve documento. El montaje de la interfaz no guarda ni inventa horarios.
- El formulario reutiliza shadcn/ui, React Hook Form, Zod y el resolver, sin dependencias nuevas. Mantiene carga y guardado, errores por campo con foco, bloqueo de envíos rápidos y valores ante fallos. Después del éxito conserva la semana editable y muestra un único toast «Horario guardado» desde el Toaster global existente, sin mensaje inline duplicado.
- Las actualizaciones reactivas se aplican cuando el formulario está limpio. Si hay una edición o guardado pendiente se descarta esa actualización del formulario completo, sin mezclar días de dos versiones ni sobrescribir el borrador. Guardar envía la semana completa; entre editores simultáneos prevalece el último guardado confirmado. Recargar recupera la versión persistida.

No incluye múltiples tramos, excepciones, vacaciones/festivos, huecos, turnos concretos, reservas, agenda pública ni sincronización externa. No cambia el negocio ni los servicios.

## Consulta de opciones de horario (Reto 05)

En el dashboard se eligen un servicio propio y una fecha real `AAAA-MM-DD`. Convex obtiene por identidad el negocio, verifica que el servicio le pertenezca y deriva los resultados del horario semanal y su zona IANA. No recibe propietario, negocio, duración, zona ni reloj del cliente. No guarda huecos ni crea reservas.

Los comienzos avanzan 15 minutos desde la apertura, incluso si no está alineada al cuarto de hora. La duración determina el fin: 09:00–10:00 y 30 minutos producen 09:00–09:30, 09:15–09:45 y 09:30–10:00. El cierre exacto es válido; los comienzos pasados y finales posteriores quedan fuera. Se diferencian falta de servicios, semana sin guardar, semana/día cerrado y ausencia de opciones que quepan.

La acción de lectura usa el reloj del servidor, sin caché temporal ni `Date.now()` en una query. La UI actualiza cada 30 segundos y al recuperar foco/visibilidad o conexión; retira las opciones al vencer usando tiempo monotónico desde la respuesta, independientemente del reloj o zona del navegador. Editar los filtros oculta el resultado anterior. No hay toast de consulta.

`@js-temporal/polyfill` **0.5.1**, solo en el backend, permite rechazar horas inexistentes o repetidas sin desplazar ni elegir un offset implícito. La política acotada omite esos extremos y opciones que cruzan un cambio de offset; si apertura o cierre son ambiguos/inexistentes, no ofrece opciones para ese día y lo explica. La duración conserva minutos reales. El bucle tiene como máximo 96 candidatos y descarta duraciones excesivas antes de sumar timestamps.

La evidencia automatizada, de navegador real y de UI sintética se registra por separado en `docs/PROJECT_CONTEXT.md`. No incluye ocupación, reservas, agenda pública, excepciones ni etapas posteriores.

El **Reto 05 queda cerrado funcionalmente en desarrollo** tras la revisión estática del código y de las evidencias por el chat de planificación, sin nuevas pruebas ni confirmaciones manuales del usuario. Se conservan los límites documentados: aislamiento del nuevo endpoint y DST verificados en memoria o fixture, y segunda cuenta real no abierta en este reto. El usuario autorizó revisar el diff y, si es correcto, hacer commit y push; el resultado se verificará y comunicará en planificación.

## Archivos de esta etapa

- `app/page.tsx`: portada con estado real de sesión.
- `app/dashboard/page.tsx`: bienvenida y protección en servidor.
- `app/sign-in/[[...sign-in]]/page.tsx` y `app/sign-up/[[...sign-up]]/page.tsx`: formularios oficiales adaptados a la interfaz.
- `app/layout.tsx` y `app/globals.css`: proveedor existente, idioma, metadatos y estilos.
- `components/brand.tsx` y `components/site-shell.tsx`: marca y estructura compartidas.
- `components/auth-shell.tsx` y `components/auth-appearance.ts`: diseño con imagen lateral y estilos compactos compartidos por login y registro.
- `public/slotly-logo.png`: logo aportado por el usuario, adaptado al verde con fondo transparente mediante la herramienta integrada de edición de imágenes. Los prompts de edición están en `.impeccable/slotly-logo.prompt.txt` y embebidos como metadatos del PNG.
- `package.json` y `pnpm-lock.yaml`: traducción oficial de Clerk y comando de comprobación de tipos.
- `PRODUCT.md`, `DESIGN.md` y `.impeccable/design.json`: alcance confirmado y referencia visual de esta etapa.

`proxy.ts` y `.env.local` conservan la configuración previa.

## Iconos de la aplicación

El encabezado conserva `public/slotly-logo.png`, con nombre. Los iconos usan únicamente el calendario verde, con fuente en `public/slotly-mark.png`.

- `app/favicon.ico`: favicon con tamaños 16, 32, 48, 64 y 256 px.
- `app/icon.png`: icono PNG transparente de 512 px.
- `app/apple-icon.png`: icono de 180 px para accesos directos de Apple, sobre el fondo claro de Slotly.
- `public/icons/icon-192.png` y `public/icons/maskable-icon-512.png`: variantes para navegadores y lanzadores móviles.
- `app/manifest.ts`: nombre, colores e iconos del acceso directo de la app.

Next.js genera las etiquetas de iconos y manifiesto mediante sus convenciones de archivos. La configuración global añade el nombre de aplicación y el color verde del navegador. Los prompts y detalles de exportación están en `.impeccable/slotly-icon.prompt.txt`. No se añadieron dependencias ni funcionalidad sin conexión.

## Comprobaciones

```sh
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Para servir la compilación: `pnpm start`.

`pnpm test` ejecuta 177 casos en memoria: los 131 previos y 46 nuevos del Reto 05. Los nuevos cubren generación, reloj controlado, fechas, DST, autorización y argumentos manipulados; los anteriores comprenden 75 del negocio y servicios y 56 del horario semanal (31 de funciones Convex y 25 de Zod). Comprueban autenticación, ausencia de negocio, relaciones, tipos, límites, nombres normalizados, propietarios separados, solicitudes manipuladas y paginación; para horarios, ausencia frente a semana cerrada, consulta desde otra identidad de sesión sintética, horas locales, actualización del mismo documento sin duplicados y rechazo atómico de semanas inválidas, conservando perfil y servicios. Las zonas inventadas se comprueban en los tests del negocio; el esquema del formulario comprueba además que la zona pertenezca a las opciones. Las identidades son simuladas; estas pruebas no escriben datos remotos ni comprueban la firma de Clerk o el motor real de concurrencia.

La comprobación inicial `pnpm test:local` verificó esas invariantes contra el backend **local**, incluyendo diez solicitudes HTTP simultáneas mediante clientes separados y un token falso. Usa identidades administrativas sintéticas y deja dos perfiles de prueba con propietarios `slotly_test_...` en la base local por ejecución. No usa sesiones de Clerk ni equivale a una prueba de login; se niega a ejecutarse fuera de `http://127.0.0.1:3210`. Las credenciales administrativas se leen del archivo local excluido de Git y no se imprimen. Con la configuración cloud actual, este script no es parte del arranque ni debe ejecutarse contra el perfil real. `pnpm test` sigue siendo la comprobación automática habitual, aislada de los datos remotos.

## Prueba manual con una cuenta real

1. Sin sesión, entra directamente a `/dashboard`: debe llevarte a `/sign-in` sin mostrar el dashboard.
2. Desde `/sign-up`, regístrate con un correo que controles, completa la verificación que solicite Clerk y comprueba que llegas directamente a `/dashboard`.
3. Comprueba la bienvenida en `/`, tu nombre si está disponible y el menú de cuenta.
4. Abre `/dashboard` y actualiza la página: debes conservar el acceso.
5. Desde el menú de cuenta, gestiona tu perfil y cierra sesión. Debes volver a `/` y perder el acceso a `/dashboard`, incluso al regresar con el navegador.
6. Inicia sesión con correo y contraseña y comprueba que llegas directamente a `/dashboard`, incluso al comenzar en `/sign-in` sin un destino previo. Si existe un destino protegido explícito, comprueba que se conserva.
7. Prueba Google si está habilitado en Clerk. Completa personalmente las credenciales y verificaciones de Google.

Para el Reto 02, con una cuenta real:

1. Espera la comprobación de acceso y consulta: el formulario solo debe aparecer cuando se confirme que no hay negocio.
2. Intenta un nombre solo con espacios. Debe aparecer un error asociado al nombre y mantenerse el formulario sin crear un negocio. Las zonas inventadas o fuera de las opciones se verifican mediante los tests descritos en «Comprobaciones»; el selector cerrado no admite escritura libre.
3. Guarda un nombre real y una zona como `America/Montevideo`; debe aparecer el perfil guardado.
4. Recarga y verifica que vuelve el mismo perfil. Cierra sesión, vuelve a entrar y repite la comprobación.
5. En otra cuenta, confirma que no aparece el perfil anterior y que puede crear el suyo. Regresa a la primera cuenta y confirma que conserva su negocio.
6. Sin sesión, `/dashboard` debe seguir llevando a `/sign-in`. Las llamadas directas de Convex sin token deben rechazarse.

Para el Reto 03, sin crear datos descartables en cuentas reales:

1. Con un negocio existente, comprueba el estado vacío y crea varios servicios que quieras conservar, con distintas duraciones positivas. Deben aparecer en su lista.
2. Nombre vacío o con espacios y duración vacía, cero, negativa o fraccionaria deben mostrar errores de campo sin guardar.
3. Recarga y vuelve a iniciar sesión: deben recuperarse los mismos servicios y el mismo perfil.
4. Con la segunda cuenta, comprueba que la lista es independiente y crea sus propios servicios. Al volver a la primera, cada lista debe seguir separada.
5. Comprueba la continuidad del perfil, cierre de sesión y redirección de `/dashboard` a `/sign-in`. El rechazo de peticiones manipuladas y sin negocio se prueba en memoria; las llamadas cloud sin sesión se verificaron sin crear datos.

Para el Reto 04, con horarios propios que quieras conservar:

1. Guarda una semana con días abiertos y cerrados: un único toast y la configuración editable. Recarga y vuelve a iniciar sesión: misma semana y zona IANA.
2. Modifica un tramo, cierra un día y guarda repetidamente: actualiza la misma configuración completa, con un solo documento por negocio.
3. Día abierto sin ambas horas, horas iguales o cierre anterior a apertura: errores asociados y con foco, sin alterar la semana guardada. Una semana con los siete días cerrados sí debe guardarse y recuperarse como configuración existente.
4. Comprueba la separación de horarios entre dos cuentas y la continuidad de sus perfiles y servicios. Sin sesión, `/dashboard` sigue redirigiendo a `/sign-in`.

Para el Reto 05, las pruebas reales son de lectura: consultar un día abierto con los servicios existentes, comprobar paso de 15 minutos y duración, probar día cerrado y fecha pasada y repetir con otra zona del navegador. Usar los tests en memoria para escenarios que exigirían cambiar datos reales. No crear servicios ni modificar horarios para facilitar estas pruebas.

La evidencia ejecutada y los casos pendientes se registran en `docs/PROJECT_CONTEXT.md`. No se incluyen citas, reservas, comprobación de ocupación, calendarios externos, pagos ni notificaciones por correo u otros canales externos. La confirmación de UI mediante toast se mantiene para las escrituras existentes.

Documentación de referencia: [Convex con Clerk](https://docs.convex.dev/auth/clerk) y [runtime de Convex](https://docs.convex.dev/functions/runtimes).
