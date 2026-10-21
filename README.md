# Slotly

Plataforma de citas y reservas para profesionales y negocios. La etapa actual incluye autenticación con Clerk, perfil y servicios, horario semanal, disponibilidad, creación y consulta de citas y cancelación segura de citas propias futuras con historial en Convex: un negocio por cuenta, con un único propietario y varios servicios.

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

Las páginas y la estructura conservan sus Server Components. El perfil y el formulario son Client Components, con el proveedor oficial `ConvexProviderWithAuth` y un adaptador del `useAuth` oficial de Clerk, dentro del proveedor existente de Clerk y limitado al dashboard. El adaptador conserva la obtención oficial de credenciales y permite reintentar acceso sin recrear el cliente ni desmontar formularios; Convex confirma la autenticación en el servidor. El formulario utiliza componentes reales de shadcn/ui adaptados al tema de Slotly, React Hook Form y Zod.

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

## Reto 06: citas privadas

Desde «Agenda», consulta todas las citas de una fecha sin elegir servicio. «Nueva cita» abre un panel con fecha heredada de la agenda; al elegir servicio o cambiar fecha se cargan automáticamente los horarios. Confirma uno con el nombre del cliente. La lista diaria comprende todos los servicios del negocio. Una cita bloquea su intervalo para toda la agenda; dos citas consecutivas son válidas. El backend vuelve a comprobar servicio propio, fecha/inicio futuros, horario vigente, paso de 15 minutos desde apertura, cierre, zona y DST. Calcula el fin y comprueba los solapes dentro de la misma mutación que inserta. No confía en negocio, propietario, zona, duración o fin proporcionados por el cliente.

Las citas guardadas conservan sus instantes al modificar la semana. Las opciones se actualizan al cambiar servicios/semana/citas, cada 30 segundos y al recuperar foco/conexión; una opción vencida se retira con reloj monotónico. Ante ocupación concurrente se conserva el nombre, se indica el conflicto y se actualizan las opciones. El único toast «Cita confirmada» se emite después del guardado. No incluye edición, cancelación, reprogramación, agenda pública, módulo de clientes, contactos ni notificaciones externas.

El **Reto 06 queda cerrado funcionalmente en desarrollo**, sincronizado solo con `dev/slotly`, tras la revisión estática y la prueba completa con Clerk/cloud ejecutadas por el agente de planificación. Con autorización expresa del usuario, planificación confirmó una cita del servicio 2 (30 min) para el **26 de octubre de 2026, 09:30–10:00 America/Montevideo**, y comprobó persistencia tras recarga y bloqueo de solapes en ambos servicios. La evidencia de implementación, la escritura real posterior y sus límites se distinguen en `docs/PROJECT_CONTEXT.md`. No se probaron carreras cloud. El usuario autorizó posteriormente revisar el diff y, si es correcto, hacer commit y subir el Reto 06 a GitHub; el resultado de la publicación se verificará y comunicará en planificación.

## Archivos de esta etapa

- `app/page.tsx`: portada con estado real de sesión.
- `app/dashboard/page.tsx`: entrada privada y protección en servidor; `DashboardWorkspace` organiza Agenda, Servicios, Horario y Negocio.
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

`pnpm test` ejecuta **348 casos en memoria, en 13 archivos** (306 anteriores y 42 de reprogramación). Incluye creación/listado, normalización, autorización, argumentos manipulados, todos los tipos de solape, agenda compartida entre servicios, horarios obsoletos, paso, cierre, fechas, zona y DST, así como conservación de instantes al cambiar la semana o la duración. Agenda verifica años lejanos, filtros combinados, rangos, paginación con páginas intermedias vacías e identidades aisladas; también Hoy con instantes a ambos lados de medianoche y distintas zonas, presets, URL actuales/anteriores y conservación entre vistas. Cancelación comprueba timestamp de servidor, inicio exacto, idempotencia incluso después del inicio, pertenencia, liberación entre servicios, reglas vigentes y 1600 canceladas sin ocultar una confirmada. Las llamadas simultáneas de `convex-test` verifican el contrato del harness; por sí solas no demuestran OCC del motor real. Las identidades son sintéticas; estas pruebas no escriben datos remotos ni comprueban firmas de Clerk.

