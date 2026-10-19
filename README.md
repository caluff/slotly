# Slotly

Plataforma de citas y reservas para profesionales y negocios. Esta etapa implementa únicamente autenticación y un dashboard vacío.

## Desarrollo

Stack instalado: Next.js 16.4.2 (App Router), React 19.3, TypeScript, Tailwind CSS 4 y Clerk Next.js 7.9.17. Utiliza únicamente pnpm.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

Abre [localhost:3000](http://localhost:3000).

## Autenticación

- `/`: portada pública; muestra la bienvenida y el menú oficial de cuenta cuando hay una sesión activa.
- `/sign-in` y `/sign-up`: componentes oficiales de Clerk, con traducción al español. Clerk gestiona correo, contraseña, verificación y Google según la configuración de la instancia.
- `/dashboard`: verifica la sesión en el servidor con `await auth.protect()` antes de consultar el usuario o renderizar contenido privado. El dashboard solo contiene una bienvenida y un espacio reservado.
- `UserButton`: gestión de cuenta y cierre de sesión con regreso a `/`. La persistencia de sesión la gestiona Clerk; no se guardan tokens manualmente.

Se reutilizan `ClerkProvider`, `proxy.ts` y `.env.local`, previamente configurados con la CLI. El proxy inicializa Clerk; la página aplica la protección. No se usa `createRouteMatcher`, deprecado en Clerk 7.

Las variables existentes son `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL` y las dos variables `NEXT_PUBLIC_CLERK_SIGN_*_FALLBACK_REDIRECT_URL`. No compartas ni publiques sus valores. `.env.local` permanece excluido de Git.

Después de iniciar sesión o completar el registro, Clerk envía al usuario a `/dashboard` mediante `signInFallbackRedirectUrl` y `signUpFallbackRedirectUrl` en `ClerkProvider`. Esos valores tienen prioridad sobre los fallbacks de `.env.local`, que no se modifica. Si existe un destino explícito en `redirect_url`, Clerk lo conserva; no se fuerza una redirección que lo reemplace. Se aplica a los componentes oficiales tanto para correo como para Google. La disponibilidad de Google depende de la conexión habilitada en Clerk; no requiere un flujo OAuth propio.

Cache Components ya está habilitado. Las lecturas de sesión se ejecutan dentro de `Suspense`, sin caché compartida de usuarios. Una redirección durante streaming puede conservar HTTP 200: comprueba el destino y la ausencia de contenido privado, además del estado HTTP.

Los componentes de página y estructura son Server Components. Los controles interactivos los aporta Clerk. No se añadió shadcn/ui porque en esta etapa los enlaces y los formularios de Clerk cubren la interfaz sin dependencias de componentes adicionales.

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
pnpm build
```

Para servir la compilación: `pnpm start`.

## Prueba manual con una cuenta real

1. Sin sesión, entra directamente a `/dashboard`: debe llevarte a `/sign-in` sin mostrar el dashboard.
2. Desde `/sign-up`, regístrate con un correo que controles, completa la verificación que solicite Clerk y comprueba que llegas directamente a `/dashboard`.
3. Comprueba la bienvenida en `/`, tu nombre si está disponible y el menú de cuenta.
4. Abre `/dashboard` y actualiza la página: debes conservar el acceso.
5. Desde el menú de cuenta, gestiona tu perfil y cierra sesión. Debes volver a `/` y perder el acceso a `/dashboard`, incluso al regresar con el navegador.
6. Inicia sesión con correo y contraseña y comprueba que llegas directamente a `/dashboard`, incluso al comenzar en `/sign-in` sin un destino previo. Si existe un destino protegido explícito, comprueba que se conserva.
7. Prueba Google si está habilitado en Clerk. Completa personalmente las credenciales y verificaciones de Google.

No se incluyen Convex, negocios, citas, calendarios, pagos ni notificaciones.
