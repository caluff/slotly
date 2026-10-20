# Contexto de Slotly

Última revisión del repositorio: **20 de octubre de 2026** (America/Montevideo).

**Estado más reciente — mejora UX/UI y búsqueda de citas previa al Reto 07:** implementadas y validadas en desarrollo sobre `main` publicado en `a7acce642240299a59b8b4cf26ee4e65bfd591b8`. Agenda conserva Día y añade Buscar citas sin conocer la fecha, con filtros combinables y paginación del conjunto propio. La lectura y dos índices nuevos se sincronizaron únicamente con `dev/slotly`; implementación encontró la cita existente solo por nombre y abrió su día, sin crear datos. Pasan **268 tests**, lint, tipos y build, con revisión visual independiente `ship` de esta extensión. Se mantienen los controles propios heredados de 36px y la reparación de recuperación transitoria ya verificada por planificación. El usuario autorizó posteriormente revisar el diff y, si es correcto, hacer commit y subir las mejoras de UX/UI y los filtros de Agenda a GitHub. La revisión final del lote y su publicación quedan a cargo de planificación, que verificará y comunicará el resultado; este registro aún no acredita un commit o push de esas mejoras. Evidencia por ejecutor, semántica y límites al final; el Reto 07 no se inició.

Las menciones anteriores a «sin commit/push» o a falta de autorización describen el estado histórico al cierre de aquellas tareas. La autorización posterior registrada abajo permite publicar este lote si su revisión resulta correcta; no autoriza producción ni nuevas funcionalidades.

**Estado actual del Reto 06 (20 de octubre de 2026):** cerrado funcionalmente **en desarrollo** tras la revisión estática y la creación completa con Clerk/cloud ejecutadas por el agente de planificación. La primera cuenta conserva una cita autorizada para el **26 de octubre de 2026, 09:30–10:00 America/Montevideo**, del servicio de 30 minutos. Base de implementación comprobada limpia en `main`, commit `8e646584b1209a6a2f2861176d92e03429ab6e6e` (`feat: add service availability preview`), con Retos 01–05 publicados. La evidencia al final distingue pruebas de implementación y pruebas posteriores de planificación; la concurrencia real sigue acreditada únicamente en motor local aislado. El usuario autorizó posteriormente revisar el diff y, si es correcto, hacer commit y subir el Reto 06 a GitHub. El resultado de la publicación se verificará y comunicará en planificación.

Última actualización documental: **20 de octubre de 2026** (America/Montevideo). Los **Retos 02 y 03 quedan cerrados funcionalmente en desarrollo**, con las pruebas reales reportadas por el usuario. El Reto 03 está publicado en `main` en `f4e38fb2e780dec86cab4b4f1f6ee9bb6302abdf`, comprobado al comenzar el Reto 04 con árbol limpio. El **Reto 04 queda cerrado funcionalmente en desarrollo**, con las confirmaciones del usuario y las pruebas reales del agente de planificación, incluido el aislamiento entre dos cuentas reales. El usuario autorizó posteriormente revisar, hacer commit y push del Reto 04; el resultado de la publicación se verifica y comunica en el chat de planificación. La evidencia y sus límites se registran al final.

**Estado actual del Reto 05 (20 de octubre de 2026):** cerrado funcionalmente en desarrollo tras la revisión estática del código y de las evidencias por el chat de planificación, sin nuevas pruebas de ejecución ni confirmaciones manuales del usuario. Está sincronizado únicamente con `dev/slotly`. La base se comprobó limpia en `2864ad7c12c094c5ec9679c6959aa37ac18e6000` (`feat: add weekly business hours`), con Retos 01–04 publicados en `main`. El usuario autorizó posteriormente revisar el diff y, si es correcto, hacer commit y subir el Reto 05 a GitHub; el resultado de la publicación se verificará y comunicará en planificación. La implementación, decisiones temporales, evidencia por ejecutor y límites se detallan al final. Esta reconciliación documental no hace commit, push, PR ni despliegue de producción.

## Propósito

Slotly será una plataforma SaaS de gestión de citas y reservas para profesionales y negocios. Es un proyecto personal de portfolio como Software Engineer para aprender y demostrar arquitectura, backend, autenticación, bases de datos, seguridad, integraciones, testing y despliegue.

No se busca construir otra tienda online ni otro marketplace. Stripe no será la pasarela de pago principal, ya que el usuario tiene experiencia previa con esa integración. Mercado Pago, Resend y otras tecnologías podrán explorarse cuando respondan a retos concretos; todavía no son integraciones comprometidas.

## Forma de trabajo acordada

- Comunicación en español, con explicaciones que permitan aprender y tomar decisiones.
- Desarrollo progresivo mediante retos pequeños, concretos y verificables.
- No iniciar nuevas funcionalidades ni otra etapa sin autorización del usuario.
- No preparar un roadmap detallado por iniciativa propia.
- Preferir soluciones modernas, mantenibles y seguras, evitando sobreingeniería y abstracciones innecesarias.
- Proponer criterios de aceptación y pruebas reales cuando corresponda.
- El usuario sabe programar y prefiere casos de prueba y resultados esperados concisos, sin instrucciones elementales de interfaz.
- El usuario quiere que el agente ejecute las comprobaciones disponibles, incluidas las pruebas reales dentro del alcance autorizado, reservando su intervención para autenticación u otra acción necesaria. Lo explicitó el 20 de octubre de 2026: «verifica tú que esté correcto, o sea haz las pruebas tú».
- Usar únicamente pnpm; no usar npm, yarn, bun ni OpenSpec.
- Se pueden cuestionar decisiones técnicas con argumentos. Una recomendación no sustituye una decisión aceptada.

Las instrucciones permanentes para agentes están en `AGENTS.md`. Este documento registra contexto y evidencia; su contenido debe contrastarse con el repositorio antes de continuar.

## Stack elegido y estado observado

| Tecnología | Evidencia al revisar |
| --- | --- |
| Next.js 16 con App Router | Instalado: **16.4.2**. Rutas en `app/` y configuración en `next.config.ts`. |
| React 19 | `react` y `react-dom` declarados en **19.3.0**; React instalado en esa versión. |
| TypeScript | Dependencia `^5`; configuración estricta en `tsconfig.json`. |
| Tailwind CSS 4 | Dependencias `tailwindcss` y `@tailwindcss/turbopack` declaradas en `^4`; importación, tema y estilos en `app/globals.css`. |
| shadcn/ui y formularios | Integrados: `components.json`, primitivas en `components/ui/`, React Hook Form **7.90.0**, Zod **4.6.7** y resolvers **5.9.2**. Se reutilizan en perfil y servicios. |
| Clerk | `@clerk/nextjs` instalado en **7.9.17** (declarado como `^7.9.17`) y `@clerk/localizations` en **4.23.0**. Integración presente en el código. |
| Convex | **1.47.0**. Destino activo cloud `daniel-caluff:slotly:dev/slotly`, con Clerk como emisor JWT, perfil en `businesses`, servicios en `services` y horario semanal en `weeklySchedules`. Retos 02, 03 y 04 cerrados funcionalmente en desarrollo. Backend local inicial conservado como respaldo. |
| pnpm | `packageManager` declara **pnpm@12.11.2**; existen `pnpm-lock.yaml` y `pnpm-workspace.yaml`. |

`next.config.ts` tiene habilitados Cache Components, Partial Prefetching y `experimental.agentFeedback`. Las lecturas de autenticación están dentro de límites `Suspense`. El bloque administrado por Next.js en `AGENTS.md` debe conservarse, y se deben leer las guías pertinentes de `node_modules/next/dist/docs/` antes de escribir código.

## Estado del repositorio

La revisión tomó el árbol de trabajo local completo, incluidos cambios sin commit. Al comenzar había un único commit inicial y cambios previos en archivos de aplicación, dependencias y documentación, además de rutas y componentes nuevos sin seguimiento. Esos cambios previos no fueron creados ni modificados por esta tarea.

Además de la aplicación, existen `README.md` con instrucciones y pruebas manuales, `PRODUCT.md` con contexto de producto, skills locales de Clerk en `.agents/` y capturas de interfaz generadas durante la verificación. Las capturas finales se guardaron fuera del código, en los artefactos locales de esta conversación (`C:/Users/dcalu/.codex/visualizations/2026/10/19/01a15615-0cc6-7c51-a0d7-5142b591d6db/slotly-auth/`). Los archivos de skills y las capturas no demuestran que los flujos completos de autenticación se hayan probado satisfactoriamente.

Durante la revisión se detectaron cambios concurrentes, ajenos a esta tarea, en `components/brand.tsx` y `PRODUCT.md`, además de nuevos archivos de diseño y logo (`DESIGN.md`, `public/slotly-logo.png` y metadatos en `.impeccable/`). El componente de marca ahora utiliza esa imagen. Se conservaron sin modificarlos.

En la revisión inicial no había pruebas automatizadas. El Reto 02 incorpora Vitest, `convex-test` y comprobaciones opcionales contra el backend local; la evidencia actual está al final de este documento.

## Reto 01: base de autenticación

El objetivo es que un usuario pueda registrarse por correo o Google, iniciar y cerrar sesión, mantener la sesión al recargar, acceder a un dashboard privado y ser enviado al login si intenta entrar sin autenticarse. Clerk debe resolver la autenticación; no se implementará un sistema propio.

El usuario informa que instaló Clerk mediante su CLI y configuró los métodos de autenticación en su dashboard. Esa configuración remota **no fue inspeccionada ni validada en esta revisión**.

### Implementación comprobada en el código

| Parte | Evidencia | Límite de lo comprobado |
| --- | --- | --- |
| Proveedor de autenticación | `app/layout.tsx` envuelve la aplicación con `ClerkProvider`, localización `esES`, apariencia personalizada y `afterSignOutUrl="/"`. | Integración estática; no confirma una sesión real. |
| Inicialización de sesión en solicitudes | `proxy.ts` exporta `clerkMiddleware()` y configura los matchers. | El proxy inicializa Clerk; la protección del dashboard se realiza en la página. |
| Registro | `app/sign-up/[[...sign-up]]/page.tsx` monta el componente oficial `SignUp`. | Correo, verificaciones y Google dependen de la instancia y requieren probarse. |
| Inicio de sesión | `app/sign-in/[[...sign-in]]/page.tsx` monta el componente oficial `SignIn`. | El usuario confirmó el 19 de octubre de 2026 que inició sesión y llegó directamente al dashboard. No indicó el método; el agente no ejecutó esa prueba. |
| Portada según sesión | `app/page.tsx` usa `auth()` y, si hay autenticación, `currentUser()`; muestra enlaces de acceso o bienvenida, `UserButton` y enlace al dashboard. | No se verificó su actualización durante un inicio o cierre de sesión real. |
| Dashboard privado | `app/dashboard/page.tsx` ejecuta `await auth.protect()` antes de `currentUser()` y del contenido privado. Contiene una bienvenida y un espacio reservado. | El agente comprobó la redirección sin sesión; el usuario confirmó que llega al dashboard tras iniciar sesión. Esto no acredita persistencia ni cierre de sesión. |
| Cierre de sesión | `UserButton` está presente en la portada autenticada y el dashboard; el proveedor configura el regreso a `/`. | Falta ejecutar el cierre y confirmar que el acceso privado se pierde. |
| Persistencia de sesión | Se delega al SDK de Clerk, sin almacenamiento manual de tokens en el código de la aplicación revisado. | Falta iniciar sesión y recargar para verificarla. |

`components/site-shell.tsx` y `components/brand.tsx` aportan la estructura y marca compartidas. La interfaz actual utiliza un tema claro con acentos verdes. El dashboard aún no gestiona negocios, servicios, disponibilidad, citas ni reservas.

### Variables y redirecciones

Se confirmó que `.env.local` existe, que Git lo ignora y que estas variables tienen valores no vacíos. No se copiaron claves a este documento ni se comprobó su validez contra Clerk.

| Variable | Configuración observada |
| --- | --- |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Presente; valor omitido. |
| `CLERK_SECRET_KEY` | Presente; valor omitido. |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | `/sign-up` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | `/` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | `/` |

El retorno efectivo después de iniciar sesión o completar el registro es `/dashboard`, configurado mediante `signInFallbackRedirectUrl` y `signUpFallbackRedirectUrl` en `ClerkProvider`. Esos props tienen prioridad sobre las variables locales de fallback, que conservan sus valores anteriores. Los destinos explícitos de `redirect_url` tienen prioridad sobre el fallback. No se modificó `.env.local`.

### Verificaciones ejecutadas el 19 de octubre de 2026

| Comprobación | Resultado |
| --- | --- |
| Inspección de páginas, componentes, proxy y configuración | Completada. |
| Presencia de variables locales y exclusión de `.env.local` en Git | Confirmadas; no se validaron credenciales remotas. |
| `pnpm lint` | Correcto, código de salida 0. |
| `pnpm typecheck` | Correcto, código de salida 0; generación de tipos de rutas y TypeScript sin errores. |
| `pnpm build` | Correcto, código de salida 0; compiló portada, dashboard, login y registro, con proxy. |
| Pruebas en navegador con cuentas reales | No ejecutadas en esta revisión. |
| Inicio de sesión y retorno directo al dashboard | Confirmados por el usuario el 19 de octubre de 2026. Método de acceso no especificado; no ejecutado por el agente. |

Estas comprobaciones prueban consistencia estática y compilación. No acreditan entrega de correos, OAuth de Google, persistencia, redirecciones en ejecución ni cierre efectivo de sesiones. Los comandos generan artefactos locales de Next.js y TypeScript; esta tarea no modificó el código fuente ni instaló dependencias.

### Criterios pendientes para cerrar este reto

El usuario ya confirmó el inicio de sesión y la llegada directa al dashboard. Los siguientes casos detallados no están cubiertos por esa confirmación y requieren evidencia específica; no constituyen un roadmap de nuevas funcionalidades.

1. **Acceso sin sesión:** en una ventana privada, abrir directamente `/dashboard`. Debe terminar en `/sign-in`, sin mostrar bienvenida privada ni datos del usuario.
2. **Registro por correo:** desde `/sign-up`, usar un correo controlado por el usuario, completar la verificación que pida Clerk y comprobar que se crea una sesión utilizable y se llega directamente a `/dashboard`.
3. **Inicio por correo:** cerrar la sesión y volver a entrar con el método de correo configurado en Clerk.
4. **Google:** comprobar que aparece la opción y completar registro o acceso real mediante Google, verificando el regreso a Slotly.
5. **Acceso autenticado y persistencia:** abrir `/dashboard` con sesión, recargar y confirmar que se mantiene el acceso y el usuario correcto.
6. **Cierre de sesión:** usar el menú de cuenta, confirmar el regreso a `/` y comprobar que `/dashboard` vuelve a requerir autenticación, también después de usar Atrás y recargar.
7. **Retorno a un destino explícito:** comprobar el regreso al destino protegido indicado en `redirect_url`. El retorno directo a `/dashboard` después de iniciar sesión ya fue confirmado por el usuario; el registro está configurado con el mismo fallback y queda pendiente probarlo con una cuenta nueva.

Debido a `Suspense` y al streaming, una redirección puede ocurrir después de comenzar una respuesta HTTP 200. Para evaluar la protección hay que comprobar el destino final y la ausencia de contenido privado, además del código HTTP.

**Conclusión de aquella revisión:** la base del primer reto estaba implementada y el usuario había confirmado el inicio de sesión con llegada directa al dashboard. No se atribuye esa prueba al agente ni se dan por probados otros métodos, registro, persistencia o cierre de sesión. La autorización posterior y la evidencia del Reto 02 se registran a continuación.

## Alcance de esta tarea documental

Se amplió el `AGENTS.md` existente, conservando el bloque administrado por Next.js, y se creó este archivo. No se implementaron funcionalidades, no se cambió la configuración remota de Clerk y no se preparó un roadmap detallado.

## Evidencia complementaria de la implementación de autenticación y marca

El 19 de octubre de 2026, la tarea de implementación de la etapa 1 ejecutó comprobaciones adicionales a la revisión documental anterior:

- `pnpm typecheck`, `pnpm lint` y `pnpm build` finalizaron correctamente, también tras integrar el logo.
- Con `next start` en el puerto local temporal 3001, solicitudes HTTP sin sesión y con una cookie de sesión inválida a `/dashboard` incluyeron la redirección a `/sign-in`, sin el texto privado del dashboard. La respuesta tuvo `Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate`. El HTTP 200 corresponde al streaming y no concede acceso.
- El navegador sin sesión activa terminó en `/sign-in?redirect_url=...dashboard` al abrir `/dashboard`. Se comprobó el destino de retorno y la ausencia de errores nuevos en la consola durante esa navegación. No se completó el acceso posterior.
- Los formularios oficiales visibles mostraron correo, contraseña y el botón de Google. Esto acredita la disponibilidad de esas opciones en la instancia en ese momento, sin acreditar el flujo OAuth ni la entrega de correo.
- Se buscaron coincidencias de la clave secreta configurada en los 27 archivos de `.next/static` de la compilación de autenticación: ninguna. No se imprimió la clave.
- Se revisó visualmente la interfaz en escritorio (1440px), tamaño intermedio y móvil (390px). Una revisión independiente no encontró problemas materiales en las capturas y fuentes revisadas.
- El usuario pidió conservar su logo de calendario y palabra Slotly, eliminar el fondo y adaptar el calendario al verde de la app. Está integrado en `public/slotly-logo.png`, con canal alfa verificado, y se usa en el encabezado compartido. `DESIGN.md` y `PRODUCT.md` registran esta decisión.

El usuario confirmó posteriormente el inicio de sesión y la llegada directa al dashboard, sin indicar el método. Los casos específicos de registro con verificación, correo, Google, bienvenida, gestión de cuenta, persistencia y cierre de sesión requieren evidencia propia antes de considerarlos validados de extremo a extremo. No se modificó `.env.local` ni se añadió funcionalidad de etapas futuras.

## Diseño del login inspirado en la referencia aportada

El 19 de octubre de 2026, el usuario pidió que el login adoptara la distribución de su imagen de referencia, conservando los estilos de Slotly. Eligió expresamente una **fotografía de un espacio de trabajo** para el panel derecho.

- `/sign-in` usa un panel con dos columnas iguales desde 1024px: marca y formulario a la izquierda, fotografía grande a la derecha. Se conservan los fondos claros, verdes y tipografía Geist existentes.
- En tamaños menores se oculta la fotografía decorativa y se prioriza el formulario, con un ancho máximo de 384px. La página puede crecer con el contenido y los pasos de Clerk.
- Se conserva el componente oficial `SignIn`, integrado sin tarjeta flotante, con controles de altura mínima 48px y Google después del acceso por correo. La localización del paso inicial muestra «Vuelve a tu espacio» e «Inicia sesión para continuar en Slotly.»; los demás pasos conservan sus textos oficiales.
- La fotografía se generó con la herramienta integrada ImageGen y se guardó en `public/login-workspace.png`. El prompt exacto y la procedencia están en `docs/assets/login-workspace.prompt.txt`. Se sirve mediante `next/image` con tamaños adaptados a la columna; no depende de una URL externa.
- Se actualizaron las reglas visuales de login en `DESIGN.md`. El diseño del registro se conserva. Este cambio no añadió dependencias ni modificó `.env.local`, el proxy, la protección del dashboard o la configuración remota de Clerk.
- Se conservaron cambios concurrentes en marca, iconos, metadatos y configuración de redirección del proveedor. No deben atribuirse a este trabajo de diseño.

### Verificación de este cambio

- `pnpm lint`, `pnpm typecheck` y `pnpm build`: correctos. La revisión mecánica de diseño de las dos fuentes TSX modificadas finalizó sin hallazgos.
- Se inspeccionó el login compilado con `next start` en el puerto temporal 3001 a 1440, 1024, 768, 390 y 320px. Ningún ancho presentó desbordamiento horizontal; la fotografía solo apareció desde 1024px. Las capturas de escritorio y móvil están en `C:/Users/dcalu/.codex/visualizations/2026/10/19/01a15626-dcd3-7792-a584-964720d2ba80/login/`.
- Se comprobó que el enlace para saltar al contenido recibe el primer foco y que la navegación de teclado recorre marca, correo, acción principal, Google y registro con foco visible. La navegación a `/sign-up` mostró el formulario oficial existente.
- Una visita sin sesión a `/dashboard` terminó en `/sign-in` conservando `/dashboard` como destino de retorno. No hubo excepciones de página en las navegaciones comprobadas.
- Estas comprobaciones verifican la interfaz y navegación, sin completar acceso, recuperación, registro ni OAuth con una cuenta real. Esas pruebas de autenticación siguen pendientes.