`pnpm test:appointments:engine` ejecuta las pruebas de citas contra un motor **real aislado** de Convex/SQLite: crea directorio, configuración, clave de prueba, puertos y datos sintéticos temporales. Reutiliza únicamente el binario oficial cacheado por el CLI (o el indicado en `SLOTLY_CONVEX_BACKEND`) y las dependencias instaladas. No lee `.env.local` ni `.convex`, no cambia el destino de la app ni provisiona cloud. Tres rondas, veintiún escenarios: **150 solicitudes en 63 carreras** con barrera de salida, clientes HTTP separados y `skipQueue`. Conserva las seis carreras de creación y añade doble cancelación, cancelación frente a creación, dos creaciones por un intervalo liberado, servicios distintos, consecutivas y negocios independientes. Añade nueve escenarios de reprogramación: destinos distintos desde la misma versión, repetición al mismo destino, dos citas al mismo destino, crear frente a mover, cancelar frente a mover, reservar el intervalo anterior, destinos parcialmente solapados, consecutivos y negocios independientes. Verifica documentos finales, revisiones, estados, intervalos y timestamp estable; además recorre 1600 canceladas y una confirmada en 22 páginas sin duplicados, comprueba disponibilidad/conflictos, persistencia tras reinicio y que cerrar la semana no altera citas. El generador de historial existe solo en el backend temporal y no se sincroniza con cloud. Detiene el proceso y elimina solo su directorio propio al terminar. `--report <ruta absoluta>` conserva un informe sin credenciales. Las identidades administrativas de prueba no son sesiones de Clerk.

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

Durante la implementación del Reto 06, las escrituras se probaron con datos sintéticos en memoria, motor local aislado y fixture de UI; las cuentas reales se verificaron en modo lectura y no se dejaron citas sintéticas. Posteriormente, con autorización expresa del usuario, el agente de planificación creó y conservó **una cita** para «Prueba de validación Reto 06», servicio 2, el **26 de octubre de 2026 de 09:30 a 10:00 America/Montevideo**. Verificó toast único, limpieza/foco, listado reactivo, persistencia tras recarga y ocupación compartida con el servicio de 46 minutos. Perfil, servicios y semana permanecieron intactos; la segunda cuenta no se abrió ni se modificó. Los **234 tests**, las **60 solicitudes/18 carreras locales**, lint, tipos y build siguen siendo pruebas ejecutadas por implementación y no se repitieron en planificación ni en esta reconciliación documental. La evidencia y sus límites están en `docs/PROJECT_CONTEXT.md`. No se incluyen edición/cancelación/reprogramación de citas, agenda pública, calendarios externos, pagos ni notificaciones por correo u otros canales externos.

