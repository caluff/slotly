# Contexto de Slotly

Última revisión del repositorio: **19 de octubre de 2026** (America/Montevideo).

Última actualización documental: **20 de octubre de 2026** (America/Montevideo). El **Reto 02 queda cerrado funcionalmente en desarrollo**, con la confirmación del usuario sobre creación, persistencia y aislamiento entre dos cuentas reales. La evidencia y sus límites se detallan al final de este documento.

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
| shadcn/ui | Elegido para el stack; no hay `components.json` ni componentes de shadcn/ui en la aplicación revisada. Aún no incorporado. |
| Clerk | `@clerk/nextjs` instalado en **7.9.17** (declarado como `^7.9.17`) y `@clerk/localizations` en **4.23.0**. Integración presente en el código. |
| Convex | **1.47.0**. Reto 02 cerrado funcionalmente en desarrollo; destino activo cloud `daniel-caluff:slotly:dev/slotly`, con Clerk como emisor JWT y perfil en `businesses`. Backend local inicial conservado como respaldo. |
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