### Iconos de aplicación

Por solicitud del usuario, el favicon y los iconos de acceso directo usan solo el calendario verde, sin la palabra Slotly. Se reemplazó `app/favicon.ico` y se añadieron `app/icon.png` (512px), `app/apple-icon.png` (180px), la variante de 192px y la variante maskable de 512px en `public/icons/`, con fuente en `public/slotly-mark.png`.

`app/manifest.ts` registra los iconos, nombre y colores. El layout añade el nombre de aplicación, el título para Apple y `themeColor`. Se usan las convenciones de metadatos de Next.js; el encabezado conserva el logo completo. No se añadieron dependencias ni comportamiento sin conexión.

Verificado: tipos, lint y build correctos; `/favicon.ico` respondió HTTP 200 con cinco imágenes válidas (16, 32, 48, 64 y 256px); los PNG y el manifiesto respondieron HTTP 200 con dimensiones correctas. El HTML enlazó favicon, icono PNG, Apple y manifiesto. El símbolo maskable se encuentra dentro del círculo seguro del 80%.

### Retorno al dashboard y confirmación manual reportada

El usuario autorizó desde «Retomar planificación de Slotly» un único ajuste de autenticación: después de iniciar sesión por correo o Google, ir directamente a `/dashboard`. Se configuró `signInFallbackRedirectUrl="/dashboard"` en el proveedor existente, conservando `redirect_url` cuando tiene un destino explícito. No se añadieron redirecciones forzadas, no se modificó `.env.local` y se conservó el rediseño de acceso que se desarrolla en paralelo. En ese ajuste, el registro mantuvo su fallback anterior; se actualizó posteriormente como se indica al final de este documento.

El usuario informó literalmente: «ya hice la prueba y está correcto». Esta confirmación se registra como prueba manual reportada por el usuario; no se especificaron casos, métodos ni pasos y no se atribuye su ejecución al agente. No acredita por sí sola la nueva redirección, autorizada después de esa confirmación.

Posteriormente, el 19 de octubre de 2026, el usuario confirmó de forma específica: «Ya probé el inicio de sesión y me lleva directamente al dashboard». Esta segunda confirmación sí valida, como prueba manual reportada por el usuario, el inicio de sesión y el retorno directo tras el ajuste. No se indicó si usó correo o Google, ni se confirmaron otros casos de autenticación.

La preferencia de colaboración queda registrada en `AGENTS.md`: «Retomar planificación de Slotly» se reserva para planificación y aprendizaje; las implementaciones acordadas se realizan en otro chat destinado a cambios. Esto permite continuar el trabajo ya autorizado en los chats de implementación.

### Cabecera compacta

Por solicitud del usuario se redujo la altura mínima de la barra superior compartida de 96px a 64px. El logo pasó de 144/176px a 112/128px (móvil/escritorio), manteniendo su proporción y ajustando `sizes` de `next/image`. No se añadió un sidebar ni se modificó el contenido de las páginas.

Comprobaciones posteriores al ajuste de retorno y cabecera: `pnpm typecheck`, `pnpm lint` y `pnpm build` correctos. Se verificaron los tamaños de cabecera y logo en el HTML compilado. La respuesta pública de `/sign-in?redirect_url=%2Fdashboard` fue HTTP 200, conservó el parámetro de destino y serializó el fallback `/dashboard` en el proveedor. Esto verifica configuración y respuesta pública, no un nuevo inicio de sesión con cuenta real. La política de acceso del navegador integrado bloqueó la recarga; no se realizó una revisión visual de esta última reducción de tamaño.

### Controles de acceso más compactos

Por solicitud del usuario, los inputs, el botón principal y el botón de Google del login pasan de una altura mínima de 48px a 40px, con relleno vertical de 8px. El ajuste usa `appearance.elements` de Clerk y conserva el diseño del formulario y su comportamiento de autenticación.

Verificado tras el ajuste: `pnpm typecheck` y `pnpm lint` correctos. Se midieron en la vista abierta del navegador los campos de correo y contraseña y los botones principal y de Google: los cuatro tienen 40px de altura; el input de correo tiene 8px de relleno superior e inferior. Esta comprobación visual de medidas no ejecutó otro inicio de sesión.

### Login y registro unificados, con mayor compacidad

El usuario pidió compactar más los controles y que el registro tuviera el mismo diseño que el login. Ambos formularios ahora comparten `components/auth-shell.tsx` (marca, columna del formulario, imagen a la derecha y pie) y `components/auth-appearance.ts` (apariencia de los componentes oficiales de Clerk). Se reutiliza `public/login-workspace.png`; la fotografía se muestra desde 1024px y se oculta en móvil.

Los campos y los botones principal y de Google pasan de 40px a 36px de altura mínima, con 6px de relleno vertical. Se conservan los títulos de cada flujo, los límites `Suspense` y la configuración existente de autenticación y redirecciones.

Verificado: `pnpm typecheck`, `pnpm lint` y `pnpm build` correctos; revisión mecánica de las fuentes modificadas sin hallazgos. En el navegador se midieron 36px para correo, contraseña y ambos botones en login y registro. El registro se revisó a 1440px (fotografía visible) y 390px (fotografía oculta), sin desbordamiento horizontal. Capturas guardadas en los artefactos locales de esta conversación como `slotly-auth/signup-matching-desktop.png` y `slotly-auth/signup-matching-mobile.png`. Esta validación de interfaz no creó una cuenta ni ejecutó otro acceso real.

### Registro con retorno al dashboard

Por solicitud del usuario, se añadió `signUpFallbackRedirectUrl="/dashboard"` al `ClerkProvider` existente para que, al completar el registro y las verificaciones de Clerk, el destino predeterminado sea el mismo que al iniciar sesión. Un `redirect_url` explícito conserva su prioridad. No se modificó `.env.local`.

Verificado el 19 de octubre de 2026: `pnpm typecheck`, `pnpm lint` y `pnpm build` correctos. Las respuestas HTTP de `/sign-up`, `/sign-up?redirect_url=%2Fdashboard` y `/sign-in` devolvieron 200 y serializaron ambos fallbacks con `/dashboard`; la segunda conservó el parámetro de retorno en su URL. Esta comprobación acredita la configuración pública, no la ejecución del flujo de registro. Queda pendiente crear y verificar una cuenta real y confirmar la llegada directa al dashboard. La confirmación previa del usuario corresponde únicamente al inicio de sesión.

### Menú de cuenta compacto y radio compartido

El usuario pidió reducir el espacio vacío del desplegable, usar esquinas poco redondeadas y retirar las marcas de Clerk. Se mantiene el `UserButton` oficial en portada y dashboard, sin el texto redundante «Tu cuenta» de la cabecera. Su apariencia se configura una sola vez en `ClerkProvider`: ancho de 18rem (288px), máximo igual al viewport menos 2rem, radio de 6px, relleno de identidad de 16px y acciones y disparador con un mínimo de 44px. El nombre y el correo pueden partirse para evitar desbordamientos.