Documentación de referencia: [Convex con Clerk](https://docs.convex.dev/auth/clerk) y [runtime de Convex](https://docs.convex.dev/functions/runtimes).


## Mejora de experiencia del espacio privado (antes del Reto 07)

`/dashboard` abre una única Agenda paginada con **Hoy** en la zona IANA del negocio. Los enlaces `?vista=servicios`, `?vista=horario` y `?vista=negocio` permiten acceso directo; los filtros aplicados se conservan entre las cuatro vistas, al recargar y al recorrer el historial. La API nativa de historial, integrada con `useSearchParams`, permite atrás/adelante sin desmontar los formularios. Todas las vistas usan la misma ruta protegida en servidor, y los endpoints actuales mantienen su autorización propia.

La navegación superior concentra cuatro destinos reales; en móvil pasa a una segunda fila con icono y etiqueta. Nueva cita y Nuevo servicio muestran sus formularios bajo demanda. Cerrar el panel o cambiar de vista conserva el borrador en memoria de esa pestaña. Salir mediante enlaces muestra un diálogo accesible; recargar o cerrar la pestaña usa el aviso nativo del navegador. No hay almacenamiento persistente de borradores. Horario guarda explícitamente la semana completa y anuncia cambios pendientes, guardado y errores. Negocio sigue siendo consulta del perfil existente o creación inicial, sin edición.

El lote anterior de UX/UI y búsqueda ya figura publicado en `main` y `origin/main`, commit `d1b8eba043da9b726289d6774ed37d04205504fe` (`feat: improve dashboard UX and appointment search`), base limpia observada al comenzar el refinamiento. La entrega inicial de Agenda unificada se cerró sin commit ni push. El usuario autorizó posteriormente revisar el diff y, si es correcto, hacer commit y subir esta mejora a GitHub; planificación verificará y comunicará el resultado de la publicación, todavía no acreditado aquí. Se conserva la verificación de implementación de **278 tests**, lint, tipos y build, la revisión visual independiente `ship` y la lectura autenticada de la única cita existente sin escribir datos. Evidencia, ejecutores y límites al final de `docs/PROJECT_CONTEXT.md`; esta reconciliación documental no repite pruebas. No se inicia el Reto 07 ni se despliega a producción.

### Consultar Agenda y buscar sin recordar la fecha

Agenda tiene un único listado y seis controles: nombre del cliente, servicio, período, Desde, Hasta y Buscar. Nombre del negocio y Nueva cita comparten la cabecera compacta; no hay modos, botón Limpiar ni banda visible de Resultados/contador. El h1, las ayudas, la zona, el contexto temporal y el contador siguen disponibles para lectores de pantalla. Todos los controles propios heredan **36px** de las primitivas; los filtros pasan de seis a tres, dos o una columna según el ancho del contenedor, también al abrir el panel.

**Hoy** muestra hoy en Desde y Hasta. **Todas** deja ambos vacíos y consulta cualquier fecha, sin antigüedad máxima. **Próximas** muestra Desde hoy e incluye todo ese día y los posteriores; **Pasadas** muestra Hasta el día anterior. El cliente actualiza el día cada 30 segundos y al recuperar foco, visibilidad o conexión. Los períodos representan días completos en la zona IANA del negocio. Editar cualquier fecha cambia a **Personalizado**, que exige al menos un límite, admite extremos abiertos e incluye ambos días. Buscar o Enter aplica los filtros combinados; un rango invertido muestra error y conserva la consulta aplicada.

El nombre admite un **fragmento literal en el mismo orden**, sin distinguir mayúsculas ni marcas diacríticas y unificando espacios. No hay tolerancia a erratas ni búsqueda de palabras reordenadas. La normalización se aplica en el servidor sobre páginas acotadas del índice propio; no se utiliza un índice de texto ni se descarga toda la tabla. Cada solicitud revisa una página: si quedan páginas, «Cargar más citas» o «Seguir buscando» permite continuar. Una página sin coincidencias no agota la búsqueda. «Sin coincidencias» aparece únicamente al terminar el recorrido; los recuentos intermedios se identifican como citas cargadas.

El orden es ascendente por fecha e inicio. Cada resultado muestra fecha completa, horas en la zona del negocio, cliente, servicio y **Ver día**, que aplica un rango exacto de un día en el mismo listado y conserva nombre, servicio y borrador. La lista sigue inmediatamente a los filtros. Las páginas pendientes mantienen una explicación visible y una acción para continuar; no se presenta un recuento parcial como total.

Las URL nuevas usan `cliente`, `servicio`, `periodo`, `desde` y `hasta`. Hoy omite `periodo` y deriva sus fechas al consultar; Todas usa `periodo=todas`; los límites solo se escriben para Personalizado. Por ejemplo, `/dashboard?periodo=todas&cliente=ana` busca sin conocer el día. Aplicar filtros o Ver día retira `modo`, `fecha` y `vista`; elegir otro período elimina los límites anteriores. Los enlaces antiguos con `fecha` sin filtros temporales representan ese día como Personalizado; `modo=listado` sin período ignora la fecha antigua y representa Todas. Los límites explícitos prevalecen sobre un preset válido y se muestran como Personalizado, sin intersección oculta.

Una cita nueva hereda fecha solo cuando el filtro aplicado representa un único día. Con Todas o un rango de varios días empieza vacía. El borrador existente conserva servicio, fecha, inicio y cliente al filtrar, usar Ver día, navegar o cerrar el panel. La consulta amplia y sus dos índices ya existían en la base publicada; este refinamiento traduce Hoy/Personalizado a la lectura existente con período Todas y límites, sin cambiar Convex ni desplegarlo. La lectura diaria existente solo conserva la invalidación de disponibilidad del panel; no renderiza otro listado. Se mantienen autenticación, recuperación y creación transaccional. No se añaden edición, cancelación ni otras escrituras.

## Reto 07: cancelar citas propias futuras

La mejora de Agenda anterior ya está publicada en `main`/`origin/main` en `82d47be205f430534db512257c8fbcb2e0635936`, base limpia comprobada al empezar este reto. Los estados de publicación pendiente anteriores describen su cierre histórico.

**Cancelar cita** aparece en confirmadas propias futuras y abre un diálogo con cliente, servicio, fecha, intervalo y zona IANA. La mutación vuelve a verificar identidad, pertenencia e inicio usando el reloj del servidor. Cambia a `cancelled`, conserva documento/instantes e incorpora `cancelledAt`. Repetir devuelve `already_cancelled` y el timestamp original, sin escritura, incluso después del inicio original. El toast de éxito corresponde solo a una transición nueva; errores y repeticiones conservan contexto. Cancelada y su timestamp permanecen consultables en el listado paginado.

Creación y disponibilidad leen solo confirmadas mediante el índice de negocio/fecha/estado. Las canceladas nunca consumen el límite diario de activas ni ocultan conflictos; el historial se pagina por separado. Cancelar libera para todos los servicios, pero reutilizar exige horario vigente, futuro, paso, duración, IANA/DST y ausencia de otra confirmada. Se conserva fin excluido y OCC en la mutación transaccional. La disponibilidad se invalida sobre el día del borrador, aunque los filtros muestren otra fecha.

**Cierre inicial de implementación (histórico):** pasaron **306 tests**, lint, tipos y build; el motor real local aislado acreditó **96 solicitudes / 36 carreras / tres rondas** y el historial denso. La UI se ejercitó con siete casos de transporte sintético, teclado/foco y móvil 390/320px; revisión independiente `ship`. Solo se sincronizó esquema/funciones con `dev/slotly`. La comprobación cloud de ese pase abrió/cerró el diálogo sin confirmar y dejó la cita real confirmada, respetando la prohibición inicial de cancelarla. No se acreditó entonces cancelación E2E cloud ni carreras cloud. El fixture se retiró de la app y no se dejaron datos sintéticos remotos. Esta evidencia se conserva separada de la prueba posterior de planificación.

Quedan fuera editar/reprogramar/reactivar, eliminar físicamente, cancelación pública o por clientes, motivos/políticas, emails, pagos y otras etapas. La entrega inicial de implementación terminó sin commit, push, PR ni producción y quedó lista para revisión en planificación.

**Cierre funcional en desarrollo — 20 de octubre de 2026:** tras la revisión estática, el usuario autorizó expresamente a planificación a cancelar únicamente «Prueba de validación Reto 06» para completar la prueba con Clerk y Convex cloud. Planificación ejecutó **una cancelación real, cero creaciones y cero borrados**, con sesión existente y UI localhost conectada a `daniel-caluff:slotly:dev/slotly` (`determined-poodle-377`). La cita del **26/10/2026, 09:30–10:00 America/Montevideo**, servicio 2, está **Cancelada** y debe conservarse así. El historial mantiene una fila, cliente, servicio, instantes y timestamp estable en una pestaña nueva y tras recargar; Cancelar no reaparece y el foco volvió a Ver día.

La disponibilidad se actualizó reactivamente y persistió tras recargar: el servicio de 30 minutos pasó de **30 a 33** opciones y el de 46 minutos de **26 a 31**, con **09:30–10:00** y **09:30–10:16** libres respectivamente. No se confirmó otra cita ni se modificaron perfiles, servicios o semana. Se cerraron las dos pestañas propias, preservando las originales y la sesión. El toast transitorio no se capturó; no se acredita otro resultado de toast único cloud ni se considera un fallo.

El **Reto 07 queda cerrado funcionalmente en desarrollo**. Los 306 tests, 36 carreras/96 solicitudes y siete casos UI son pruebas previas de implementación, no repetidas; OCC sigue acreditada en motor real local, sin carreras cloud. No se añaden pruebas de autenticación completa, otra cuenta, red fallida, lector de pantalla o producción. Evidencia de planificación en `C:/Users/dcalu/.codex/visualizations/2026/10/20/01a15620-54fe-7153-a4ec-ca62821d3c15/reto07-cloud/` (`verification.json` y cinco capturas); detalle y ejecutores en `docs/PROJECT_CONTEXT.md`. Esta reconciliación solo actualiza estos dos Markdown y comprueba el diff; no cambia código, pruebas, configuración, backend, datos o informes anteriores ni hace commit, push, PR o despliegue.

**Autorización posterior de publicación — 20 de octubre de 2026:** el usuario indicó en planificación: **«Perfecto, revisa el diff y, si está todo correcto, haz el commit y sube el reto 07 a GitHub»**. Planificación está realizando la revisión final y hará commit/push si es correcto; verificará y comunicará la publicación. Los estados anteriores sin commit/push son históricos, no una prohibición vigente. Se mantienen el cierre funcional en desarrollo, la cita real Cancelada y las evidencias con sus ejecutores y límites. No se anticipa un hash ni el éxito de la publicación; este apunte solo actualiza documentación y comprueba el diff, sin pruebas nuevas ni commit/push/PR o despliegue desde este chat.

## Reto 08 — Reprogramación privada

Reprogramar permite cambiar fecha e inicio de una cita propia confirmada cuyo inicio aún es futuro. Conserva ID, cliente, servicio y estado; calcula el fin con la duración vigente en el servidor y registra la última reprogramación. La consulta específica excluye únicamente esa cita de la ocupación, permitiendo un solape consigo misma. La mutación revalida propiedad, estado, futuro, versión, semana, zona IANA/DST, paso desde apertura, cierre y otras confirmadas de todos los servicios en una sola transacción. Un error conserva la cita completa.

La versión inicial de documentos anteriores se normaliza a 0, sin backfill. Reprogramar y cancelar requieren la versión vista; una pestaña antigua no puede mover dos veces ni cancelar un horario nuevo sin revisarlo. El formulario conserva su contexto inicial aunque reciba datos reactivos. Un cambio remoto se explica y exige «Revisar horario actualizado». Reintentar el último movimiento idéntico devuelve `already_rescheduled`; el mismo intervalo devuelve `unchanged`; ninguno escribe ni emite otro éxito. Una petición vieja después de otro movimiento devuelve conflicto. La cancelación ya realizada mantiene su idempotencia y timestamp incluso tras el inicio.

La Agenda conserva filtros, borradores y URL. Un movimiento fuera del rango explica la nueva fecha y ofrece Ver día en el mismo listado. El diálogo conserva foco/teclado/Escape, errores en contexto, bloqueo inmediato y controles de 36px. Solo una transición efectiva emite «Cita reprogramada.».

Durante la implementación se verificaron 348 tests en 13 archivos, motor local real aislado (150 solicitudes/63 carreras/tres rondas), 18 casos UI con componentes reales y transporte sintético, más las comprobaciones de cierre registradas en `docs/PROJECT_CONTEXT.md`. Las carreras no certifican órdenes no observados ni reintentos internos del motor. El backend se sincronizó solo con el desarrollo existente. La implementación no escribió citas cloud y su pestaña de lectura redirigió a inicio de sesión. Ese pendiente inicial se resolvió posteriormente mediante la autorización y prueba real de planificación descritas debajo; las pruebas previas no se repitieron.

**Cierre funcional en desarrollo — 21 de octubre de 2026:** el usuario autorizó en planificación **«Perfecto, crea una cita de prueba con el servicio y la fecha que elijas y reprográmala con Clerk y Convex cloud. Comprueba que libera el horario original y ocupa el nuevo, y dime si ya podemos validar el reto 08»**. Planificación ejecutó la prueba con sesión Clerk real existente y destino público verificado `daniel-caluff:slotly:dev/slotly`, `determined-poodle-377`. Creó **una** cita «Prueba de validación Reto 08», servicio 2 (30 minutos), para el **26/10/2026, 09:30–10:00 America/Montevideo**, y la reprogramó **una** vez a **11:00–11:30** del mismo día. Se conserva **Confirmada**, con cliente y servicio y «Última reprogramación: 21/10/26, 10:14 a. m. · America/Montevideo».

Antes de crear había **33 opciones** de 30 minutos, con ambos horarios libres; tras crear quedaron **30**, con 09:30 ocupado y 11:00 libre. El preview propio de reprogramación devolvió **33**, excluyendo su propia ocupación. Tras mover hubo **30 opciones de 30 minutos y 26 de 46 minutos**, con **09:30 libre y 11:00 ocupado en ambos servicios**. Otra pestaña limpia y la recarga conservaron las dos filas, el horario y timestamp exactos, y la misma disponibilidad 30/26. La cita del Reto 06 permaneció Cancelada e intacta; no hubo duplicados visibles ni errores de consola. El AX de éxito mostró un toast, pero el contador DOM posterior llegó tras expirar y dio 0: no acredita otra prueba de unicidad cloud.

Planificación cerró sus dos pestañas propias y preservó originales, borradores y sesión. Realizó **una creación y un movimiento, cero cancelaciones y cero borrados**; la cita nueva se conserva Confirmada en **11:00–11:30**. Esta autorización ya cumplida no permite más escrituras. No se extrajeron IDs ni tokens cloud; ID y revisión exacta conservan su evidencia estática y del motor previo.

El **Reto 08 queda cerrado funcionalmente en desarrollo**, sin pruebas funcionales requeridas pendientes dentro del alcance aprobado. Los **348 tests, 150 solicitudes/63 carreras locales y 18 casos UI sintéticos**, lint, tipos y build son pruebas anteriores de implementación, no repetidas ni atribuidas a planificación. No se añaden carreras cloud, autenticación completa, fallo real de red, lector de pantalla ni carga de producción. Evidencia de planificación: `C:/Users/dcalu/.codex/visualizations/2026/10/21/01a15620-54fe-7153-a4ec-ca62821d3c15/reto08-cloud/` (`verification.json` y siete capturas); detalle de ejecutores y límites en `docs/PROJECT_CONTEXT.md`. Este cierre solo actualiza estos dos Markdown y comprueba el diff, sin modificar código, pruebas, diseño, configuración, datos, backend, automatizaciones o informes ni repetir pruebas. No hay commit/push/PR, producción ni Reto 09; la publicación del Reto 08 sigue sin autorizar.

Las acciones de cada cita se presentan ahora mediante un único botón **36×36** de tres puntos verticales (`EllipsisVertical` de Lucide). Su menú accesible de Radix incluye Ver día, Reprogramar y Cancelar cita con iconos y texto; canceladas o citas iniciadas solo ofrecen Ver día. Conserva filtros, borradores, URL y todas las reglas de los diálogos. Enter/Espacio/flechas/Escape y el cierre exterior siguen el comportamiento de Radix; abrir un diálogo entrega el foco correctamente y cerrarlo vuelve al botón de puntos o a un destino útil si la fila salió del filtro.

Esta mejora de presentación verifica **16 casos UI sintéticos**, reflujo a 390/320px, lint, tipos, build y diff. Planificación comprobó además el menú real con Clerk **solo en lectura**: botones de 36×36, opciones correctas por estado y apertura de Reprogramar seguida de Escape sin confirmar, con foco restaurado y cero errores de consola. Las dos citas reales permanecen intactas. Detalle, capturas y ejecutores en `docs/PROJECT_CONTEXT.md`; no se repitieron las pruebas de concurrencia ni la suite previa de 348 tests porque no cambia el backend. La ruta sintética se retiró y no se añadieron dependencias, sync, escrituras reales ni publicación.

**Autorización posterior — 21 de octubre de 2026:** el usuario indicó en planificación: **«Perfecto, revisa el diff y, si está todo correcto, haz el commit y sube el reto 08 con estas mejoras de UI a GitHub»**. Planificación revisará y publicará si todo es correcto, verificará y comunicará el resultado. Los cierres anteriores sin publicación son históricos, no una prohibición vigente; todavía no se acredita commit ni push. Este apunte solo actualiza documentación.