El aviso «Development mode» se oculta solo en el menú mediante la opción oficial `unsafe_disableDevelopmentModeWarnings`, como vista previa de producción. «Secured by Clerk» sigue visible: la [documentación oficial de Branding](https://github.com/clerk/clerk-docs/blob/main/docs/_partials/secured-by-clerk-branding.mdx) indica que se elimina desde **Settings → Branding → Remove "Secured by Clerk" branding**. Esa configuración remota y su disponibilidad en el plan no se comprobaron ni modificaron; no se ocultó la marca mediante CSS.

El usuario confirmó después que quiere ese mismo radio en toda la aplicación. Los inputs y botones de autenticación, enlaces de acción, paneles, marco de login y registro, menús y tarjetas y modal de Clerk usan ahora 6px. Las superficies propias usan `rounded-md` y los botones compartidos declaran `border-radius: var(--radius-md)`; Clerk usa `borderRadius: "0.375rem"` y ajustes de sus superficies. Se conservan los avatares circulares y los contenedores internos transparentes sin radio. `DESIGN.md` recoge esta decisión.

Verificación del 19 de octubre de 2026: `pnpm typecheck`, `pnpm lint` y `pnpm build` correctos; revisión mecánica de layout sin hallazgos. Con la sesión restaurada por el usuario se abrió el menú en escritorio (1100px) y móvil (390px): ancho 288px, radio 6px, acciones y disparador de 44px, sin desbordamiento horizontal. Tab lleva a «Administrar cuenta» y Escape cierra el menú y devuelve el foco al avatar. Se midieron 6px en panel y botón de portada (escritorio y móvil), panel del dashboard, modal y tarjeta de cuenta, y un input y botón oficiales del formulario para agregar correo; este formulario se canceló sin escribir ni guardar datos. El menú mantiene «Secured by Clerk» y ya no muestra el aviso de desarrollo. No se completaron registro, OAuth ni cierre de sesión durante esta revisión. Los formularios de login y registro comparten la configuración de radio, pero no se revisaron visualmente con la sesión cerrada en esta pasada.

Capturas locales: `slotly-auth/account-menu/desktop.png`, `mobile.png`, `home-shared-radius.png` y `home-mobile-shared-radius.png` en los artefactos de esta conversación. Los tamaños temporales del navegador se restablecieron después de las comprobaciones.

### Confirmación visual del diseño compartido de registro

Ante la solicitud de aplicar al registro el diseño del login, se comprobó el 19 de octubre de 2026 que el código actual ya usaba `AuthShell` y `authAppearance` en ambas rutas. No fue necesario modificar de nuevo las fuentes ni duplicar los estilos.

Se verificó `/sign-up` en el navegador a 1440px y 390px: formulario de 384px en escritorio y 310px en móvil, fotografía de 576px a la derecha en escritorio y oculta en móvil, sin desbordamiento horizontal ni excepciones de página. El formulario oficial mostró correo, contraseña y Google con la paleta de Slotly. Las capturas están en `C:/Users/dcalu/.codex/visualizations/2026/10/19/01a15626-dcd3-7792-a584-964720d2ba80/signup/`. `pnpm lint` y `pnpm typecheck` finalizaron correctamente. Esta comprobación no creó una cuenta ni completó un registro real.

### Placeholder de contraseña de registro en español

El 19 de octubre de 2026 se añadió `formFieldInputPlaceholder__signUpPassword: "Crea una contraseña"` a la localización del proveedor existente. La versión instalada de `esES` dejaba esa clave sin traducir, por lo que Clerk mostraba «Create a password». Se comprobó en `/sign-up` que el campo de tipo contraseña muestra el nuevo placeholder y que el anterior ya no aparece. `pnpm lint` y `pnpm typecheck` finalizaron correctamente; no se creó una cuenta durante esta comprobación.

### Revisión de idioma y reducción adicional de cabecera

El usuario pidió revisar los textos en inglés del login y registro y, durante ese trabajo, reducir de nuevo la altura de la barra superior y el logo.

- Se centralizó la localización en `lib/clerk-localization.ts`, conservando `esES` y los textos iniciales aceptados. Se completaron 100 traducciones ausentes de la versión instalada: claves compartidas de autenticación, pasos de `signIn` y `signUp`, mensajes de error y ayudas de seguridad de contraseñas. Las claves de pasos alternativos solo traducen textos del SDK; no habilitan métodos de autenticación nuevos.
- Se compararon esas claves con `enUS`: no quedaron valores ausentes, valores iguales al inglés ni diferencias en las variables `{{...}}` de los mensajes. Esta comprobación estática cubre las traducciones añadidas, sin ejecutar todos los pasos ni errores con una cuenta real.
- Se comprobaron en el navegador los formularios iniciales de login y registro, incluidos labels y placeholders, sin excepciones de página. Las leyendas del proveedor «Secured by» y «Development mode» permanecen visibles; no tienen claves en el recurso de localización instalado. No se ocultó la marca ni se cambió la configuración remota de Clerk.
- La cabecera compartida pasa de 64px a 56px de altura mínima. El logo pasa de 112/128px a 80/96px (móvil/escritorio), conservando la proporción y actualizando `sizes`. Se reutiliza `Brand` en todas las pantallas.
- Medidas verificadas a 1440px y 390px: cabecera de 56px, logo de 96px y 80px respectivamente, sin desbordamiento horizontal. Capturas en `C:/Users/dcalu/.codex/visualizations/2026/10/19/01a15626-dcd3-7792-a584-964720d2ba80/compact-header/`.
- `pnpm lint`, `pnpm typecheck` y `pnpm build`: correctos. La revisión mecánica de las fuentes visuales modificadas no encontró incidencias. No se completaron registros ni accesos reales durante estas comprobaciones.

## Reto 02: perfil del negocio con Convex

El usuario autorizó expresamente integrar Convex en este chat de implementación: **un negocio por cuenta y un único propietario**. El chat «Retomar planificación de Slotly» conserva su función de planificación y aprendizaje. No se implementan edición o eliminación del perfil, Organizations, empleados, invitaciones, roles ni otras funcionalidades de reservas.

La inspección inicial de este reto encontró `main` limpio, siguiendo `origin/main`, en `51c2d295c7acab5e9940e29b3e0e5f09b3922905`. No había integración previa de Convex. No se hicieron commits, push ni despliegues de producción.

### Configuración inicial de desarrollo local

- Se instaló `convex` **1.47.0**. No había sesión de Convex, deploy key ni proyecto vinculado en el equipo, por lo que se inicializó el backend **local** oficial, sin cuenta, en `http://127.0.0.1:3210`.
- La CLI añadió `CONVEX_DEPLOYMENT`, `NEXT_PUBLIC_CONVEX_URL` y `NEXT_PUBLIC_CONVEX_SITE_URL` a `.env.local`, conservando las variables de Clerk. La base y la configuración administrativa están en `.convex/local/`, excluido de Git. Los datos dependen de conservar esa carpeta y ejecutar el backend local; no se sincronizan con un proyecto cloud.
- La CLI de Clerk comprobó acceso válido y vinculación a la instancia de desarrollo existente. No había plantilla JWT de Convex. Se creó únicamente la plantilla `convex`, con `aud: "convex"`, duración de 60 segundos y tolerancia de reloj de 5 segundos. No se cambiaron conexiones sociales, métodos de acceso ni configuración de producción.
- `convex/auth.config.ts` acepta el emisor de esa instancia mediante `CLERK_JWT_ISSUER_DOMAIN` y audiencia `convex`. La variable se configuró en el backend local. El dominio se derivó de la clave pública existente, sin copiar claves ni tokens a fuentes, logs o documentación.
- `components/convex-client-provider.tsx` usa el proveedor oficial `ConvexProviderWithClerk` con `useAuth`, dentro del `ClerkProvider` existente y limitado al dashboard. No se añadió almacenamiento de tokens, Convex Auth, tablas de usuarios o sesiones ni webhooks.
- `.env.example` y README documentan la configuración reproducible con valores vacíos o de ejemplo. Para un proyecto cloud o una nueva instancia se debe configurar su propio entorno de desarrollo; no se eligió ni creó un proyecto remoto en nombre del usuario.

### Modelo y comportamiento implementados

`convex/schema.ts` define `businesses` con `ownerId`, `name`, `timeZone` e índice `by_ownerId`; identificador y creación usan `_id` y `_creationTime`. El propietario es `identity.subject` (el identificador estable de Clerk) bajo el único emisor configurado. No procede del correo ni de argumentos del cliente.

`convex/businesses.ts` expone solamente dos funciones públicas, ambas con validadores de argumentos y retorno:

- `getMyBusiness`: verifica identidad en Convex y consulta el índice por ese propietario. Devuelve `null` solo si la identidad está autenticada y aún no tiene negocio. Su resultado no expone `ownerId`.
- `createMyBusiness`: verifica identidad, recorta espacios y exige nombre de 1 a 100 caracteres. Valida una zona horaria IANA mediante `Intl.DateTimeFormat` y rechaza offsets numéricos. La lectura indexada y la inserción ocurren en una transacción; Convex resuelve conflictos concurrentes antes de confirmar escrituras. Si existe un perfil, rechaza el envío sin sobrescribirlo.

`components/business-profile.tsx` distingue autenticación pendiente, consulta pendiente, ausencia de perfil y perfil guardado. El formulario tiene labels, selección de zona IANA, estado de guardado y errores anunciados que conservan los campos. `app/dashboard/error.tsx` permite reintentar un fallo de lectura mediante `retry`, la API estable de Next.js 16.3+ que vuelve a solicitar y renderizar el segmento. Se conservan la marca, los colores y el radio de Slotly; no se necesitó shadcn/ui para dos campos.

`app/dashboard/page.tsx` conserva `auth.protect()` antes de `currentUser()` y del contenido privado, dentro de `Suspense`. Se añadió `instant = false` únicamente a esta ruta: la validación de navegación instantánea en desarrollo indicaba que un proveedor cliente del segmento superior impedía validar la página. Se siguió la salida documentada en las guías locales de Next.js y Context7; después de recargar desapareció el aviso. No se añadió caché compartida de usuarios ni se modificó la protección del servidor. La revisión de feedback no retuvo este caso como incidencia reportable: se resolvió siguiendo la guía existente.

### Evidencia ejecutada

| Comprobación | Resultado y límite |
| --- | --- |
| Convex: generación y push al backend local | Correctos; esquema, índice, funciones y configuración de autenticación aceptados. |
| `pnpm test` | **18 casos correctos** con Vitest 5.0.5 y `convex-test` 0.0.62. Cubren no autenticados, ausencia/persistencia, nombres vacíos o largos, zonas válidas e inválidas, duplicados, propietarios separados con igual correo y argumentos manipulados. Identidades simuladas; no prueban OAuth ni firmas de Clerk. |
| `pnpm test:local` | Correcto contra el runtime real local: autorización, validación, manipulación, aislamiento y rechazo de token falso. Diez solicitudes HTTP simultáneas con clientes independientes: **una creación y nueve rechazos por negocio existente**, sin sobrescritura. Usa identidades administrativas sintéticas; no equivale a sesiones reales de Clerk. |
| Datos de pruebas locales | Quedan dos perfiles sintéticos `slotly_test_...` de la prueba HTTP y un perfil sintético de comprobación inicial del runtime. No se atribuyen a cuentas reales. El script opcional crea dos perfiles sintéticos por ejecución y se restringe al backend local. |
| `pnpm lint` | Correcto, sin advertencias; se excluyen los archivos generados de Convex. |
| `pnpm typecheck` y `pnpm exec tsc --noEmit --project convex/tsconfig.json` | Correctos. |
| `pnpm build` | Correcto después de integrar el perfil y ajustar la validación de navegación; rutas y proxy conservados. |
| Dependencias | Sin conflictos de peers. `@types/node` pasó a 24 para cumplir el peer de Vitest; se permitió el postinstall de `esbuild`, utilizado por Convex. Se conservaron las decisiones previas para `sharp` y `unrs-resolver`. |
| Sesión real existente de Clerk → Convex | El agente abrió `/dashboard`: identidad reconocida y formulario visible porque aún no había negocio. Esto verifica la conexión real de Clerk con Convex, sin simular una identidad administrativa. |
| Validación del formulario real | El agente probó nombre solo con espacios y zona `America/Inventada`: mensajes comprensibles y conservación de campos. |
| Creación real | El usuario indicó el nombre **slotly**; el agente lo guardó con **America/Montevideo** y observó el perfil confirmado en el dashboard. |
| Recarga con sesión real | El agente recargó `/dashboard`, observó el estado de autenticación pendiente y luego el mismo perfil persistido. |
| Nuevo acceso por Google | El agente abrió el login oficial tras salir, pulsó «Continuar con Google» y observó el regreso a `/dashboard` con el mismo perfil `slotly`. No se creó una cuenta nueva ni se introdujeron credenciales manualmente. |
| Cierre completo y acceso directo sin sesión | El agente cerró sesión mediante `UserButton`, esperó el retorno automático a `/` y comprobó la portada con enlaces de acceso. Después abrió `/dashboard`: terminó en `/sign-in` con `redirect_url` al dashboard, sin datos del negocio. |
| Revisión visual | Capturas finales válidas a 1440×1000 y 390×844; perfil legible y sin desbordamiento visible. Detector de los cuatro TSX modificados: sin hallazgos. Revisión independiente: `ship`, sin correcciones materiales. El formulario y los estados transitorios se revisaron desde código y durante interacción, sin capturas conservadas de todos ellos. |

Las capturas finales están fuera del repositorio en `C:/Users/dcalu/.codex/visualizations/2026/10/19/01a15672-1f40-7753-a4ec-d06359a41a3e/slotly-business/`. Los comandos y la sesión real acreditan lo descrito en la tabla; no prueban registro nuevo por correo, todas las variantes de Google ni dos cuentas reales simultáneas.

### Estado de los casos manuales

- Dos cuentas reales de Clerk con negocios diferentes y cambio entre ellas: confirmado por el usuario el 20 de octubre de 2026, según el cierre funcional registrado al final. La evidencia previa con identidades sintéticas en tests y en el backend local se conserva como comprobación independiente.
- Registro y acceso por correo, y registro nuevo por Google: se mantienen los pendientes del Reto 01 que no estén cubiertos por evidencia específica posterior.
- La configuración inicial local fue sustituida por el entorno cloud de desarrollo descrito en la siguiente sección. No hay despliegue de producción.

## Vinculación del Reto 02 con la cuenta de Convex

El usuario señaló que en su equipo de Convex solo veía NEEDTHISS y pidió que Slotly tuviera un proyecto propio en su cuenta. La ausencia se debía al backend anónimo local de la primera implementación. Esta continuación creó y vinculó un proyecto independiente de **desarrollo**, conservando el perfil real y el respaldo local. No se agregaron funcionalidades ni se hicieron commits, push o despliegues de producción.

### Cuenta y destino final

- Se comprobó con `pnpm exec convex login status` que la CLI no tenía sesión. El usuario completó y confirmó la autorización oficial del dispositivo **Slotly-Codex**. No se solicitaron ni imprimieron tokens o claves.
- Tras autenticar, se confirmó acceso al equipo `daniel-caluff`. La API oficial devolvía inicialmente solo NEEDTHISS. Se consultaron sus metadatos de proyecto para evitar seleccionar un destino ajeno; no se accedió a sus datos ni se hicieron escrituras en ese proyecto.
- Se creó el proyecto [slotly](https://dashboard.convex.dev/t/daniel-caluff/slotly) y después un único entorno **dev/slotly**, tipo `dev`, región US East (N. Virginia), sin expiración. El nombre del deployment es `determined-poodle-377`, con URL pública de cliente `https://determined-poodle-377.convex.cloud`. La CLI lo seleccionó como desarrollo personal predeterminado.
- Se comprobó el proyecto mediante la API y en el dashboard autenticado de Chrome: nombre **slotly** y estado **Development (Cloud)**. NEEDTHISS conserva su identificador y nombre de proyecto.
- `.env.local` apunta ahora al entorno cloud de Slotly. Se compararon las variables de Clerk con la copia previa y permanecen idénticas. El emisor `CLERK_JWT_ISSUER_DOMAIN` se configuró en este backend, con la misma instancia y plantilla JWT de Clerk. No se copió una clave secreta al backend.
- Se sincronizaron esquema, índice y funciones con `pnpm exec convex dev --once`; después se inició `pnpm convex:dev` contra cloud. El proceso local anterior se detuvo sin borrar `.convex/local/` ni su base SQLite. La app de Next.js continúa en localhost y ya no necesita el proceso de backend local.

### Conservación y migración de datos

Antes de cambiar el destino se ejecutó `pnpm exec convex export --path .convex/backups/slotly-local-before-cloud-20261019/snapshot.zip`, se guardó una copia privada del `.env.local` anterior y se comprobó la integridad de la exportación con SHA-256. Todo está dentro de `.convex/`, excluido de Git. La base local original permanece intacta.

La exportación tenía **cuatro negocios**: el perfil real `slotly / America/Montevideo` y tres perfiles sintéticos de las verificaciones anteriores. Se preparó `business-real.jsonl` únicamente con el documento real y sus cinco campos originales. No se editó el ZIP de respaldo. El `ownerId` se conservó sin transformaciones, para que el mismo `subject` verificado por Clerk siguiera resolviendo al propietario.

Se comprobó que `businesses` estaba vacía en el nuevo entorno y se importó con la CLI oficial, sin `--replace`, `--replace-all` ni `--append`. El resultado fue **una fila añadida, cero eliminadas**. Se compararon los valores remotos de `_id`, `_creationTime`, `ownerId`, `name` y `timeZone` con el documento respaldado: todos idénticos. No se migraron perfiles sintéticos ni se crearon nuevos durante las pruebas cloud.

La importación de datos de Convex permite conservar `_id` y `_creationTime`; se siguió su [documentación oficial de importación](https://docs.convex.dev/database/import-export/import). El respaldo completo no debe importarse automáticamente sobre el destino actual, porque también contiene datos de pruebas.

### Comandos registrados, sin secretos

Estos son los comandos de la operación ya completada; no hay que volver a crear el proyecto para arrancar la app:

```sh
pnpm exec convex login --login-flow poll --device-name Slotly-Codex
pnpm exec convex login status
pnpm exec convex project create slotly --team daniel-caluff
pnpm exec convex deployment create daniel-caluff:slotly:dev/slotly --type dev --region us --expiration none --default --select
pnpm exec convex env set CLERK_JWT_ISSUER_DOMAIN https://TU-INSTANCIA.clerk.accounts.dev --deployment daniel-caluff:slotly:dev/slotly
pnpm exec convex dev --once
pnpm exec convex import --table businesses .convex/backups/slotly-local-before-cloud-20261019/business-real.jsonl --deployment daniel-caluff:slotly:dev/slotly
```

Para volver a seleccionar el entorno existente se usa `pnpm exec convex deployment select daniel-caluff:slotly:dev/slotly`. El trabajo habitual utiliza `pnpm convex:dev` y, en otra terminal, `pnpm dev`; no usa modo anónimo. Las pruebas sintéticas habituales se ejecutan mediante `pnpm test`, en memoria y separadas de la base cloud.

### Verificación de esta continuación

| Comprobación | Evidencia real |
| --- | --- |
| Cuenta y proyecto | Login oficial confirmado por el usuario; equipo accesible y proyecto visible en la API y en el dashboard autenticado. |
| Datos del negocio | Exactamente un documento real en cloud; los cinco campos coinciden con el respaldo, incluido el propietario. |
| Sesión Clerk → Convex cloud | El dashboard recuperó `slotly / America/Montevideo` con la sesión real existente después del cambio. |
| Persistencia manual reportada por el usuario | Durante la revisión guiada del 19 de octubre de 2026, el usuario confirmó que al recargar `/dashboard` seguía viendo `slotly` y `America/Montevideo`. Es una prueba ejecutada y reportada por el usuario, distinta de las comprobaciones del agente. |
| Independencia del backend local | Se detuvo el proceso local, se confirmó cerrado el puerto 3210, se recargó la app y volvió a mostrar el mismo perfil desde cloud. |
| Autorización en destino final | Query y mutation sin autenticación rechazadas; consulta con JWT falso rechazada. No se crearon documentos durante estas comprobaciones. |
| Salida y nuevo acceso real en cloud | Se cerró sesión con el `UserButton`, se esperó el retorno a la portada y el acceso directo a `/dashboard` terminó en el login. Al volver mediante el botón oficial de Google, regresó al dashboard y recuperó `slotly / America/Montevideo`. No se introdujeron credenciales ni se creó otra cuenta. |
| Automatizadas y compilación | `pnpm test`: 18 casos correctos; `pnpm lint`, `pnpm typecheck` y `pnpm build`: correctos con las variables cloud actuales. |

Los tests de concurrencia y aislamiento con identidades administrativas sintéticas corresponden al backend local anterior; no se repitieron escribiendo datos de prueba en el destino real cloud. El caso de dos cuentas reales quedó confirmado posteriormente por el usuario, según el cierre funcional registrado al final. Las pruebas de correo y registro nuevo del Reto 01 conservan sus pendientes específicos. La API de gestión confirmó que Slotly tiene exactamente un deployment de tipo `dev` y ninguno de producción.

Las capturas de la cuenta con ambos proyectos visibles, del resumen **Development (Cloud)** y del perfil tras volver a entrar están fuera del repositorio, en `C:/Users/dcalu/.codex/visualizations/2026/10/19/01a15672-1f40-7753-a4ec-d06359a41a3e/slotly-cloud/`. Se conservó además un registro privado de comparación en `.convex/backups/slotly-local-before-cloud-20261019/migration-verification.json`, sin tokens ni claves.

### Lectura guiada de la implementación

1. `convex/auth.config.ts` y `components/convex-client-provider.tsx`: Clerk emite el JWT y Convex verifica emisor y audiencia; el proveedor cliente coordina esa comprobación antes de consultar. La protección de Next.js sigue ejecutándose en el servidor.
2. `convex/schema.ts`: la tabla mínima guarda el propietario estable, nombre y zona horaria; el índice permite consultar solo el rango del propietario actual. Los campos de sistema evitan duplicar identificador y fecha de creación.
3. `convex/businesses.ts`: cada función verifica su propia autenticación. La creación valida y comprueba existencia dentro de la transacción, por lo que ni el cliente ni un segundo envío pueden elegir otro propietario o sobrescribir el perfil existente.
4. `components/business-profile.tsx`: la espera de autenticación y el resultado pendiente de la query tienen estados distintos de `null`; solo este último abre el formulario. La consulta reactiva muestra el perfil después del guardado y en nuevas sesiones.
5. `tests/businesses.test.ts`: comprueba las reglas con identidades simuladas. La prueba HTTP local añade evidencia del motor real y la concurrencia; el recorrido con Clerk y Google aporta evidencia de integración real. Cada comprobación tiene un alcance distinto y sus pendientes permanecen explícitos.

## Diagnóstico del error genérico de instant UI

Durante la revisión guiada del 19 de octubre de 2026, además de confirmar personalmente la persistencia del perfil, el usuario reportó: «An error occurred while attempting to validate instant UI. This error may be preventing the validation from completing.» No se dio por inocuo porque el perfil siguiera apareciendo.

### Reproducción y causa observada

- La recarga directa de `/dashboard` no reprodujo el error inicialmente. La página ya exportaba `instant = false` y seguía ejecutando `auth.protect()` en servidor.
- Se reprodujo al navegar con sesión desde el dashboard a la portada. La otra pestaña de login también mostraba el mismo error genérico y el diagnóstico de validación del segmento.
- Se leyeron las guías locales de Next.js 16.4.2 sobre instant navigation y autenticación con Cache Components, se consultó Context7 y se inspeccionó el lugar donde Next.js envuelve el error original con `cause`. En el overlay, **Caused by** identificó que `PlaceValidationBoundaryBelowThisLevel`, un módulo interno de Next.js, no estaba en el React Client Manifest.
- El identificador solicitado por el error apuntaba a la ubicación anterior de Next.js dentro de `.pnpm`. Se comparó con la resolución actual de `next/package.json` y con los manifiestos de portada y dashboard: estos contenían la ubicación nueva y no contenían la anterior. El proceso de desarrollo seguía abierto desde antes de la instalación de dependencias del reto. La versión de Next.js no había cambiado.
- Esa discrepancia entre el contexto del proceso antiguo y los módulos/manifiestos actuales explica el fallo observado. No era evidencia de un fallo de Convex, pérdida del perfil ni rechazo de la sesión real. La inspección del proceso, de los manifiestos y del error interno aporta la causa concreta; el mensaje genérico por sí solo no permitía deducirla.

### Corrección aplicada

Se verificaron los identificadores y la relación del proceso del servidor con su CLI y se reinició únicamente el servidor de desarrollo mediante `pnpm dev`. Se reutilizó la caché existente. No se borraron `.next`, datos locales ni datos remotos; no se instalaron dependencias ni se actualizó el framework. No se cambiaron componentes, autenticación, `cacheComponents`, `partialPrefetching` ni el `instant = false` que ya tenía el dashboard.

Después del reinicio se recargaron las vistas y se distinguieron los mensajes históricos de consola de los emitidos en la ventana nueva de verificación. Los mensajes anteriores se conservan en el historial del navegador y no se interpretan como fallos nuevos.

### Evidencia de esta corrección

| Comprobación | Resultado observado |
| --- | --- |
| Portada autenticada después del reinicio | Renderizó la bienvenida y el enlace al dashboard; el error genérico y el fallo del manifiesto no reaparecieron en la recarga nueva. |
| Navegación autenticada portada → dashboard | Correcta, recuperó el perfil de la sesión real y no emitió nuevos errores de consola. |
| Recarga de `/dashboard` | Recuperó `slotly / America/Montevideo`; solo se observó el aviso normal de Clerk sobre la instancia de desarrollo. |
| Solicitud HTTP sin cookies | Serializó la redirección a `/sign-in` y no incluyó el nombre privado ni `America/Montevideo`. Esta comprobación HTTP se distingue del recorrido de navegador. |
| Navegador sin sesión | En una pestaña nueva de Chrome, `/dashboard` terminó en `/sign-in` con el destino de retorno conservado. Se mostraron los controles de login y no hubo nuevos errores de consola. La sesión real del navegador integrado permaneció abierta. |
| Comprobaciones estáticas | `pnpm lint`, `pnpm typecheck` y `pnpm build` correctos después del reinicio. No se repitieron pruebas de escritura de backend porque esta corrección no cambió sus funciones. |

Se conservan la sesión real, el perfil y el destino cloud `determined-poodle-377`. Esta tarea solo modifica documentación; las fuentes previas y sus cambios sin commit permanecen intactos. No se hicieron commits ni push.

La captura final está en los artefactos locales de esta conversación, dentro de `instant-ui/dashboard-after-restart.png`. Los logs del servidor y las consolas de los recorridos nuevos se revisaron después de recargar: no reaparecieron el fallo del manifiesto ni el error genérico. Permanecen avisos de desarrollo de Clerk y, en login, una recomendación de carga de imagen ajena a este incidente.

El caso reúne evidencia para feedback de Next.js: un cambio de ubicación de paquete con el servidor abierto produjo un error genérico de validación y una referencia interna de manifiesto obsoleta. Se prepara un borrador anónimo para revisión del usuario; no se envía ningún reporte automáticamente.

## Controles compactos y selección de zona horaria

El 19 de octubre de 2026 el usuario pidió extender la altura del login a los inputs y botones, quitar los subtextos del formulario del negocio y sustituir la escritura libre de la zona horaria por un selector o autocomplete.

- Los botones compartidos y la clase reutilizable `form-control` tienen altura mínima de 36px y relleno vertical de 6px. La apariencia global de Clerk reutiliza esas medidas en campos y botones de formulario; login y registro conservan su aspecto. Los controles de avatar y menú mantienen su área de interacción de 44px.
- El formulario conserva título, etiquetas, validaciones y estados accesibles; se retiraron la introducción y la ayuda IANA. El aviso redundante del perfil guardado queda disponible para lectores de pantalla.
- La zona horaria usa un `select` nativo cerrado. El servidor genera las opciones con `Intl.supportedValuesOf("timeZone")` y añade UTC; pasa una única lista serializable al cliente para evitar diferencias de opciones durante la hidratación. El valor inicial sigue siendo `America/Montevideo`. La validación del servidor permanece intacta.
- No se añadieron paquetes. Se actualizaron `DESIGN.md` y su representación `.impeccable/design.json` para registrar el patrón compacto.

Verificación: `pnpm lint`, `pnpm typecheck` y `pnpm build` correctos; detector de los cinco archivos de interfaz sin hallazgos. En navegador, el input, el selector y el botón midieron 36px a 1440×1000 y 390×844, sin desbordamiento horizontal. Se comprobaron las 419 opciones disponibles en este entorno, Montevideo inicial, cambio a Madrid, foco visible al pasar del nombre al selector con Tab y rechazo de un nombre compuesto solo por espacios.

Las capturas `compact-form/desktop.png` y `compact-form/mobile.png` en los artefactos de esta conversación se obtuvieron de una ruta temporal que renderizaba el mismo formulario. La ruta y su export temporal se retiraron antes de las comprobaciones finales; no forman parte de las rutas del build. No se ejecutó un nuevo guardado del negocio durante esta verificación visual. La recarga del dashboard real recuperó `slotly / America/Montevideo`. No hubo nuevos errores de consola en la captura final; permanece el aviso normal de Clerk sobre sus claves de desarrollo. La revisión independiente del refinamiento devolvió `ship`, sin correcciones materiales pendientes. No se hicieron commits ni push.

## Validación con shadcn/ui, React Hook Form y Zod

El usuario autorizó explícitamente desde el chat de planificación: «para las validaciones usa la anatomy de shadcn, usa zod, react-hook-form y demas». Esta adaptación permanece dentro del perfil del negocio del reto 02 y conserva la compacidad, el selector cerrado y la ausencia de subtextos acordadas anteriormente.

### Decisiones e implementación

- `components.json` configura shadcn/ui para Next.js y Tailwind 4. La CLI oficial 4.22.1 incorporó `Field`, `Input`, `Button`, `NativeSelect` y los componentes `Label` y `Separator` requeridos por `Field`. Se adaptaron sus estilos al verde, Geist, radio de 6px y controles de 36px existentes. No se regeneró el CSS global: solo se añadieron aliases semánticos compatibles y el color de error `destructive`, sin cambiar los valores ni significados de `accent`, `muted` o las superficies existentes.
- Se instalaron con pnpm React Hook Form 7.90.0, Zod 4.6.7 y `@hookform/resolvers` 5.9.2. `cn`, `class-variance-authority`, `radix-ui` y `lucide-react` son dependencias de los componentes oficiales incorporados. No se instaló una biblioteca genérica de formularios propia ni funcionalidades de otro reto.
- `components/business-profile.tsx` mantiene las comprobaciones de autenticación y consulta, y conecta la mutación real con `components/business-profile-form.tsx`. Este último compone `Controller`, `FieldGroup`, `Field`, `FieldLabel` y `FieldError`, sin introducir `FieldDescription`. React Hook Form gestiona valores, errores y estado de envío. El componente admite verificar la interfaz con un callback local, sin simular identidades en la aplicación real ni llamar al backend.
- `lib/business-profile-schema.ts` define con Zod el nombre recortado de 1 a 100 caracteres y la zona IANA reconocida que además debe estar incluida en la lista permitida. El tipo del formulario se infiere del esquema; `zodResolver` conecta esta validación con React Hook Form.
- Los mensajes están en español. Cada error de campo tiene un ID vinculado mediante `aria-describedby`, junto a `data-invalid` en `Field` y `aria-invalid` en el control. El foco va al primer campo inválido después de rehabilitar el fieldset. Los códigos `INVALID_NAME` e `INVALID_TIME_ZONE` se asignan al campo correspondiente; sesión, duplicado y red son errores generales anunciados, que conservan los valores.
- Un bloqueo síncrono evita envíos rápidos repetidos antes de que React deshabilite los controles. Mientras la petición está pendiente, se anuncian el guardado y `aria-busy`; un error permite reintentar sin perder lo escrito. Tras un resultado correcto, el formulario queda bloqueado hasta que la consulta reactiva muestra el perfil.
- Las funciones, validaciones, autenticación, índice por propietario y control transaccional de duplicados de Convex permanecen intactos. Zod en cliente mejora la interacción y no sustituye esos controles del servidor.

### Evidencia y límites de la verificación

`pnpm test` pasó las 30 pruebas en memoria: 18 del backend y 12 del esquema del formulario. Incluyen espacios, normalización, límites, zona fuera de lista y opciones defectuosas. No se ejecutó `test:local` contra cloud.

En navegador se usó temporalmente el mismo componente del formulario con respuestas sintéticas locales, sin cliente Convex ni escrituras remotas. Se comprobó nombre vacío o compuesto solo por espacios sin intento de envío; asociación del mensaje y foco; los dos errores de campo enviados por el callback; errores de red, sesión y duplicado; conservación de valores y nombre recortado en el payload; doble clic con un único intento durante una espera controlada; rehabilitación tras el fallo; y bloqueo tras el éxito mientras se espera el perfil reactivo. Estos casos simulados comprueban la interfaz y no se registran como nuevas pruebas reales de guardado cloud.

Las capturas de `rhf-form/desktop.png`, `mobile.png`, `desktop-error.png` y `mobile-error.png` muestran el formulario sin descripciones permanentes, con altura de 36px, radio de 6px, errores legibles y foco visible a 1440×1000 y 390×844, sin desbordamiento horizontal. `rhf-form/checks.json` conserva las comprobaciones del navegador en los artefactos de esta conversación. La ruta y el componente de prueba temporales se retiraron antes del build final. El detector de los nueve archivos de interfaz no encontró hallazgos.

Antes de las instalaciones se verificó y detuvo solo el servidor Next.js del proyecto; después se reinició con `pnpm dev`, conservando la sesión, la configuración y los datos. No se cambiaron las funciones ni el destino cloud, no se crearon negocios ni se modificó el perfil existente.

Al retirar el fixture pasaron `pnpm lint`, `pnpm typecheck` y `pnpm build`; el listado de rutas del build no contiene la ruta de verificación. La revisión independiente de las cuatro capturas, el código y la evidencia devolvió `ship`, sin correcciones materiales. Se abrió el dashboard real de la sesión disponible en el navegador integrado y se observó «Tu negocio»; también se navegó desde la portada autenticada al dashboard. No aparecieron nuevos errores de consola, de manifiesto ni de instant UI; solo el aviso de Clerk sobre claves de desarrollo. Esta comprobación fue de lectura y no equivale a crear un negocio en la segunda cuenta. No se hicieron commits, push ni despliegues de producción.

### Pruebas reales comunicadas por el usuario

Antes del cierre, el usuario había comunicado desde planificación que `slotly / America/Montevideo` persiste al recargar; el error de instant UI desapareció tras el reinicio; al cerrar sesión y abrir `/dashboard` llega al login sin datos; al volver a la primera cuenta recupera el perfil; y una segunda cuenta real muestra el formulario con nombre vacío, sin el negocio de la primera. Son pruebas reportadas por el usuario, sin inferir el método de login que no indicó.

El usuario confirmó después la validación del nombre formado solo por espacios. Ese caso deja de estar pendiente de confirmación manual. Su referencia ambigua a «la siguiente validación» no se atribuye a ningún caso concreto adicional.

## Cierre funcional del Reto 02 en desarrollo

El **20 de octubre de 2026**, desde el chat de planificación, el usuario confirmó: «Sí, ya probé con ambas cuentas y cada una conserva su negocio sin mezclar ni sobrescribir datos».

Esta confirmación completa la prueba real de creación y persistencia de un negocio distinto por cada cuenta y el aislamiento al volver entre ambas. Se resuelve el pendiente de guardar el negocio de la segunda cuenta y comprobar que cada cuenta conserva el suyo sin mezclar ni sobrescribir el de la otra. Se suma a las confirmaciones previas del usuario sobre persistencia tras recarga y nuevo inicio de sesión, redirección sin sesión, rechazo del nombre con espacios y ausencia del error de instant UI.

El **Reto 02 queda cerrado funcionalmente en el entorno de desarrollo**, dentro del alcance de un negocio por cuenta, nombre y zona horaria. La evidencia se mantiene separada:

- **Pruebas reales del usuario:** las confirmaciones anteriores, incluida la creación, persistencia y separación de negocios entre dos cuentas reales. El agente registra su reporte; no se atribuye la ejecución de esas pruebas ni infiere el método de login no indicado.
- **Pruebas de UI del agente con respuestas sintéticas:** validación, errores asociados, foco, conservación de valores y estados de envío descritos en la adaptación del formulario. Acreditan la interfaz, sin equivaler al guardado real con ambas cuentas.
- **Pruebas automatizadas previamente ejecutadas:** 30 pruebas en memoria, 18 del backend y 12 del esquema del formulario, además de las comprobaciones de lint, tipos y build ya registradas. No se volvieron a ejecutar para este cierre documental.

El cierre corresponde exclusivamente a desarrollo; no acredita un despliegue ni una validación de producción, ni resuelve por inferencia los casos específicos de registro y acceso del Reto 01 que carezcan de evidencia propia. Esta actualización solo reconcilia el documento con las confirmaciones del usuario: no introduce otra funcionalidad o etapa, ni cambia código, configuración o datos, ni realiza commit o push.

## Reto 03: creación y listado de servicios

Implementado el **20 de octubre de 2026** en el chat de implementación, con el alcance aprobado en planificación. Al comenzar, el árbol estaba limpio y HEAD era `21de8b0625b67ce02d37e164ef2164eaa4637d58` (Reto 02). La implementación inicial no añadió dependencias; el refinamiento de notificaciones posterior incorpora Sonner, como se registra más abajo. No se modificaron autenticación, variables, configuración de Clerk, funciones del negocio o respaldos privados.

### Decisiones e implementación

- `convex/schema.ts` añade `services`: `businessId: v.id("businesses")`, `name: v.string()`, `durationMinutes: v.number()` e índice `by_businessId`. Solo se añaden los campos de sistema de Convex; relación de un negocio a varios servicios, sin precios, edición o eliminación.
- `convex/services.ts` expone únicamente `createMyService` y `listMyServices`, ambas con validadores de argumentos y retorno. Cada operación obtiene la identidad verificada, resuelve el negocio por `by_ownerId` y rechaza `UNAUTHENTICATED` o `BUSINESS_NOT_FOUND`. El cliente no puede elegir propietario ni negocio; tampoco se confía en correos ni metadatos del formulario.
- La mutación recorta el nombre y exige de 1 a 100 caracteres, coherente con el perfil existente. Exige duración entera positiva representable de forma segura, hasta `Number.MAX_SAFE_INTEGER`; rechaza fracciones, NaN, infinitos y enteros inseguros. La tabla valida la estructura y los tipos; estas restricciones de valores se ejecutan en la función, independientemente de Zod.
- La consulta usa `by_businessId`, orden descendente por creación y paginación. El cliente solicita 20 filas por vez; el servidor limita el tamaño solicitado a 50 y acota lecturas por página. «Cargar más servicios» evita truncar silenciosamente la lista o leer toda la tabla.
- `components/business-profile.tsx` conserva sus estados y el perfil, y monta los servicios solo cuando encuentra el negocio. `components/business-services.tsx` conecta la query reactiva y la mutación con `ServicesPanel`; el panel permite probar carga, vacío, listado y paginación con datos sintéticos aislados.
- `components/service-form.tsx` reutiliza Controller, Field, FieldLabel, FieldError, Input y Button, React Hook Form y zodResolver. `lib/service-schema.ts` separa el texto editable de minutos y el número de salida; evita convertir vacío a cero o redondear una fracción de texto antes de validarla. Los errores están en español, asociados con `aria-describedby` y `aria-invalid`; los errores de campo reciben foco después de rehabilitar los controles.
- Un bloqueo síncrono cubre clics rápidos antes del render de `disabled`; se anuncian guardado y resultado. Los fallos conservan los valores y permiten reintentar; solo el éxito vacía los campos y enfoca el nombre para otra creación. Se permiten servicios con nombres repetidos: no se añadió una regla de unicidad ni idempotencia entre creaciones intencionales.
- El formulario y la lista heredan el diseño compacto verde, ancho máximo de la sección del negocio, controles de 36px, radio de 6px y adaptación móvil. No se añadieron descripciones permanentes, nuevas primitivas ni identidad visual.

### Evidencia ejecutada y límites

| Comprobación | Resultado y alcance |
| --- | --- |
| `pnpm test` | **75 casos correctos**: 30 previos y 45 nuevos. Los nuevos cubren esquema de tabla, Zod, normalización/límites, varios servicios, nueva identidad simulada de la misma cuenta, ausencia de sesión o negocio, argumentos manipulados, aislamiento con el mismo correo, cursor ajeno y paginación sin omisiones/duplicados. Todo en memoria, sin escrituras remotas. |
| Generación y sincronización Convex | `pnpm exec convex codegen --typecheck enable` y `pnpm exec convex dev --once --typecheck enable` correctos. CLI confirmó `[Development] daniel-caluff:slotly:dev/slotly`, deployment `determined-poodle-377`. No se creó otro proyecto ni se desplegó a producción. |
| HTTP real a Convex sin sesión | Consulta y creación rechazadas con `UNAUTHENTICATED`; no se crearon documentos. No se usaron identidades administrativas sintéticas en cloud. |
| Dashboard real, solo lectura | La sesión existente recuperó el perfil `slotly / America/Montevideo` y mostró Servicios con estado vacío. No se guardaron servicios ni se alteraron los negocios reales. |
| Prueba real reportada por el usuario | El 20 de octubre de 2026 confirmó desde planificación: «Sí, creé dos servicios y después de recargar siguen apareciendo con sus nombres y duraciones correctos. El perfil del negocio sigue intacto». Quedan superadas la creación de varios servicios, su persistencia tras recarga y la continuidad del perfil en esa cuenta. La ejecución corresponde al usuario, no al agente. Esta confirmación inicial por sí sola no acreditaba nuevo inicio de sesión ni aislamiento entre dos cuentas; esos casos se confirmaron después, como se registra a continuación. |
| HTTP a `/dashboard` sin cookies | Incluye redirección a `/sign-in`, sin zona horaria privada ni formulario de servicios en la respuesta. No equivale a una prueba completa de cierre de sesión. |
| UI con respuestas locales sintéticas | Vacío y espacios; duración cero, negativa, fraccionaria e insegura sin callback; errores de nombre y duración del backend con foco; errores de red, sesión y negocio con valores conservados; doble clic con un intento pendiente; fallo y reintento; éxito limpia/foco; tres servicios en memoria; estados de carga y cargar más. Sin cliente Convex ni escrituras remotas. |
| Responsive y accesibilidad | Fixture a 1440×1000 y 390×844; controles de 36px y radio 6px, sin desbordamiento horizontal incluso con nombre de 100 caracteres y duración máxima. Capturas del dashboard real a tamaño de escritorio y móvil. Detector de los tres componentes sin hallazgos; consola del fixture sin errores. |

Las capturas de lista y error, el dashboard vacío y `checks.json` están fuera del repositorio, en `C:/Users/dcalu/.codex/visualizations/2026/10/20/01a15a3f-0dd7-7611-8080-361f071e8c8d/services/`. La ruta temporal `service-check` y su página se retiraron antes de las comprobaciones finales. El entorno emite avisos experimentales de Node sobre localStorage; las comprobaciones ejecutadas terminan correctamente.

Tras retirar el fixture, **`pnpm lint`, `pnpm typecheck` y `pnpm build` correctos**. El build solo incluye las rutas existentes de portada, dashboard, login, registro, iconos y manifiesto; no incluye `service-check`. `git diff --check` también termina correctamente. No se modificaron los scripts ni la configuración de Next.js.

La revisión visual independiente comprobó las seis capturas y no encontró correcciones materiales de interfaz. Su único hallazgo de persistencia documental fue actualizar `PRODUCT.md` al alcance del reto; se corrigió y un pase de veredicto puntuó esa corrección como **resuelta** (`ship` a ese alcance). El pase documental contrastó componentes, tokens y capturas con el sistema existente y confirmó que esta extensión no requiere cambiar `DESIGN.md` ni `.impeccable/design.json`; no se introdujeron nuevos tokens ni assets raster. Tras el build se recargó el dashboard real: recuperó el perfil, mostró servicios vacíos y no emitió nuevos errores de consola.

### Validaciones reales completadas por el usuario en planificación

Después de la entrega, el **20 de octubre de 2026**, el usuario comunicó estas confirmaciones adicionales. Son pruebas ejecutadas y reportadas por el usuario; el agente registra la evidencia sin atribuirse su ejecución.

1. **Validaciones negativas:** «Sí, las validaciones funcionan: rechaza el nombre vacío o con espacios y las duraciones inválidas sin crear servicios. Los dos existentes siguen intactos». El conjunto solicitado comprendía nombre vacío o con espacios y duración vacía, `0`, `-5` y `1.5`; se registra su confirmación de ese conjunto, sin extenderla a otros valores.
2. **Protección y nueva sesión:** «Sí, sin sesión me redirige a /sign-in y, al volver a entrar con la misma cuenta, recupero el perfil y los dos servicios correctamente». Quedan confirmadas la redirección sin sesión y la recuperación del perfil y los servicios al volver a autenticarse.
3. **Aislamiento y toast real:** «Sí, cada cuenta conserva sus propios servicios sin mezclarlos y el toast aparece una sola vez, sin el mensaje junto al botón». Quedan confirmadas la separación entre dos cuentas reales y la confirmación de éxito en una creación real.

Estas pruebas resuelven los pendientes funcionales de la entrega, junto con la creación y persistencia tras recarga ya comunicadas. Las solicitudes manipuladas conservan su evidencia automatizada en memoria; no se atribuyen a pruebas reales del usuario. La evidencia sintética por sí sola no acredita JWT reales, persistencia cloud tras nuevas sesiones ni concurrencia del motor remoto. No se ejecutó `pnpm test:local` ni se crearon negocios o servicios de prueba en cuentas reales por parte del agente.

### Refinamiento autorizado: confirmación mediante toast

El 20 de octubre de 2026, después de comunicar la creación de dos servicios y su persistencia tras recarga con el perfil intacto, el usuario pidió: «cuando se crea un servicio quiero que salga un toast en vez de poner al lado del button "Servicio creado"».

- Se consultaron las fuentes oficiales vigentes de [shadcn/ui Sonner](https://ui.shadcn.com/docs/components/sonner) y [Sonner](https://sonner.emilkowal.ski/) mediante Context7. Se incorporó **Sonner 2.0.8** con `pnpm add sonner`. No se añadió `next-themes`: Slotly tiene tema claro fijo y no necesita un proveedor de temas para esta notificación.
- `components/ui/sonner.tsx` adapta el wrapper oficial: una región de notificaciones con anuncio `polite`, etiqueta «Notificaciones», Geist, superficie verde clara, texto verde oscuro, icono de éxito y radio de 6px. Se usa un único `Toaster` en `app/layout.tsx`, independiente de Clerk. No se modificó configuración de autenticación ni backend.
- `ServiceForm` llama a `toast.success("Servicio creado")` solo después de que `onCreate` termine correctamente. Se retiraron el estado `saved` y el texto de éxito junto al botón. El formulario conserva exclusivamente el anuncio accesible de guardado; no duplica el anuncio de éxito del toast. Se mantienen limpieza, foco, bloqueo síncrono, listado reactivo, valores ante fallos y errores asociados a los campos.
- Antes de instalar se inspeccionaron los procesos y se detuvo únicamente el servidor Next.js del proyecto y sus procesos hijos. Se reinició con `pnpm dev` tras la instalación, conservando sesiones, variables, datos y cachés.

Verificación sintética ejecutada con los mismos `ServiceForm` y `ServicesPanel`, callbacks locales y el único Toaster del layout: no hay toast por formulario vacío o nombre de espacios, ni por errores de red, `INVALID_NAME`, `INVALID_DURATION`, `UNAUTHENTICATED` o `BUSINESS_NOT_FOUND`. Esos fallos conservan valores. El doble clic durante una espera genera un solo intento, sin toast antes de resolver; un fallo diferido permite reintentar; el éxito limpia y enfoca el nombre y genera una sola notificación, con una sola región viva que contiene el mensaje y ningún éxito dentro del formulario.

Las capturas de éxito a 1440×1000 y 390×844 comprueban Geist, radio de 6px y ausencia de desbordamiento móvil. Se estabilizó la animación para las capturas con una preferencia temporal de movimiento reducido y se restauró después. La consola del fixture no emitió errores y el detector de los tres archivos de UI devolvió cero hallazgos. La ruta temporal `toast-check` se retiró antes de la comprobación final; sus datos eran locales y no se realizaron escrituras remotas.

La evidencia de esta continuación está fuera del repositorio, en `C:/Users/dcalu/.codex/visualizations/2026/10/20/01a15a3f-0dd7-7611-8080-361f071e8c8d/services-toast/` (`desktop-success.png`, `mobile-success.png` y `checks.json`). Tras retirar el fixture pasaron **`pnpm test` (75 casos), `pnpm lint`, `pnpm typecheck` y `pnpm build`**; el build no incluye `toast-check`. La revisión independiente del refinamiento devolvió **`ship`**, sin correcciones materiales. La navegación real portada → dashboard recuperó el perfil y los dos servicios ya creados por el usuario, sin errores nuevos de consola: comprobación de lectura del agente, sin ejecutar otra creación ni cerrar sesión.

El usuario confirmó después las validaciones negativas reales, el nuevo inicio de sesión y el aislamiento entre dos cuentas, según el apartado anterior. También confirmó en una creación real que el toast aparece una sola vez y que ya no hay mensaje junto al botón. Quedan resueltos esos pendientes; no se añadieron tests que solo reflejen la sustitución visual ni se hicieron commit/push.

## Cierre funcional del Reto 03 en desarrollo

El **20 de octubre de 2026**, las confirmaciones del usuario desde planificación completan los criterios funcionales acordados: creación y consulta de varios servicios con sus nombres y duraciones, persistencia tras recarga y nueva sesión, validación de campos sin crear servicios inválidos, continuidad del perfil y de la protección de acceso, y aislamiento entre dos cuentas reales. También queda validado el refinamiento del toast durante una creación real.

El **Reto 03 queda cerrado funcionalmente en desarrollo**, dentro del alcance aprobado de crear y listar servicios del negocio de la cuenta actual, con nombre y duración en minutos enteros positivos. La evidencia se mantiene separada:

- **Pruebas reales ejecutadas y reportadas por el usuario:** las cuatro confirmaciones registradas, incluida la creación de dos servicios, recarga, validaciones negativas, salida y nuevo acceso, separación entre cuentas y toast único sin mensaje inline. El agente documenta su reporte.
- **Pruebas de UI del agente con respuestas sintéticas:** validaciones, errores, conservación de valores, bloqueo de envíos, foco y notificación descritos en la implementación y el refinamiento. No equivalen a escrituras con cuentas reales.
- **Comprobaciones automatizadas previamente ejecutadas:** 75 pruebas en memoria y `pnpm lint`, `pnpm typecheck` y `pnpm build` correctos. **No se volvieron a ejecutar para este cierre documental**; solo se verificó el diff de esta actualización.

El cierre corresponde exclusivamente a desarrollo: no acredita producción ni funcionalidades fuera del reto, y conserva los límites históricos de las comprobaciones anteriores. El cierre documental anterior no autorizaba publicar y modificó únicamente `docs/PROJECT_CONTEXT.md`; esa restricción correspondía a aquella petición.

Posteriormente, el **20 de octubre de 2026**, el usuario autorizó expresamente: «Perfecto, revisa el diff y, si está todo correcto, haz el commit y sube el reto 03 a GitHub». Esta autorización permite revisar, hacer commit y push del Reto 03. El resultado de la publicación se verifica y comunica en el chat de planificación.

Esta reconciliación se limita a `README.md`, `PRODUCT.md` y este documento. Solo se revisó su diff: no se ejecutaron pruebas ni se modificaron código, configuración o datos, y no se hizo commit o push en este ajuste documental.

## Reto 04: horario semanal de atención

Implementación autorizada el **20 de octubre de 2026** en un chat separado del de planificación. Se comenzó con `main` limpio en `f4e38fb2e780dec86cab4b4f1f6ee9bb6302abdf`, el Reto 03 publicado. **Cerrado funcionalmente en desarrollo el mismo día**, tras las pruebas de guardado, actualización, validaciones, semana cerrada, nueva sesión y aislamiento entre dos cuentas reales registradas a continuación. La implementación y el cierre documental se entregaron sin commit ni push; la autorización posterior se registra al final.

### Modelo, reglas y autorización

- Se añade únicamente `weeklySchedules`, con `businessId`, `days` e índice `by_businessId`; identificador y fecha de creación son campos de sistema de Convex. No se modifica el esquema ni los datos de perfiles y servicios.
- Cada semana contiene siete entradas únicas con `dayOfWeek` ISO **1=lunes…7=domingo**, persistidas en orden ascendente; `isOpen`, `start` y `end` tienen tipos obligatorios. Un día abierto exige horas locales de 24 horas **`HH:mm`**, de `00:00` a `23:59`, y cierre posterior a apertura. No acepta segundos, fechas, offsets, `24:00` ni tramos que continúen al día siguiente. Las cadenas de ancho fijo permiten comparar el orden dentro del día sin convertirlas a fechas.
- La zona se toma del negocio existente mediante la relación; no se copia ni cambia. Las reglas son recurrentes en esa zona IANA, sin timestamps UTC. Convertirlas a instantes concretos o resolver cambios de horario estacional pertenece a la futura generación de turnos, fuera del reto.
- Los días cerrados normalizan ambas horas a `null`, independientemente del texto de un borrador previo en controles deshabilitados. Una semana con los siete días cerrados es válida. La consulta devuelve `null` si nunca se guardó configuración; una semana cerrada guardada devuelve su documento. La interfaz no inventa tramos ni escribe al montarse.
- `getMyWeeklySchedule` y `saveMyWeeklySchedule` comprueban `ctx.auth.getUserIdentity()` y resuelven el negocio por `identity.subject` e índice de propietario en cada llamada. Rechazan ausencia de sesión o negocio y no aceptan IDs ni propietario del cliente. El correo no participa en autorización.
- La mutación valida estructura, tipos y todos los días antes de escribir. Consulta el horario por el índice e inserta o actualiza el mismo documento en **una transacción**: un error no persiste ni siquiera un cambio válido anterior dentro del envío. El índice no impone unicidad por sí mismo; la ruta de escritura transaccional, con reintentos OCC de Convex, evita dos configuraciones por negocio. No se añadieron otras rutas de escritura ni operaciones por día.

### Interfaz y decisiones

`BusinessWeeklySchedule` se monta tras resolver el negocio autenticado, junto a los servicios existentes. `WeeklySchedulePanel` distingue carga (`undefined`), ausencia (`null`) y configuración persistida. Su cabecera muestra la zona IANA como contexto de las horas. `WeeklyScheduleForm` reutiliza `Controller`, React Hook Form, Zod/resolver y las primitivas existentes `Field`, `FieldLabel`, `FieldError`, `NativeSelect`, `Input` y `Button`. No se añadieron componentes de formulario genéricos, dependencias ni tokens visuales.

Cada día tiene un selector Abierto/Cerrado y un único par de horas nativas. Las validaciones de Zod y Convex son independientes: comparten la convención documentada, sin delegar reglas de servidor al esquema del cliente. Los errores accesibles se asocian por campo y reciben foco después de que los controles vuelvan a estar disponibles; los fallos generales se anuncian y conservan valores. Un bloqueo síncrono evita envíos rápidos antes de que se renderice el estado de guardado.

El éxito restablece la base del formulario a la semana enviada, manteniéndola visible y editable, y emite una vez `toast.success("Horario guardado")`. Se reutiliza el único `Toaster` del layout; no hay mensaje inline de éxito. Una consulta reactiva nueva actualiza el formulario cuando está limpio. Si hay una edición o envío pendiente se descarta su aplicación al borrador completo, sin mezclar días ni reproducir esa actualización al terminar de guardar. Entre ediciones simultáneas prevalece el último guardado confirmado de la semana completa; recargar recupera lo persistido.

Se conservaron verde claro, Geist, controles de **36px** y radio de **6px**, con dos columnas de horas en móvil. Al verificar la integración se detectó y corrigió una clave React repetida entre las nuevas secciones hermanas: el horario ahora usa un prefijo propio. No se cambió la lógica validada de perfil, servicios, Clerk o el contenedor de notificaciones.

### Evidencia de la implementación inicial y límites

Las comprobaciones de este apartado corresponden al chat de implementación antes de la entrega. Las pruebas posteriores del usuario y del chat de planificación se registran por separado a continuación.

| Comprobación | Resultado y límite |
| --- | --- |
| Context7 y guías locales | Consultadas las fuentes oficiales de Convex, React Hook Form y shadcn/ui, más `use-client` de la versión local de Next.js, antes de implementar. |
| Sincronización de Convex | `pnpm exec convex dev --once`: destino confirmado `daniel-caluff:slotly:dev/slotly`, deployment `determined-poodle-377`; nuevo índice y funciones aceptados, tipos regenerados. No se crearon proyectos ni se usó producción. |
| `pnpm test` final | **131 casos correctos**: 75 previos y 56 nuevos del horario (31 de funciones Convex y 25 del esquema Zod). Datos e identidades sintéticos en memoria, sin escrituras remotas. |
| Reglas y funciones en memoria | Semana mixta/cerrada, ausencia de configuración, nueva identidad de sesión simulada, orden ISO y horas locales, guardados repetidos con el mismo ID y un solo documento, atomicidad ante horas/estructuras manipuladas, autenticación, ausencia de negocio, dos propietarios con igual correo, argumentos de acceso ajeno rechazados y perfil/servicios intactos. No acredita JWT reales ni concurrencia OCC del motor cloud. |
| Consulta cloud sin sesión | `getMyWeeklySchedule` rechaza con `UNAUTHENTICATED`. Fue una lectura sin token; no se crearon horarios. |
| Acceso HTTP sin cookies a `/dashboard` | Respuesta de streaming con redirección a `/sign-in`, sin sección de horario ni zona privada. No sustituye una prueba real de cierre de sesión. |
| UI con respuestas sintéticas locales | Montaje sin callback ni horarios inventados; carga; semana cerrada guardada y nueva lectura local; intervalos vacíos, iguales e invertidos sin callback, con foco; cierre de día normaliza horas; errores de red, sesión, ausencia de negocio, estructura, hora e intervalo conservan valores y no muestran toast; doble clic pendiente hace un solo intento; fallo diferido/reintento y resolución correcta; éxito conserva semana editable con un toast y sin éxito inline; actualización reactiva conserva edición pendiente. |
| Responsive y accesibilidad | Capturas de error y éxito a **1440×1000**, **390×844** y viewport actual **1280×720**, sin desbordamiento horizontal; 22 controles de 36px/radio 6px, Geist y errores asociados con foco visible. Consola del fixture sin errores. Detector manual sobre los tres TSX: `[]`. |
| Lectura real sin escrituras | Dashboard con la sesión existente: recupera el perfil y los dos servicios reales y muestra horario todavía sin guardar. No se cerró sesión ni se creó/modificó configuración real por el agente. La recarga tras corregir la clave no produjo nuevos errores de consola. |
| Comprobaciones finales sin fixture | **`pnpm lint`, `pnpm typecheck`, `pnpm exec tsc --noEmit --project convex/tsconfig.json` y `pnpm build` correctos**. El build conserva las rutas anteriores y no incluye `schedule-check`. `git diff --check` correcto. |

Las capturas, mediciones y 22 comprobaciones de UI están fuera del repositorio, en `C:/Users/dcalu/.codex/visualizations/2026/10/20/01a15a65-1003-7dc1-b67f-18bd536923df/weekly-schedule/`. Se conservó allí la fuente del fixture como evidencia; la ruta temporal `app/schedule-check` se retiró antes de los comandos finales. El fixture conectaba los componentes reales a callbacks locales, sin proveedor ni cliente Convex. Su «nueva lectura» no equivale a persistencia cloud tras recargar o iniciar sesión.

La revisión visual independiente devolvió **`ship` al alcance visual y de UI revisado**, sin correcciones materiales, sobre las seis capturas y los componentes. La revisión documental independiente confirmó que la extensión no requiere modificar `DESIGN.md` ni `.impeccable/design.json`. Se conserva sin reparar un drift previo del ejemplo del panel de cuenta en ese sidecar (radios 16/12px frente a los 6px actuales), ajeno a esta superficie. No se añadieron assets raster.

No se instalaron dependencias ni fue necesario reiniciar Next.js. Se conservaron procesos existentes, variables, sesiones, datos y respaldos privados. `.env.local` y `.convex` siguen excluidos de Git. No se ejecutó `test:local`. Los comandos emitieron los avisos experimentales de Node sobre localStorage ya presentes, sin impedir las comprobaciones.

### Verificaciones posteriores desde planificación

El **20 de octubre de 2026**, el chat «Retomar planificación de Slotly» comunicó los resultados siguientes para su registro. Este ajuste documental distingue sus ejecutores; no atribuye al chat de implementación ni al usuario las pruebas ejecutadas por el agente de planificación.

| Ejecutor | Comprobación y resultado |
| --- | --- |
| Usuario, confirmado en planificación | Guardó una semana con días abiertos/cerrados. Tras recargar se conservaron estados, horas y zona; observó un único toast y el perfil y los servicios intactos. |
| Usuario, confirmado en planificación | Modificó un tramo y guardó dos veces. Al recargar se conservaron el cambio y el resto de días, sin errores. Esto confirma el comportamiento de actualización y persistencia observado en la UI; no constituye un conteo de documentos en cloud. |
| Agente del chat de planificación | Ejecutó de nuevo **`pnpm test`: 6 archivos, 131 casos correctos, 0 fallos**, en memoria. No repitió lint, tipos ni build porque no hubo cambios de código desde sus resultados correctos. Esta nueva ejecución respalda las reglas y la atomicidad del backend con identidades sintéticas, sin acreditar concurrencia del motor cloud. |
| Agente del chat de planificación, navegador real autenticado | Observó como configuración original el lunes abierto **08:30–17:00**, de martes a domingo cerrados, con la zona **America/Montevideo**, el perfil y los valores visibles de los dos servicios existentes intactos. |
| Agente del chat de planificación, UI real | Probó cierre igual a apertura (**08:30–08:30**), cierre anterior (**08:30–08:00**), cierre vacío y apertura vacía. Cada envío mostró error por campo y foco. Tras recargar se recuperó la semana original, sin persistir los borradores inválidos. No se evadió el formulario para probar peticiones inválidas directas al backend cloud; esa validación independiente mantiene su evidencia en memoria. |
| Agente del chat de planificación, escritura real autorizada | Cerró temporalmente el lunes y guardó los siete días cerrados desde el formulario. Se mostró un único toast «Horario guardado» y la recarga recuperó los siete cerrados como configuración existente. Después restauró el lunes **08:30–17:00**, con los demás días cerrados, guardó y recargó: recuperó la configuración original, el perfil y los dos servicios intactos. |
| Agente del chat de planificación, autenticación real | Cerró sesión con `UserButton` y abrió `/dashboard`: terminó en `/sign-in`, con retorno al dashboard y sin datos del negocio ni horario. Después volvió a entrar mediante el botón Google de uso previo; regresó a `/dashboard` y recuperó la semana original, el perfil y los dos servicios correctos. |
| Usuario, intervención para cambiar de cuenta | Respondió «ya» a la solicitud de abrir la segunda cuenta y la abrió personalmente. Las comprobaciones siguientes las ejecutó el agente de planificación, no el usuario ni el chat de implementación. |
| Agente del chat de planificación, aislamiento real: segunda cuenta | Observó el negocio **usapeek**, zona **America/Montevideo**, sin horario guardado y con la lista de servicios ya vacía al entrar. No recibió la semana de la primera cuenta (**slotly**: lunes **08:30–17:00**, demás días cerrados). Al no existir una configuración previa en la segunda cuenta, guardó una semana con los siete días cerrados, sin inventar horas. Apareció un único toast, desapareció «Todavía no has guardado un horario» y la recarga recuperó la semana cerrada como configuración existente. |
| Agente del chat de planificación, aislamiento real: regreso a la primera | Cerró la segunda sesión y volvió a la primera mediante Google. Recuperó **slotly**, **America/Montevideo**, los dos servicios originales y exactamente lunes **08:30–17:00**, con el resto cerrado. La escritura de la segunda cuenta no sobrescribió los datos de la primera. |

Las escrituras funcionales reales de planificación quedaron autorizadas por la petición del usuario de que el agente hiciera las pruebas. No se crearon negocios ni se crearon o eliminaron servicios. **Estado final:** la primera cuenta quedó abierta, con su horario original restaurado; la segunda conserva una **nueva configuración guardada con los siete días cerrados**, porque antes no tenía horario. No se restauró la ausencia de configuración en la segunda cuenta y sus servicios no se confunden con los dos de la primera. Esta evidencia real resuelve los pendientes de semana mixta, actualización, semana cerrada, validaciones de UI, recarga, salida, nueva sesión y separación entre cuentas, sin atribuir al entorno sintético resultados del navegador real.

La evidencia local está fuera del repositorio, en `C:/Users/dcalu/.codex/visualizations/2026/10/20/01a15620-54fe-7153-a4ec-ca62821d3c15/weekly-schedule-review/`: `checks.json` actualizado, `invalid-opening.png`, `restored-original-week.png`, `closed-week-after-reload.txt` y `signed-out-redirect.txt`; para el aislamiento se añadieron `second-account-before.txt`, `second-account-saved-after-reload.txt`, `second-account-closed-week.png`, `first-account-after-second-account-save.txt` y `first-account-final.png`. No se copian correos, credenciales ni identificadores privados de esos artefactos a este documento.

### Cierre funcional del Reto 04 en desarrollo

El **20 de octubre de 2026**, las primeras confirmaciones del usuario y las pruebas posteriores ejecutadas por el agente del chat de planificación completan los criterios acordados del horario semanal. Quedan acreditados el guardado y la consulta de la semana, su modificación y persistencia tras recarga y nuevo acceso, las validaciones de UI sin persistir borradores inválidos, la semana completamente cerrada, el toast único, la protección sin sesión, la continuidad de perfiles y servicios y el aislamiento entre dos cuentas reales. Las reglas independientes del backend, los argumentos manipulados, la atomicidad y los guardados sin duplicados conservan además su evidencia automatizada en memoria: **6 archivos, 131 casos correctos y 0 fallos** en la nueva ejecución de planificación.

El **Reto 04 queda cerrado funcionalmente en desarrollo**, sin pendientes funcionales de este alcance. No se ejecutaron pruebas de producción ni de concurrencia OCC del motor cloud, ni un conteo remoto de documentos para estos guardados. Estos límites no se presentan como resultados de las pruebas sintéticas ni se convierten en nuevos requisitos para este cierre. Los resultados anteriores de lint, tipos y build se conservan como evidencia de la implementación; no se repitieron al no haber cambios de código.

El ajuste documental de cierre anterior se limitó a `docs/PROJECT_CONTEXT.md` y al párrafo de estado del Reto 04 en `README.md`, con revisión de su diff. No ejecutó más pruebas ni modificó código, configuración, datos u otros archivos; no hizo commit ni push ni autorizaba publicación. Esa restricción correspondía a aquella petición. El cierre no incorpora múltiples tramos, excepciones, vacaciones/festivos, huecos/turnos, reservas, agenda pública, precios/pagos, empleados, roles ni sincronización externa.

Posteriormente, el **20 de octubre de 2026**, el usuario autorizó expresamente: «Perfecto, revisa el diff y, si está todo correcto, haz el commit y sube el reto 04 a GitHub». Esta autorización permite revisar, hacer commit y push del Reto 04. El resultado de la publicación se verifica y comunica en el chat de planificación.

Esta reconciliación modifica únicamente `PRODUCT.md`, el párrafo de estado del Reto 04 en `README.md` y este documento. Solo se revisó el diff de estos ajustes; no se ejecutaron pruebas ni se modificaron código, configuración, datos u otros archivos, y no se hizo commit ni push desde el chat de implementación durante esta actualización.

## Reto 05: consulta privada de opciones de horario

### Alcance aceptado e implementación

El **20 de octubre de 2026**, el usuario autorizó desde planificación crear este chat de implementación, ejecutar las pruebas disponibles y entregar el resultado para su revisión. Este reto añade al dashboard una sección para elegir un servicio propio y una fecha concreta y consultar opciones potencialmente solapadas de inicio/fin. No crea reservas, no comprueba ocupación y no añade agenda pública, excepciones, múltiples tramos, empleados, precios, pagos ni notificaciones externas.

`components/business-availability.tsx` reutiliza `Field`, `Input`, `NativeSelect`, `Button`, React Hook Form y Zod. El formulario comienza sin servicio ni fecha inventados; muestra hora local IANA, valida campos y lleva el foco al primero inválido. Editar filtros oculta el resultado anterior; una respuesta tardía de esa consulta se descarta. Hay estados distintos de comprobación de acceso, carga, falta de negocio (mensaje en el padre), falta de servicios, configuración semanal ausente, semana cerrada, día cerrado, fecha pasada, duración sin encaje y problema de cambio horario. Los errores conservan campos, se anuncian y permiten reintento. No hay toast de éxito para una lectura. El selector usa paginación por negocio, con carga explícita de más servicios.

`convex/availability.ts` registra una acción pública de lectura `getMyAvailability` con argumentos y retorno validados. Comprueba identidad; su única query interna `getSource` vuelve a comprobar identidad, obtiene el negocio por `subject`/índice y valida que el `serviceId` pertenezca a ese negocio. Servicio inexistente o ajeno devuelve el mismo código `SERVICE_NOT_FOUND`. Una sola lectura transaccional obtiene servicio, zona y semana coherentes. No acepta `ownerId`, `businessId`, duración, zona ni reloj suministrados por cliente, ni devuelve propietarios u horarios ajenos. Las funciones existentes mantienen su autorización independiente.

`convex/lib/availability.ts` es lógica pura con reloj explícito para pruebas. `lib/local-date.ts` valida fechas gregorianas reales de `0001-01-01` a `9999-12-31`, sin Date.parse ni zona del navegador; backend y esquema del formulario aplican esa regla. No admite fechas con hora, offsets, anchuras distintas ni días inexistentes. No se modificó `schema.ts`: los resultados se derivan de documentos existentes, sin tablas de huecos, precarga ni escrituras.

### Decisiones temporales

- **Paso y duración:** los comienzos recorren la hora local cada 15 minutos desde la apertura, sin alinearse a medianoche ni usar duración como paso. Apertura 08:37 y duración 46 producen 08:37–09:23, 08:52–09:38, etc. La duración determina minutos reales entre instantes; el cierre exacto se admite y el posterior se excluye. El bucle procesa como máximo 96 candidatos. La duración se compara con la jornada antes de multiplicar/sumar timestamps: incluso `Number.MAX_SAFE_INTEGER`, ya admitido en servicios, produce lista vacía sin desbordar ni crear un bucle proporcional a la duración.
- **Reloj autoritativo:** la acción obtiene `Date.now()` en el servidor después de leer la fuente. No hay reloj del cliente en la API ni `Date.now()` en una query cacheada. Según la documentación de Convex, el paso del tiempo no invalida una suscripción de query; por ello se eligió una acción de lectura sin caché temporal. Fecha/hoy y día ISO se resuelven en la zona IANA del negocio.
- **Actualización de UI:** al consultar, cada 30 segundos mientras está visible y al recuperar foco, visibilidad o conexión, se solicita una lectura nueva. Cambios reactivos de servicios/semana también invalidan el resultado. Un temporizador retira cada inicio cuando vence, usando hora del servidor más tiempo monotónico `performance.now()`, sin depender del reloj civil del navegador. Se incluye conservadoramente la duración completa de la petición: cerca de un límite puede ocultar una opción ligeramente antes; la latencia no prolonga la visualización de una opción pasada. Recuperar foco/visibilidad descarta primero la respuesta anterior. Las respuestas de solicitudes obsoletas se ignoran; un intento pendiente no bloquea futuras actualizaciones.
- **Zona y DST:** se añadió únicamente `@js-temporal/polyfill` **0.5.1** y su dependencia transitiva `jsbi`; se importa solo en el backend. Su conversión IANA con `disambiguation: "reject"` distingue horas inexistentes y repetidas; evita implementar conversiones manuales u offsets fijos. La política deliberadamente conservadora omite comienzos/finales ambiguos o inexistentes y opciones que cruzan un cambio de offset. Si apertura o cierre no identifican un instante único, devuelve `time_change` sin inventar un límite. Las opciones restantes conservan una duración real coherente con sus etiquetas locales. La UI explica las omisiones. Esto puede excluir opciones físicamente posibles en un día de transición; no pretende resolver reservas a ambos lados de una hora repetida en este reto. Se utiliza la base IANA del runtime y no se guarda un offset por negocio.

### Evidencia y ejecutores

Todo lo siguiente fue ejecutado por **el agente de este chat de implementación**, salvo la revisión visual independiente señalada. Las pruebas de memoria, fixture local y cloud se distinguen expresamente.

| Comprobación | Resultado y límite |
| --- | --- |
| Documentación | Context7: Convex (reloj y reactividad), JS Temporal Polyfill (rechazo de ambigüedad y aritmética de minutos) y React Hook Form. Se leyó la guía local `use-client` de Next.js 16.4.2 antes de escribir UI. Skills de Convex para implementación/revisión y checklist de React aplicados. |
| Suite automatizada | **7 archivos, 177 casos correctos y 0 fallos**: 131 existentes más 46 del Reto 05. `convex-test` con identidades y documentos sintéticos en memoria; sin escrituras cloud. |
| Generación y reloj controlado | Paso 15 desde apertura 08:37, duración 46, alternativas solapadas, cierre exacto/posterior, días/semana cerrados, semana sin configurar, duración excesiva y máxima admitida, día completo acotado a 96, fecha pasada y hoy, igualdad de inicio con reloj y exclusión 1 ms después, cambio de fecha entre UTC y Montevideo, UTC/Kathmandu y límite de año 9999. |
| Fechas, zona y DST | Formato estricto/fechas imposibles, años bisiestos; primavera y otoño de Nueva York, extremos inexistentes/repetidos, salto de media hora de Lord Howe y fecha suprimida de Samoa. No se usan solo offsets fijos ni se corrigen horas inválidas implícitamente. |
| Autorización en memoria | Acción y query interna sin sesión/sin negocio, servicio de otra cuenta o inexistente, propietarios con igual correo, argumentos adicionales o tipos manipulados y reloj del servidor entre llamadas. Lecturas no modifican los documentos de negocio, servicio o semana. Esto no prueba firmas JWT ni concurrencia del motor cloud. |
| Sincronización de funciones | `pnpm exec convex dev --once` correcto y destino anunciado **daniel-caluff:slotly:dev/slotly**, deployment **determined-poodle-377**. Se regeneraron tipos. No hubo migración de datos ni nueva tabla. |
| Navegador real, primera cuenta, solo lectura | Sesión real existente: negocio slotly, America/Montevideo, servicios de 30 y 46 minutos y lunes 08:30–17:00, resto cerrado. Para lunes **2026-10-26**, 30 minutos: **33 opciones**, desde 08:30–09:00 hasta **16:30–17:00**; 46 minutos: **31 opciones**, desde 08:30–09:16 hasta **16:00–16:46**. Los finales posteriores quedan fuera. |
| Navegador real, otras fechas y zona | **2026-10-27** devuelve día cerrado; **2026-10-19** devuelve fecha pasada; hoy **2026-10-20** devuelve día cerrado. Sobrescritura temporal de zona del navegador a **Asia/Tokyo**, conservando servicio/fecha: mismos 31 resultados de Montevideo. La sobrescritura se retiró. No se alteraron perfiles, servicios, semanas ni sesiones. |
| Protección sin cookies | Petición HTTP independiente a `/dashboard`: contenido con redirección a `/sign-in` y ausencia de la sección privada. No se cerró la sesión real ni se atribuye esta petición a una prueba interactiva de logout. |
| Fixture de UI sintético local | Componentes reales con callback local, sin proveedor ni cliente Convex: carga, sin servicios, semana ausente/cerrada, día cerrado, pasado, sin encaje, cambio horario, errores de red/sesión/negocio/servicio/fecha, carga diferida y descarte al editar durante la petición. Formulario vacío: mensajes asociados y foco en servicio. Campos conservados ante errores. |
| Actualización temporal en fixture | Reloj de respuesta sintético en 2030 frente al navegador de 2026: una opción visible venció tras 1,7 s sin nueva consulta (mismo contador), demostrando el temporizador independiente del reloj civil. En otra observación el contador avanzó al llegar la actualización de 30 segundos y no reintrodujo el inicio vencido. No equivale a esperar al siguiente lunes con datos reales. |
| Responsive y accesibilidad | Capturas reales en escritorio **1440×1000** y móvil **390×844**; sin overflow horizontal (scrollWidth = 390), controles de **36px** y radio **6px**, resultados en 3/2 columnas y estados anunciados. Detector sobre los dos TSX: `[]`. Consola del fixture sin errores. |
| Build y consistencia | `pnpm lint`, `pnpm typecheck`, `pnpm exec tsc --noEmit --project convex/tsconfig.json`, `pnpm build` y `git diff --check` correctos. La pasada final, incluidos los 177 tests, se ejecutó tras retirar el fixture; el build no contiene ruta de pruebas. |
| Revisión visual independiente (subagente) | Las tres capturas reales y los TSX coinciden con el sistema existente; no pidió cambios UI. El único fix fue registrar Reto 05 en `PRODUCT.md`; la pasada posterior lo puntuó resuelto (`ship` limitado al arreglo documental). Los estados sin captura se revisaron estáticamente, sin atribuir al revisor las pruebas de navegador del agente principal. |
| Revisión documental independiente (subagente) | `ship` para la extensión: reutiliza paleta, Geist, primitivas, 36px/6px y composición del dashboard; no exige cambiar `DESIGN.md` ni el sidecar. Se conservó la deriva previa: Overview de etapa 1, radios antiguos del ejemplo del panel en sidecar y brief centrado en Reto 04. No se canonizó ni reparó como parte de este reto. |

Las capturas reales, `checks.json`, `ui-checks.json` y la fuente del fixture retirada se guardaron fuera del repositorio, en `C:/Users/dcalu/.codex/visualizations/2026/10/20/01a15aa0-5c9e-7091-8bc4-63ae4308094d/availability/`. Las capturas sintéticas o contadores no se presentan como datos cloud.

### Límites de la entrega

La segunda cuenta real no se abrió en este chat; conserva su estado previo (sin servicios y semana cerrada), sin modificaciones para habilitar pruebas. Los estados que requerían cambiar datos, el aislamiento por serviceId, las fechas manipuladas y DST se verificaron en memoria o fixture, no mediante escrituras sobre cuentas reales. La sesión existente permitió las lecturas reales de la primera cuenta sin intervención humana. No se fabricaron usuarios, tokens o sesiones, no se usó `test:local` y no se tocaron secretos, variables, respaldos ni producción.

La entrega inicial dejó el Reto 05 implementado y verificado, listo para revisión desde planificación, sin commit, push, PR ni despliegue de producción. La restricción de publicación correspondía a esa entrega; la autorización posterior se registra a continuación. La pasada de feedback de Next.js no retuvo incidencias verificadas que requirieran informe.

### Cierre funcional y autorización de publicación del Reto 05

El **20 de octubre de 2026**, el agente del chat «Retomar planificación de Slotly» contrastó estáticamente el código y las evidencias entregadas y no encontró bloqueantes para validar el alcance acordado en desarrollo. Con esa revisión, el **Reto 05 queda cerrado funcionalmente en desarrollo**; los Retos 01–04 conservan su cierre anterior. No se añaden funcionalidades ni se amplía el alcance.

La revisión de planificación no ejecutó nuevas pruebas ni atribuye confirmaciones manuales al usuario. Se conservan como evidencia de la implementación los **177 tests correctos**, lint, tipos de Next/Convex, build y las lecturas reales de la primera cuenta ya registradas. El aislamiento del nuevo endpoint por `serviceId`, los argumentos manipulados y DST mantienen su evidencia en memoria o fixture: no se convierten en pruebas entre dos cuentas cloud ni en pruebas reales de cambios estacionales. La segunda cuenta real no se abrió durante este reto. Estos límites permanecen explícitos y no impiden el cierre del alcance revisado.

Posteriormente, el usuario autorizó expresamente: «Perfecto, revisa el diff y, si está todo correcto, haz el commit y sube el reto 05 a GitHub». Esta autorización permite revisar, hacer commit y push del Reto 05. El resultado de la publicación se verificará y comunicará en el chat de planificación; no se anticipa aquí un hash ni un resultado aún no comprobado. No autoriza otra funcionalidad ni un despliegue de producción.

Esta reconciliación se limita al estado del Reto 05 en `docs/PROJECT_CONTEXT.md`, `README.md` y `PRODUCT.md`. Solo se revisó el diff documental; no se ejecutaron nuevas pruebas de runtime ni se modificaron código, configuración, dependencias, datos u otros archivos. El chat de implementación no hizo commit ni push durante esta actualización; la revisión final y publicación quedan a cargo del chat de planificación conforme a la autorización anterior.

## Reto 06: creación y listado privado de citas

### Alcance aceptado e implementación

El **20 de octubre de 2026**, el usuario autorizó desde «Retomar planificación de Slotly» abrir este chat de implementación y ejecutar las pruebas disponibles, especialmente concurrencia. Se comprobó el árbol limpio en `main`, commit `8e646584b1209a6a2f2861176d92e03429ab6e6e`. Los Retos 01–05 estaban publicados. El alcance es una agenda por negocio con capacidad de una cita a la vez, compartida por **todos** sus servicios; no es una capacidad independiente por servicio.

La sección «Citas» del dashboard permite elegir servicio propio, fecha y una opción libre, escribir únicamente el nombre del cliente y confirmar. El listado de la fecha contiene todos los servicios, ordenados por inicio, con cliente, servicio, estado confirmado y principio/fin en la zona IANA del negocio. Se puede consultar una fecha pasada o cerrada para ver sus citas guardadas aunque no ofrezca nuevas opciones.

`convex/appointments.ts` añade `createMyAppointment` y `listMyAppointments`, con argumentos/retornos validados y autorización independiente por identidad y negocio propio. `appointments` guarda `businessId`, `serviceId`, nombre del servicio como instantánea, nombre normalizado del cliente, fecha local, instantes `start`/`end` y estado literal `confirmed`. No acepta propietario, negocio, duración, fin, zona, estado ni reloj desde el cliente. La instantánea del servicio evita una lectura por fila y conserva la etiqueta de la cita. El nombre aplica NFC, recorta/compacta espacios, admite 1–100 caracteres y rechaza caracteres de control/formato restantes; frontend y backend comparten el esquema.

La mutación vuelve a leer servicio propio y semana vigente y reutiliza `generateAvailability` del Reto 05: fecha real, inicio estrictamente futuro al confirmar, paso de 15 minutos **desde apertura**, cierre exacto, duración real del servicio, zona IANA y rechazo conservador de extremos ambiguos/inexistentes o cruces de offset. El fin se obtiene de esa lógica en backend. Las citas no se recalculan ni se eliminan al cambiar la semana. Una modificación sintética de duración también comprobó que las citas previas conservan el fin original y las nuevas usan la duración vigente; no se añadió una API para editar servicios.

`convex/availability.ts` incorpora ocupación en su lectura consistente y excluye solapes de cualquier servicio del negocio. Sigue siendo una acción de lectura con reloj del servidor. La consulta es una vista previa: la mutación repite la comprobación atómica aunque la opción se hubiera mostrado disponible.

### Transacción y límites de lectura

`convex/lib/appointmentData.ts` resuelve el negocio por el `subject` verificado y concentra la lectura indexada `by_businessId_and_date`. La creación lee **todo el rango negocio/fecha** e inserta en la misma mutación, incluido el caso de rango vacío. Una inserción concurrente dentro del rango invalida esa lectura para OCC; el motor reintenta y vuelve a comprobar el conflicto. No hay comprobación separada seguida de una inserción ciega, acción de escritura, bloqueo en memoria ni cola de aplicación.

Se usa la condición simétrica `a.start < b.end && b.start < a.end`. Rechaza igualdad, solape parcial y contención en ambos sentidos, y admite que un inicio coincida exactamente con el fin anterior. La lectura por negocio/fecha incluye todos los servicios; dos negocios distintos usan rangos separados. Dos intervalos compatibles del mismo día pueden provocar un reintento de OCC, pero ambos pueden confirmarse.

La lectura está acotada a **1441 documentos con rechazo explícito si supera 1440**, sin paginación ni truncamiento silencioso. Cada cita válida permanece dentro de una fecha local, con inicio en minuto entero, duración positiva entera y sin extremos ambiguos; incluso cambiando apertura/paso posteriormente, como máximo caben 1440 comienzos locales no solapados en ese día. El elemento adicional detecta una base saturada/inconsistente: consulta, creación y disponibilidad fallan cerradas, en lugar de ocultar conflictos fuera del límite. Se probó ese rechazo con 1441 documentos sintéticos. El listado devuelve el día completo y también respeta esa comprobación.

### Interfaz y actualización

`components/business-availability.tsx` conecta acción, mutación y listado reactivo por fecha. Los cambios de servicios, semana y citas invalidan la vista previa; se conservan las actualizaciones cada 30 segundos y al recuperar foco/visibilidad/conexión, la retirada de opciones mediante reloj monotónico y el descarte de respuestas antiguas. La versión de los datos invalida las opciones durante la nueva consulta **sin desmontar el formulario de confirmación**, conservando el nombre y los errores.

`components/appointment-form.tsx` reutiliza shadcn/ui, RHF y Zod, con errores asociados a cada campo y foco al corregirlos. Un bloqueo inmediato mediante ref cubre envíos rápidos incluso antes del siguiente render; durante el guardado se deshabilitan confirmación y filtros. Antes de enviar vuelve a comprobar que el inicio esté entre las opciones actuales y siga siendo futuro según el reloj recibido más tiempo monotónico. Si otra cita ocupa el intervalo, conserva el nombre, identifica el horario no disponible, anuncia el error y actualiza las opciones. La garantía final sigue siendo la transacción del servidor. Tras el éxito real limpia nombre/horario, devuelve el foco al selector y emite solo «Cita confirmada» mediante el Toaster existente.

`components/appointment-list.tsx` formatea instantes con `Intl.DateTimeFormat` y la zona del negocio, sin usar la del navegador. Se conservaron paleta, Geist, controles de 36px, radio de 6px y filas responsive. No se añadieron dependencias.

### Evidencia ejecutada

Ejecutor de las comprobaciones de esta subsección: **agente de este chat de implementación**. No hubo subagentes ni confirmaciones manuales nuevas del usuario durante esa implementación. Se consultó Context7 para transacciones/OCC, backend local y RHF, la guía local `use-client` de Next.js 16.4.2 y las skills de Convex, revisión de React y verificación del flujo. La revisión y las pruebas posteriores de planificación se registran por separado más abajo.

| Entorno y comando/comprobación | Resultado y límite |
| --- | --- |
| Memoria: `pnpm test` | **8 archivos, 234 casos correctos, 0 fallos**: 177 existentes y 57 de citas. Cubre creación/listado/persistencia, nombre NFC/espacios/controles, sin sesión/sin negocio, propietarios con igual correo, servicio ajeno/inexistente, argumentos manipulados, fecha/zona/DST, pasado/igualdad con reloj, jornada/paso/cierre, duración excesiva, opciones obsoletas, conservación de instantes, todos los solapes y fallo cerrado al superar el límite. |
| Memoria: solicitudes simultáneas | Mismo intervalo, parcial, servicios distintos, consecutivas, separadas y negocios distintos. Resultados y documentos finales correctos. `convex-test` simula la base y puede serializar operaciones internamente; **Promise.all por sí solo no prueba OCC real**. |
| Motor real: `pnpm test:appointments:engine --report <ruta absoluta>` | **60 solicitudes en 18 carreras**, tres rondas de seis escenarios. Binario oficial cacheado `precompiled-2026-10-10-72ce13c` y SQLite nuevos, con puertos loopback dinámicos y datos/identidades sintéticos. Se desplegaron las funciones del repositorio en ese motor aislado. |
| Motor real: incompatibles | Cada ronda: mismo intervalo **10 solicitudes → 1 éxito/9 SLOT_TAKEN/1 documento**; parcial **2 → 1/1/1**; servicios de 30 y 46 compitiendo **2 → 1/1/1**. No hubo documentos adicionales o escrituras parciales. |
| Motor real: compatibles | Cada ronda: consecutivas, separadas y negocios distintos **2 solicitudes → 2 éxitos/0 rechazos/2 documentos** por escenario. Cada lista quedó aislada por negocio; los IDs devueltos coincidieron exactamente con los documentos finales. |
| Motor real: competición y persistencia | Clientes HTTP independientes, `skipQueue: true` y barrera que libera todas las peticiones juntas. Se midió `maxInFlight = 10` o `2`, respectivamente: el harness no serializó las solicitudes. Se comprobaron opciones libres después de guardar, rechazo anónimo, normalización, conservación de instantes al cerrar semana y persistencia tras detener/reiniciar el mismo motor. Esto acredita ejecuciones concurrentes del motor **local**, no métricas internas de reintentos ni concurrencia cloud. |
| Aislamiento y limpieza del motor | El script no lee `.env.local` ni `.convex`, no cambia el destino de la app y no crea cloud. Copia fuentes/dependencias a un directorio temporal nuevo; solo allí sustituye `auth.config.ts` por proveedores vacíos para usar identidades administrativas sintéticas. Genera su propia clave sin imprimirla. Detiene el proceso y comprueba raíz/prefijo/marcador antes de eliminar únicamente su directorio. Se conservaron la base local antigua y sus respaldos. |
| Cloud: `pnpm exec convex dev --once --typecheck enable` | Correcto; destino anunciado **daniel-caluff:slotly:dev/slotly**, deployment **determined-poodle-377**. Nueva tabla/índice y funciones sincronizados, tipos regenerados; sin migrar ni escribir negocios, servicios, horarios o citas. No se tocó producción. |
| Navegador con Clerk/cloud, solo lectura | Sesión real existente de la primera cuenta. Se conservaron perfil slotly, America/Montevideo, servicios de 30/46 minutos y lunes 08:30–17:00, resto cerrado. Para **2026-10-26**, 30 min: **33 opciones**; 46 min: **31**, última **16:00–16:46**. Listado del día vacío. Con zona del navegador temporal **Asia/Tokyo**, se conservaron las 31 opciones de Montevideo; sobrescritura retirada. |
| Protección sin sesión | Cliente HTTP anónimo contra el cloud dev: `appointments:listMyAppointments` rechazado con `UNAUTHENTICATED`. Petición independiente sin cookies a `/dashboard`: redirección a `/sign-in`, sin sección privada. No se cerró la sesión existente. La creación anónima se verificó en memoria y motor aislado. |
| UI sintética: componentes reales sin cliente Convex | Selección, guardado/listado, doble envío rápido con **una llamada/una fila**, filtros deshabilitados durante guardado, toast único (conteo **1**), limpieza y foco tras éxito. Validación vacía: foco en servicio, luego horario y nombre; errores asociados mediante `aria-describedby`. Conflicto `SLOT_TAKEN`: nombre conservado, horario marcado no disponible y opciones actualizadas. Error de red: conserva nombre/inicio y permite reintento. |
| UI sintética: lecturas y tiempo | Estados de carga, sin servicios, semana ausente/cerrada, día cerrado, pasado, sin opciones, cambio horario y error de lectura. Respuesta demorada al cambiar servicio: solo aparece el servicio actual. Opción seleccionada con vencimiento a 2,5 s retirada y confirmación deshabilitada, sin nueva lectura (**18 antes/después**), aunque el reloj sintético estaba en 2030 y el navegador en 2026. Actualización periódica observada: **28 → 30 lecturas en 62,4 s**, escrituras constantes en 5. |
| UI responsive y consola | Escritorio **1440×1000** y móvil **390×844**; viewport DOM móvil de 390, ancho de contenido 375 por scrollbar, sin overflow horizontal; controles de 36px y radio de 6px. Capturas mediante CDP para conservar el viewport real (la captura genérica del navegador escalaba la imagen). Consola del fixture sin errores. Se restauraron viewport y zona temporales. |
| Comprobaciones finales | `pnpm lint`, `pnpm typecheck`, `pnpm exec tsc --noEmit --project convex/tsconfig.json`, `pnpm build` y `git diff --check`: correctos tras retirar el fixture. El build final no contiene rutas de pruebas. |

El script reproducible queda en `scripts/test-appointments-engine.mjs`. El informe JSON, capturas, `ui-checks.json`, `cloud-checks.json`, snapshot y fuente del fixture retirada se guardaron fuera del repositorio, en `C:/Users/dcalu/.codex/visualizations/2026/10/20/01a15ac1-46aa-7690-9bea-c837b2943c96/appointments/`. Los artefactos sintéticos se identifican como tales; no contienen tokens ni credenciales administrativas.

### Estado y límites de la entrega inicial de implementación

Al terminar la implementación, el Reto 06 quedó implementado en desarrollo y listo para revisión; **esa entrega inicial no declaró el cierre funcional**. No se atribuyen los guardados del fixture a Convex ni las identidades administrativas del motor aislado a sesiones de Clerk. Durante la implementación, las escrituras y carreras se probaron en un motor real aislado; el navegador con Clerk/cloud se limitó a lecturas para no dejar citas sintéticas en cuentas reales. No se abrió la segunda cuenta real ni se modificaron sus datos. No se ejecutó `test:local`, no se fabricaron tokens o sesiones reales, no se alteraron variables/secretos/respaldos, y no hubo commit, push, PR o producción. La escritura real posterior, autorizada por el usuario y ejecutada por planificación, se detalla a continuación.

No incluye edición, cancelación o reprogramación, agenda pública, módulo separado de clientes, correo/teléfono, pagos, correos de confirmación, empleados, múltiples agendas, excepciones ni múltiples tramos. La pasada final de feedback de Next.js no retuvo incidencias verificadas que requirieran informe.

### Revisión de planificación y cierre funcional del Reto 06

El **20 de octubre de 2026**, el agente del chat «Retomar planificación de Slotly» revisó estáticamente el código, el script y los informes de implementación y no encontró bloqueantes. También confirmó mediante lectura del sistema que no quedaban procesos ni directorios temporales `slotly-appointments-engine-*`. **No repitió** los 234 tests, las 60 solicitudes en 18 carreras del motor real local ni lint, tipos o build: esas comprobaciones conservan como ejecutor al **agente de implementación**, no a planificación ni al usuario.

Para completar la creación con Clerk/cloud, planificación explicó que la cita quedaría guardada porque el alcance no incluye cancelación y pidió elegirla. El usuario autorizó expresamente: **«usa el nombre de cliente que quieras y selecciona el servicio y fecha que quieras»**. Esta autorización permitió la siguiente escritura real de planificación; no cambia el carácter de solo lectura de las comprobaciones cloud anteriores de implementación.

Todas las pruebas nuevas de la tabla siguiente fueron **ejecutadas por el agente de planificación**, mediante el dashboard y una sesión real existente de Clerk contra **dev/slotly**. No son pruebas ejecutadas por el usuario ni por el chat de implementación.

| Comprobación real de planificación | Resultado |
| --- | --- |
| Estado inicial | Primera cuenta: slotly, America/Montevideo, servicios de 30 y 46 minutos y lunes 08:30–17:00, resto cerrado. Para **2026-10-26**, «servicio 2 · 30 min» mostraba **33 opciones** y listado vacío. |
| Creación desde el formulario real | Se confirmó **una cita** para **«Prueba de validación Reto 06»**, «servicio 2» de 30 minutos, lunes **2026-10-26 09:30–10:00 America/Montevideo**. Los filtros se deshabilitaron durante el envío. Apareció «Cita confirmada» **una vez**, el formulario quedó limpio con foco en el selector y el listado reactivo mostró una única fila. |
| Disponibilidad del mismo servicio | Pasó de **33 a 30 opciones**: se retiraron 09:15–09:45, 09:30–10:00 y 09:45–10:15. Se conservaron las consecutivas **09:00–09:30** y **10:00–10:30**, comprobando el fin excluido. |
| Persistencia tras recarga | Después de recargar y volver a consultar servicio/fecha, se recuperó **una fila** con el cliente, servicio y horas correctos, y las **30 opciones** restantes. Los atributos `datetime` del listado fueron `2026-10-26T12:30:00.000Z` y `2026-10-26T13:00:00.000Z`. |
| Agenda compartida entre servicios | Sin crear otra cita, se consultó «servicio 1 · 46 min» para la misma fecha: **26 opciones**, frente a las 31 anteriores. Se retiraron 08:45–09:31, 09:00–09:46, 09:15–10:01, 09:30–10:16 y 09:45–10:31. Permaneció **10:00–10:46** y el listado siguió mostrando la cita del servicio 2. Se verificó ocupación compartida contra cloud. |
| Conservación de datos y límites | Perfil, servicios y semana se recuperaron intactos tras la recarga. Planificación no abrió ni modificó la segunda cuenta y no ejecutó carreras concurrentes contra cloud. La evidencia de concurrencia real permanece limitada al motor local aislado de implementación. |

La evidencia de planificación está fuera del repositorio, en `C:/Users/dcalu/.codex/visualizations/2026/10/20/01a15620-54fe-7153-a4ec-ca62821d3c15/appointments-review/`: `checks.json`, `before-create.txt`, `before-create-ready.txt`, `create-response.txt`, `after-create.txt`, `after-reload.txt`, `final-cross-service.txt`, `created-real-appointment.png` y `real-appointment-after-reload.png`. No se copian identificadores privados ni credenciales a este documento.

Con la revisión y la prueba completa de creación, actualización del listado/disponibilidad, recarga y ocupación entre servicios con Clerk/cloud, el **Reto 06 queda cerrado funcionalmente en desarrollo dentro del alcance acordado**, sin pendientes funcionales de ese alcance. Los límites de concurrencia cloud y segunda cuenta real permanecen explícitos y no se presentan como pruebas ejecutadas.

**Estado final de los datos:** la primera cuenta conserva **una cita autorizada** del servicio 2 para «Prueba de validación Reto 06», el **26 de octubre de 2026 de 09:30 a 10:00 America/Montevideo**. No se eliminó ni se creó una segunda cita. La segunda cuenta conserva su estado previo, sin servicios y con semana totalmente cerrada. Esta escritura no alteró el perfil, los servicios ni los horarios existentes.

La reconciliación documental de cierre se limitó a `docs/PROJECT_CONTEXT.md` y al estado pertinente de `README.md` y `PRODUCT.md`. Solo se revisó su diff, sin nuevas pruebas de runtime ni cambios en código, otras referencias, configuración o datos. No incluyó commit, push, PR o producción ni autorizaba publicación Git; **esa restricción correspondía a aquella petición**. La autorización posterior se registra a continuación.

### Autorización posterior de publicación del Reto 06

Posteriormente, el **20 de octubre de 2026**, el usuario autorizó expresamente: **«Perfecto, revisa el diff y, si está todo correcto, haz el commit y sube el reto 06 a GitHub»**. Esta autorización permite revisar el diff y, si es correcto, hacer commit y push del Reto 06. La revisión final, el commit y el push quedan a cargo de planificación; el resultado de la publicación se verificará y comunicará allí. No se anticipa un hash ni un resultado aún no comprobado. La autorización no incorpora otras funcionalidades ni un despliegue de producción.

## Mejora UX/UI previa al Reto 07 — implementación del 20 de octubre de 2026

### Alcance y decisiones aceptadas

El usuario autorizó implementar una mejora completa de la experiencia de las funciones existentes, manteniendo claro/verde, marca, Geist y los límites de los Retos 01–06. La base se comprobó limpia en `main`, commit `a7acce642240299a59b8b4cf26ee4e65bfd591b8` (`feat: add appointments with overlap protection`), con los Retos 01–06 publicados. El alcance de aquella implementación inicial no incluía el Reto 07, nuevas operaciones, commit, push, PR ni producción. La autorización posterior de commit/push del lote UX/UI y filtros se registra al final.

Se eligió navegación superior compacta para **Agenda, Servicios, Horario y Negocio**: cuatro destinos no necesitan una barra lateral permanente y dejan más ancho para el trabajo. En móvil los destinos ocupan una segunda fila con icono y etiqueta. La estructura privada tiene cabecera y área de trabajo; ya no utiliza el gran saludo ni el pie de la portada.

### Implementación observada

- **Agenda:** entrada en `/dashboard`; fecha inicial calculada según la zona IANA del negocio, independiente del huso del navegador. `fecha=AAAA-MM-DD` permite enlaces directos; una fecha inválida muestra aviso y hoy. Anterior, siguiente y Hoy conservan el calendario civil y su rango. El listado diario incluye todos los servicios, sin consultar disponibilidad ni seleccionar servicio previamente. Hora inicial/final, cliente, servicio y estado confirmado tienen jerarquía cronológica; cero citas tiene un estado propio.
- **Nueva cita:** panel no modal a la derecha en escritorio y antes del listado en móvil. Hereda la fecha de la agenda al abrirse por primera vez; su fecha es independiente después, con enlace al día del borrador si difiere. Elegir/cambiar servicio o fecha carga horarios automáticamente. Una única confirmación requiere valores válidos y una opción actual. Se mantienen el bloqueo inmediato, las validaciones del servidor, errores por campo, foco después del envío, nombre/horario ante fallos y toast único tras éxito real.
- **Servicios:** lista principal con nombre/duración, paginación existente y Nuevo servicio bajo demanda. Sin edición ni borrado.
- **Horario:** editor en vista propia; días cerrados simplificados y adaptación móvil estructural. Conserva validación, guardado atómico de la semana completa y protección del borrador frente a actualizaciones reactivas. Muestra estado limpio/pendiente/guardando/error/guardado y una única acción Guardar semana.
- **Negocio:** nombre y zona existentes en lectura; primer acceso conserva el formulario de creación y la guía hacia servicios/horario/agenda. No hay acción de edición.
- **Navegación y borradores:** `vista=servicios|horario|negocio` y `fecha` mediante historial nativo integrado con `useSearchParams` de Next.js. Las vistas permanecen montadas para conservar borradores al navegar y usar atrás/adelante. Los paneles se ocultan sin borrar formularios. Escape los cierra y devuelve el foco a su acción. Los enlaces fuera del espacio abren un diálogo HTML accesible; recarga/cierre de pestaña usa `beforeunload`. No se guarda el borrador en localStorage ni en una caché compartida. La recuperación transitoria de sesión suspende queries conservando el estado de la pestaña; el enlace de acceso abre otra pestaña y el estado se aísla por usuario Clerk.
- **Lecturas y tiempo:** opciones ligadas a servicio/fecha/revisión/apertura del panel; se descartan respuestas tardías y resultados anteriores. Poll cada 30 segundos y actualización al recuperar foco/visibilidad/conexión; vencimiento mediante reloj del servidor más tiempo monotónico. Se pausa disponibilidad cuando Agenda o el panel no están visibles. Cambios de servicios/semana/citas/zona invalidan opciones. No cambió el motor de ocupación ni sus garantías.

No se editaron funciones, tablas, índices, autorización ni destino de Convex. Permanecen agenda compartida, fin excluido, comprobación/inserción atómica y OCC. No se modificaron secretos, variables ni sesiones. No hubo escrituras cloud: se conserva la cita autorizada del Reto 06 y no se alteró la segunda cuenta.

### Verificación por el agente de implementación de UX/UI

| Comprobación | Evidencia y límite |
| --- | --- |
| Tests | `pnpm test`: **9 archivos, 239 casos correctos, 0 fallos**. Incluye los 234 previos y 5 casos nuevos sobre fecha civil, bisiestos, medianoche según zona, rango y enlaces. No se repitieron las 60 solicitudes/18 carreras del motor local del Reto 06: no se modificó ese camino. |
| Lectura real con sesión existente | Agenda del **26/10/2026** muestra la única cita **09:30–10:00 America/Montevideo**, cliente «Prueba de validación Reto 06», servicio 2, sin seleccionar servicio. Panel: **30 opciones de 30 min** y **26 de 46 min**; no se confirmó otra cita. |
| Fechas y navegación reales | Hoy=20/10 en Montevideo incluso con override del navegador a Asia/Tokyo. Anterior/siguiente y cambio por teclado; acceso directo, vínculos entre vistas y atrás/adelante conservan la fecha. Borrador local de servicio conservado entre vistas y al regresar; se limpió sin enviarlo. |
| Cuenta y protección | UserButton oficial abre administrar cuenta/cerrar sesión. Chrome sin sesión redirige desde Horario a `/sign-in` con destino conservado; petición sin cookies contiene redirección de streaming y ningún encabezado privado. No se volvió a ejecutar registro, Google ni cierre de la sesión real en esta tarea. |
| Componentes reales con fixture sintético temporal | Sin cliente Convex ni escrituras cloud. Doble clic: **una llamada/una fila/un toast**, limpieza y foco en horario tras éxito; conflicto `SLOT_TAKEN`: nombre conservado, opción marcada no disponible, foco y confirmación bloqueada. Error de red conserva nombre/inicio y permite reintento. Cerrar/reabrir/cambiar de vista conserva borrador. |
| Estados y reloj sintéticos | Carga, sin servicios, semana ausente/cerrada, día cerrado, pasado, sin encaje, cambio horario y error de lectura con reintento. Respuesta tardía del servicio A no reemplaza las dos opciones del B. Opción vencida retirada automáticamente en segundos, conserva nombre, marca horario no disponible y bloquea confirmación con reloj sintético 2030, distinto del navegador. |
| Servicios y semana sintéticos | Error de servicio conserva nombre/duración, cerrar/reabrir devuelve foco al nombre. Cambios semanales sobreviven al cambio de vista; éxito guarda una vez y muestra estado guardado; fallo conserva semana y muestra error. Escape/Seguir editando en el diálogo de salida conservan borrador; Salir sin guardar navega explícitamente. |
| Limpieza | Fixture temporal `/ux-check` y sus callbacks retirados antes de las comprobaciones finales. Pestañas de prueba cerradas; sin nuevas dependencias, infraestructura, datos reales ni cambios en Convex. |

Las capturas se conservan fuera del código en `C:/Users/dcalu/.codex/visualizations/2026/10/20/01a15af6-d920-7b10-9b31-1bbd082297d0/slotly-ux/`. Viewports comprobados: **1440×1000**, **390×844**, **1280×720** y ancho real posterior **1543×884**. Capturas full-page de paneles y semana incluyen más alto que el viewport; la barra sticky de guardado permanece en el borde del viewport. No hay overflow horizontal a 390px. Se restauraron tamaño/zona temporales del navegador. El detector manual de Impeccable sobre los archivos UI cambiados obtuvo `[]` (sin hallazgos). La revisión visual independiente y las comprobaciones finales se detallan debajo.

Límites: los envíos se ejercitaron únicamente con callbacks sintéticos; las garantías backend conservan además la suite en memoria existente. No se forzó pérdida/recuperación real de sesión, carreras cloud, segunda cuenta, pruebas móviles en dispositivo físico ni el aviso nativo de recarga/cierre. El usuario descartó un borrador del fixture durante un bloqueo de la automatización con el aviso nativo inicial; no eran datos reales. El diálogo final de enlaces se verificó después con Escape y salida explícita.


### Cierre técnico y revisión independiente

- **Comprobaciones finales:** `pnpm lint`, `pnpm typecheck`, `pnpm test` y `pnpm build` terminaron con código **0** después de retirar el fixture. La suite queda en **239/239**. El último build incluye las correcciones del revisor y genera únicamente las rutas reales: no aparece `/ux-check`. `git diff --check` también pasa. No hubo commit, cambios staged, push, PR ni despliegue.
- **Revisión Impeccable independiente:** examinó las ocho capturas de escritorio/móvil/anchos reales y el código, sin navegador ni tests propios. Pidió proteger servicio/fecha antes de completar cliente/horario, alinear el wrapper del selector semanal y actualizar la documentación. Después verificó los tres arreglos como **resolved**, sin regresiones materiales observadas en ese lote, con disposición **`ship`**. El dictamen se limita a esas correcciones; no constituye otra prueba de los flujos interactivos. Se añadió `draft-selection-guard.png`, con diálogo visible y horario/cliente vacíos. La definición `.toml` real del revisor se leyó en el pase final y coincidió con el contrato alternativo usado inicialmente.
- **Evidencia de las correcciones por implementación:** selección de solo servicio dispara aviso al salir; selección de solo fecha (27/10), sin servicio ni cliente, también lo dispara y se conserva al navegar a Servicios y volver. En móvil, wrapper y select miden **128px**, borde derecho **374px**, flecha entre **344–360px**, texto Abierto/Cerrado completo y sin overflow. Se cerraron las pestañas temporales y se dejó la Agenda del 26/10 abierta, limpia, con la sesión original.
- **Documentación:** documentador independiente actualizó `DESIGN.md`, `.impeccable/design.json` y el brief anterior del horario a la composición real. Validó JSON, referencias, secciones y coherencia sin ejecutar pruebas del constructor. Conservó una deriva histórica fuera de alcance: el snippet antiguo «Panel de cuenta» del sidecar todavía contiene radios 16/12px frente a los 6px del código; no se amplió esta tarea para repararlo.
- **Entorno de desarrollo:** se observó CSS obsoleto tras cambios con Next.js/Turbopack y el loader Tailwind; reiniciar el servidor regeneró los estilos. Tras retirar el fixture se regeneró también la caché de desarrollo. La caché anterior se conservó de forma reversible dentro de `.next/dev-stale-ux` (excluida de Git), sin tocar `.convex`, respaldos, configuración ni destinos. El candidato de feedback conserva solo hechos anónimos del CSS obsoleto; el formulario de revisión no envía nada sin acción del usuario.

El resultado queda listo para revisión del usuario en local. Permanecen los límites indicados arriba: no se ejecutaron nuevas escrituras cloud, carreras cloud, cierre/login/Google completos, recuperación real de sesión ni pruebas en dispositivo móvil físico. El motor backend y las variables no cambiaron.

### Ajuste explícito de controles compactos — 20 de octubre de 2026

Tras aprobar la organización visual, el usuario reiteró que los inputs, selects y botones propios deben medir **36px** en escritorio y móvil y pidió no volver a imponer 44px por defecto. Se registra como preferencia permanente en `AGENTS.md`, `DESIGN.md` y la referencia de la superficie. Se retiraron los overrides de 44px en Nueva cita/Nuevo servicio, fecha/flechas/Hoy, Confirmar cita, Guardar semana, Cargar más servicios, cierre de panel y acciones del diálogo. Los botones de solo icono quedan en **36×36px**, reutilizando las primitivas existentes. La navegación, `UserButton` y configuración oficial de Clerk, fuentes, espaciado general, lógica, protección y datos se conservaron.

En este ajuste implementación no operó la pestaña real ni la sesión: planificación está ejecutando las pruebas de recuperación de sesión y aviso nativo. Las capturas de la mejora anterior acreditan el estado previo; la medición visual de estos controles fue aportada después por planificación y se registra en la comprobación posterior de abajo. No se creó un fixture ni se añadieron escrituras o dependencias. La precisión posterior del usuario pide heredar el tamaño desde las primitivas. `Input`, `NativeSelect` y `Button` ya tenían un default de 36px (`h-9`, `size-9` para iconos), sin aumentarlo en móvil: la causa eran los overrides locales de 44px. Se eliminaron esas clases y también las sustituciones redundantes de 36px en consumidores; las bases y sus variantes explícitas útiles permanecen intactas. Las comprobaciones proporcionales se registran al finalizar esta corrección.

Verificación de implementación del ajuste compacto: `pnpm lint`, `pnpm typecheck`, `pnpm test` (**239/239**, 9 archivos) y `pnpm build` terminaron con código **0**. `git diff --check` y el JSON del sidecar son válidos. La revisión estática confirma defaults `h-9` para Input/NativeSelect/Button, `size-9` para Button icon, ningún override de altura (ni 44px ni 36px redundantes) en los seis consumidores modificados y ninguna variante responsive que agrande el default. Las primitivas base y `app/layout.tsx` no tienen cambios respecto a Git: no se tocó Clerk ni Textarea. No se volvió a ejecutar el motor local ni se crearon fixtures. La medición real y el aviso de recarga se verificaron posteriormente por planificación, según el registro siguiente; la recuperación de sesión detectó un fallo y queda pendiente repetirla con la reparación.

### Comprobación posterior de planificación: controles y aviso nativo

El 20 de octubre de 2026, planificación aportó evidencia real con la sesión existente y el backend `dev/slotly`, sin escrituras cloud:

- **Alturas:** once controles de Agenda/Nueva cita miden **36px** tanto en escritorio como a viewport **390px**: Nueva cita, anterior/siguiente/Hoy, fechas de Agenda/cita, servicio, horario, cliente, cierre y confirmar. Los botones de solo icono miden **36×36px**. `scrollWidth = 390`, sin overflow horizontal. Captura: `C:/Users/dcalu/.codex/visualizations/2026/10/20/01a15620-54fe-7153-a4ec-ca62821d3c15/dashboard-ux-review/compact-controls-desktop.png`. Implementación no repitió estas medidas ni operó la pestaña real.
- **Recarga con borrador:** en otra pestaña real autenticada, `Page.reload` produjo `Page.javascriptDialogOpening` de tipo `beforeunload` con `hasBrowserHandler=true`; cancelar produjo `Page.javascriptDialogClosed(result=false)`, sin navegar, y conservó el nombre local «Borrador local aviso de recarga». Esto acredita emisión y cancelación del aviso de **recarga**. `Page.close` de las pestañas temporales las cerró sin evento observable; no acredita cierre manual ni se registra como fallo de la aplicación.
- **Limpieza por planificación:** pestañas de prueba cerradas, red y bloqueo CDP restaurados; cero registros cloud creados y ninguna sesión revocada. Evidencia estructurada de planificación: `C:/Users/dcalu/.codex/visualizations/2026/10/20/01a15620-54fe-7153-a4ec-ca62821d3c15/dashboard-ux-review/follow-up-checks.json`.

### Recuperación de autenticación: fallo real y reparación puntual

**Fallo reproducido por planificación:** tras impedir temporalmente la renovación real de credenciales Clerk y mantener la pestaña offline unos 100s, Convex pasó a no autenticado. Se conservaron nombre/fecha en los inputs ocultos. Restablecer la red y abrir el acceso oficial en otra pestaña recuperó el dashboard de esa nueva pestaña con la misma sesión, pero la original siguió en «Recupera tu sesión». Captura original: `C:/Users/dcalu/.codex/visualizations/2026/10/20/01a15620-54fe-7153-a4ec-ca62821d3c15/dashboard-ux-review/session-interrupted.png`.

**Causa comprobada estáticamente por implementación:** en Convex **1.47.0**, un fallo de fetch lleva el gestor a `noAuth`; el adaptador `ConvexProviderWithClerk` memoriza su función por sesión/organización y no la renueva simplemente al regresar online con la misma sesión. La integración anterior carecía de un disparador de reautenticación para ese estado.

**Reparación:** se utiliza `ConvexProviderWithAuth`, API oficial de integración, con un adaptador del `useAuth` oficial de Clerk. Mantiene las dos configuraciones que soporta el adaptador de Convex: token de sesión con audiencia `convex` o plantilla JWT `convex`, sin cambiar configuración. Una revisión en memoria renueva el callback y hace que el proveedor oficial solicite de nuevo una credencial a Clerk, omitiendo su caché en el reintento. Se intenta al volver online/foco/visibilidad si Clerk sigue conectado y Convex no está autenticado/cargando, y mediante «Reintentar acceso». No hay polling, recarga de página, cliente nuevo ni key de reintento que desmonte los formularios. El acceso sigue dependiendo de `useConvexAuth` y de la confirmación del servidor; un error de obtención retorna `null`, sin fingir éxito. No se almacenan, fabrican ni registran tokens reales.

**Identidad y borradores:** un estado Clerk todavía sin resolver conserva la última identidad solo mientras se espera; una salida **confirmada** (`isLoaded` con `isSignedIn=false`) la sustituye por `null` y desmonta todos los formularios privados, descartando sus borradores. Al cambiar a otra `userId`, la key del subárbol privado cambia y se reinicia siempre. El fallo transitorio de Convex con la misma cuenta solo oculta/suspende consultas y conserva los formularios montados. Esta separación se revisó en el código; no se ejecutó un logout real desde implementación.

**Documentación consultada:** Context7 para `ConvexProviderWithAuth` y el contrato `fetchAccessToken`, así como `useAuth/getToken({ skipCache })` de Clerk; código instalado de los adaptadores y gestor de autenticación de Convex1.47 y guía local de autenticación con Cache Components de Next.js. Clerk continúa siendo el proveedor de identidad y todas las autorizaciones servidor/backend permanecen intactas.

**Pruebas de implementación:** seis tests nuevos aislados comprueban selección de plantilla/integración, renovación forzada por SDK y reintento, retorno `null` ante red y delegación repetida sin caché propia. Usan callbacks sintéticos, sin solicitudes, identidades ni credenciales reales. No prueban el ciclo completo de montaje del proveedor, logout, cambio de cuenta o recuperación cloud. La suite queda en **245 casos** (10 archivos). La repetición real con esta reparación fue ejecutada después por planificación y pasó, según el registro siguiente. Ese resultado no se atribuye a los tests unitarios ni a implementación.

### Recuperación real después de la reparación — resultado de planificación

Planificación repitió el escenario con la reparación cargada desde cero, la misma cuenta real y su sesión Clerk válida, sin fabricar credenciales ni escribir datos. En Agenda del **26/10/2026** preparó únicamente un borrador local con servicio 2 (30min), inicio **10:00–10:30** y nombre «Borrador local recuperación corregida». Tras emular offline, a los **60s** se mostró realmente «Recupera tu sesión» y «Reintentar acceso».

Al restablecer la red, **sin pulsar Reintentar acceso, sin login adicional y sin recargar**, Convex recuperó automáticamente la autenticación y reaparecieron los formularios. La comparación DOM de **nombre, servicio, fecha e inicio** dio los **cuatro valores iguales** antes y después. Volvieron las **30 opciones** de disponibilidad y el listado conservó la **única cita real previa**. Planificación limpió únicamente el borrador local y dejó la agenda existente; no hubo una cita nueva, revocación de sesiones ni cambios de destino.

Capturas de planificación:

- `C:/Users/dcalu/.codex/visualizations/2026/10/20/01a15620-54fe-7153-a4ec-ca62821d3c15/dashboard-ux-review/session-recovery-retest-interrupted.png`
- `C:/Users/dcalu/.codex/visualizations/2026/10/20/01a15620-54fe-7153-a4ec-ca62821d3c15/dashboard-ux-review/session-recovery-passed.png`

**Alcance exacto:** acredita recuperación real de **autorización Convex después de un fallo transitorio de renovación**, conservando válida la sesión Clerk y los cuatro campos del borrador. No acredita revocación o expiración definitiva de Clerk seguida de re-login. La purga del subárbol privado ante `isLoaded && isSignedIn === false`, la retención durante loading/fallo transitorio y el reinicio al cambiar `userId` están implementados y revisados estáticamente; no se ejecutó logout real ni cambio real de cuenta durante esta reparación. La nueva guardia no altera el escenario de Clerk activo ya comprobado, por lo que no se repitió innecesariamente la interrupción de 60s.

**Cierre de implementación:** `pnpm lint`, `pnpm typecheck`, `pnpm test` (**245/245**, 10 archivos) y `pnpm build` pasan con código **0**; `git diff --check` limpio. Los seis tests nuevos cubren el contrato de obtención de credenciales, no el montaje/desmontaje de componentes ni una sesión real. Implementación no operó el navegador durante estas pruebas, no reinició el servidor ni creó fixtures, infraestructura, credenciales o datos cloud. Se conservaron los controles compactos por defecto, autorizaciones servidor/backend y todos los cambios locales anteriores. Sin commit, push ni PR.

**Intento asistido posterior del aviso nativo:** ante el ofrecimiento del usuario de pulsar «Cancelar», implementación preparó un nombre de prueba local en la pestaña existente (ID 1). El usuario indicó que no apareció un aviso; la solicitud directa de recarga no completó dentro del plazo y la API no detectó un diálogo abierto. Este intento no acredita otra cancelación ni un fallo de la aplicación. Se retiró únicamente el nombre de prueba y se cerró el panel, conservando la sesión y la única cita existente. No hubo envíos ni nuevas pestañas. La prueba válida sigue siendo la recarga cancelada con eventos reales aportada por planificación. Captura del estado limpio: `C:/Users/dcalu/.codex/visualizations/2026/10/20/01a15af6-d920-7b10-9b31-1bbd082297d0/native-retry-cleanup.png`.

## Buscar citas sin recordar el día — 20 de octubre de 2026

### Alcance aceptado e implementación

Planificación trasladó la petición expresa del usuario: «mejora en la vista Agenda los filtros para las citas, por ejemplo hay una cita en un día que no me acuerdo y ahora no lo encuentro». Se amplió únicamente la consulta de citas existentes, conservando todos los cambios locales anteriores, cuatro vistas, controles compactos y creación bajo demanda. No se inició Reto 07 ni se añadieron edición, cancelación, reprogramación, módulo de clientes o reservas públicas.

- **Día / Buscar citas:** el modo diario se conserva. Buscar citas consulta el conjunto propio completo, sin fecha obligatoria ni límite de antigüedad o futuro. La `fecha` diaria no entra en los argumentos de búsqueda. Nombre, servicio, período y Desde/Hasta se combinan; el rango es opcional e inclusivo y se despliega con un control nativo compacto. Limpiar retira todos esos filtros.
- **Semántica temporal:** Todas no restringe el calendario. Próximas incluye todo el día de referencia del negocio y los posteriores; Pasadas, solo los días anteriores. No clasifica por hora ni promete que toda cita de hoy aún esté pendiente de ocurrir. El cliente calcula el día con el reloj del navegador y la zona IANA del negocio, lo actualiza cada 30s y al recuperar foco/visibilidad/conexión, y lo pasa explícitamente a la query. La etiqueta muestra el día/zona que realmente se usa. El cambio de día renueva la clave de la lectura; no hay `Date.now()` en la query cacheada. Esta referencia es un filtro de consulta, nunca la autoridad temporal para crear una cita.
- **Nombre:** fragmento literal, en el mismo orden, normalizado a minúsculas y NFD, sin marcas diacríticas y con espacios unificados. Por ejemplo, `SE MUN` encuentra «José Muñoz»; `Muñoz José` no lo encuentra por reordenación. No hay fuzzy, tolerancia a erratas ni semántica de tokens/prefijos de Convex Search. No se añadió motor externo, índice de texto ni campo que requiera backfill de datos reales.
- **Resultados:** fecha completa, inicio/fin en la zona del negocio, cliente, nombre guardado del servicio y Confirmada. Orden ascendente por fecha e inicio, con el desempate estable del índice. Ver día abre el día exacto y el modo diario. Los recuentos pendientes dicen «citas cargadas» y que quedan páginas; «Sin coincidencias» y el recuento final aparecen solo cuando el cursor está agotado. Una página sin coincidencias ofrece Seguir buscando, no termina ni oculta las páginas restantes.
- **URL e interacción:** `modo=listado`, `cliente`, `servicio`, `periodo`, `desde`, `hasta`; los filtros se aplican con Buscar/Enter y se conservan en recarga, historial y enlaces entre las cuatro vistas. Ver día conserva los filtros inactivos para regresar al listado. Los filtros se leen del formulario nativo al aplicar; un rango invertido no cambia los filtros vigentes, y un enlace con fecha imposible muestra el error y omite la lectura.
- **Borrador:** alternar modos o abrir otro día conserva el mismo formulario montado y sus cuatro campos. Iniciar un borrador desde Buscar deja su fecha vacía para elegirla expresamente; desde Día conserva la herencia diaria previa. Una fecha inicialmente vacía se presenta neutral, con la confirmación deshabilitada hasta elegir valores válidos. No se guarda ningún borrador en almacenamiento persistente.

La composición hereda Geist, claro/verde, radios y primitivas de **36px**; no hay overrides de altura locales. El formulario usa consultas del ancho de su contenedor: una fila cuando dispone de 48rem y una composición de nombre completo/servicio-período/acciones por debajo. Así se adapta también al espacio que deja el panel lateral, no solo al ancho del viewport. No cambia ninguna primitiva ni el UserButton de Clerk.

### Lectura backend y destino

Se conserva `listMyAppointments({ date })` y se añade `searchMyAppointments`, con `args`/`returns` validados. Resuelve identidad verificada y negocio propio en cada solicitud; no acepta propietario ni negocio desde el cliente. Un servicio elegido debe existir y pertenecer a ese negocio. Rechaza fechas imposibles, rango invertido, referencia temporal ausente/inválida, nombre excesivo/caracteres de control y paginación inválida.

Dos índices nuevos: `by_businessId_and_date_and_start` y `by_businessId_and_serviceId_and_date_and_start`. Negocio/servicio y límites de fecha se resuelven dentro del índice. El fragmento de nombre se aplica **en el servidor sobre la página acotada**, después de `paginate`, conservando cursores, agotamiento y metadatos de división. No se usa `.filter()` de la base ni `.collect()` ilimitado. La UI solicita 50 filas de índice por página; el servidor limita `numItems` a 100, lecturas a 200 filas y 256000 bytes por ejecución, incluso ante opciones manipuladas. Es una búsqueda progresiva: para terminar de revisar un conjunto grande pueden ser necesarias varias páginas, también cuando las primeras no tengan coincidencias. No existe una ventana oculta de fechas ni se descarga la tabla al navegador.

`pnpm exec convex dev --once --typecheck enable --tail-logs disable` confirmó exclusivamente **daniel-caluff:slotly:dev/slotly — determined-poodle-377** y añadió esos dos índices, con salida 0. No cambió esquema de documentos, datos, autenticación, variables, secretos ni destino. Se comprobó que el cuerpo completo de `createMyAppointment` coincide con el de Git; la lectura diaria, comprobación/inserción transaccional y OCC permanecen intactas. No se repitieron las 60 solicitudes/18 carreras de creación.

Se consultaron Context7 para paginación/índices y metadatos de Convex 1.47, límites/semántica de su búsqueda de texto, historial nativo de Next.js y container queries de Tailwind 4; además, el código instalado de paginación React y las guías locales pertinentes de Next.js. Se aplicaron las revisiones de Convex y React al alcance cambiado.

### Verificación ejecutada por implementación

| Comprobación | Resultado y límite |
| --- | --- |
| Automatizada, en memoria | **268/268**, 11 archivos. Son los 245 anteriores más 22 casos nuevos de búsqueda y un caso adicional de conservación de filtros entre las cuatro vistas. Incluye fechas de 1999/2099, orden, fragmentos/tildes/mayúsculas/espacios, combinaciones, rango inclusivo/invertido, referencia IANA/cambio de día, páginas vacías intermedias, recorrido sin duplicados ni omisiones, límite de 100 ante solicitud de 5000, argumentos inválidos, ausencia de sesión/negocio, servicio ajeno y dos identidades con el mismo email y nombres de cliente coincidentes. No autentican firmas Clerk ni son escrituras cloud. |
| Lectura real autenticada | Pestaña independiente, sin tocar la original. `/dashboard?modo=listado`, sin `fecha`, mostró la cita previa; buscar **validacion** encontró «Prueba de validación Reto 06». Ver día abrió **26/10/2026, 09:30–10:00 America/Montevideo**, servicio 2. Se mantuvo una sola cita. No se inició una cita ni se abrió/modificó la segunda cuenta. Capturas `real-search.png` y `real-view-day.png`. |
| Componentes reales con transporte sintético aislado | Fixture temporal, identificado visualmente, sin conexión Convex. Usó el componente y `usePaginatedQuery` oficiales con respuestas sintéticas de cinco filas: atravesó cuatro páginas iniciales sin coincidencias y encontró al cliente en 2026 y 2030; solo al agotar todas las páginas mostró el resultado final. Error con reintento y filtros conservados; búsqueda sin coincidencias distinguida de páginas pendientes. |
| URL, teclado, rango y respuestas tardías | Buscar mediante Enter; combinación de nombre/servicio/Próximas/rango 2030 con fecha diaria 2010, sin restricción accidental. Rango invertido rechazado sin cambiar URL. Atrás/adelante/recarga conservaron valores aplicados; Limpiar los retiró. Enlace con `2026-02-30` mostró error. Respuesta sintética lenta de 3s no reemplazó la búsqueda posterior del cliente 05. |
| Fecha y borrador sintéticos | Cambiar la referencia del 20 al 21/10 retiró el 20 de Próximas y cambió sus argumentos/resultados; no fue una espera de medianoche real. Un borrador iniciado desde Buscar mantuvo fecha vacía al alternar modos. Otro iniciado desde Día conservó exactamente **servicio, fecha, inicio y cliente** al ir a Buscar y al abrir mediante Ver día una cita de 1998, mientras el borrador seguía siendo de 2030. Se descartó solo ese borrador sintético mediante el diálogo HTML; no se repitió el aviso nativo ni la interrupción de sesión. |
| Visual y controles | Viewports **1440×1000, 1280×720 natural, 1024×900 y 390×844**. Listado, rango y panel lateral/apilado sin overflow horizontal; todos los controles propios medidos de 36px, cierre 36×36. El ancho de PNG puede excluir 15px del scrollbar. El detector único de los tres TSX nuevos/afectados devolvió `[]`. |
| Revisión independiente | El revisor cargó su definición real `.toml`, examinó las seis capturas y el código sin navegador ni pruebas propias. Disposición **ship**, con sus cinco secciones contractuales; ningún arreglo material solicitado. El dictamen corresponde a esta extensión, no reemplaza las pruebas funcionales ni amplía las revisiones anteriores. |
| Comprobaciones finales | Después de retirar el fixture: `pnpm lint`, `pnpm typecheck`, `pnpm test` (**268**) y `pnpm build` terminaron con código **0**. El build enumera solo las rutas reales, sin `/search-check`. No se añadieron dependencias. |

Evidencia externa: `C:/Users/dcalu/.codex/visualizations/2026/10/20/01a15af6-d920-7b10-9b31-1bbd082297d0/appointment-search/`. Incluye las seis capturas finales (`desktop.png`, `mobile.png`, `user-1280.png`, `desktop-panel.png`, `user-1024-panel.png`, `mobile-panel.png`), lecturas reales, estados sintéticos, `metrics.json` y `four-fields-preserved.json`. Las imágenes del fixture son evidencia, no datos o assets del producto.

**Limpieza y límites:** todas las pestañas temporales se cerraron, viewport restaurado y fixture retirado. Quedó únicamente la pestaña original ID 1 en Agenda del 26/10; no se operó su borrador ni su sesión. Cero datos reales creados, editados o borrados; ninguna sesión revocada ni credencial fabricada. La paginación extensa, errores y aislamiento se ejercitaron en memoria/fixture, no con un catálogo cloud grande ni una segunda cuenta real en esta extensión. La lectura cloud comprobó la única cita existente. No se repitieron autenticación completa, recuperación transitoria, avisos nativos o carreras del motor ya acreditados. Esta entrega de implementación terminó sin commit, push, PR ni producción; la autorización posterior de publicación se registra debajo.

**Cierre documental:** el documentador independiente contrastó el código final y actualizó únicamente `DESIGN.md` y el brief de la superficie, sin atribuirse pruebas. Conservó el sidecar y los tokens existentes; no detectó deriva nueva en el alcance. Implementación actualizó README, este registro y su estado inicial. `git diff --check` y el JSON del sidecar pasan. Las copias temporales de capturas dentro del repositorio se retiraron después de ambas revisiones; toda la evidencia indicada permanece en el directorio externo.

### Autorización posterior de publicación del lote UX/UI y filtros

El **20 de octubre de 2026**, el usuario autorizó expresamente en planificación: **«Perfecto, revisa el diff y, si está todo correcto, haz el commit y sube las mejoras de UX/UI y los filtros de Agenda a GitHub»**. Esta autorización posterior permite revisar el lote completo y, si es correcto, hacer commit y push. Los cierres anteriores sin publicación se conservan como evidencia histórica, no como una prohibición vigente.

La validación en desarrollo ya registrada mantiene sus **268 tests**, lint, tipos, build, revisiones y pruebas reales con sus ejecutores y límites. Esta reconciliación es únicamente documental y no repite pruebas ni modifica el lote de implementación. **Planificación realizará la revisión completa y verificará y comunicará el resultado de la publicación.** No se anticipa hash ni se afirma que el commit o push ya se haya realizado; no se amplía el alcance a producción, PR, nuevas funcionalidades o Reto 07.
