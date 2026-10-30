# Publicación de Slotly

**Decisión30/10/2026:** publicación gratuita de portfolio en `slotly-gold.vercel.app`, mismo proyecto y rama main, con `SLOTLY_APP_ENV=portfolio` y servicios de desarrollo existentes. Coste cero, sin correo transaccional ni backups automáticos PRO. El ámbito Production de Vercel ejecuta un build optimizado, pero la instancia Clerk sigue siendo Development. El modo estricto `production` conserva su validación live/prod. Estado de la publicación y límites en [PRODUCTION_READINESS.md](PRODUCTION_READINESS.md); los registros inferiores conservan su fecha histórica.

## Configuración vigente: una app y un desarrollo

25/10/2026. Por decisión del humano, la única rama de publicación es `main` de `caluff/slotly` y la app local/publicada utiliza los mismos servicios de desarrollo: Clerk `ins_3KvjGvQ2kKr8mecSAvIOrwwzstM` y Convex `determined-poodle-377`. Se reutiliza el proyecto Vercel `slotly`; no se crean otras apps o bases. Sus ámbitos Production/Preview/Development tienen los mismos destinos de desarrollo; Production es el nombre que Vercel da a la publicación pública de main. No se establece `NODE_ENV=development` en el servidor publicado: el build de Next sigue siendo optimizado.

Las claves Clerk de prueba se transfirieron con la CLI oficial al almacén de variables de este proyecto Vercel. La clave de servidor queda sensible en ámbitos publicados y cifrada en el ámbito local de Vercel; no se incluye en Git ni documentación. `SLOTLY_CLERK_FAPI_PROXY=false`, proxy público anterior vacío; las rutas de acceso/registro y el correo desactivado se conservan. El backend y `.env.local` compartidos no cambian.

Google usa el cliente propio `Slotly web desarrollo`, con retorno exacto `https://learning-louse-890.clerk.accounts.dev/v1/oauth_callback` leído de Clerk Development. Orígenes: `https://slotly-gold.vercel.app` y `http://localhost:3001`. El humano retiró el secreto inicial y autorizó expresamente el nuevo; se configuró por la CLI oficial sin valores en el repositorio. Google sigue en modo Prueba con la cuenta aprobada. Se comprobó acceso real con Google tanto en local como en la app publicada, persistencia tras recarga y lectura autenticada del negocio en Convex. Cierre de sesión correcto; acceder directamente a `/dashboard` sin sesión redirige a `/sign-in`. La consulta oficial de Clerk confirmó una cuenta para el correo aprobado, verificado y con Google vinculado.

Publicación desde Git: commit `5de5d6487104800fe1de688e6903f50090f69c4e` en `main`,119archivos de la aplicación y documentación incorporados; despliegue `dpl_BBrbpsQyhXhXvmBeAKWAEzics4Aa`, READY, build optimizada correcta. El alias `slotly-gold.vercel.app` se asignó a esa versión y la asignación automática de dominios quedó habilitada para los siguientes pushes a main. Esta actualización documental posterior conserva exactamente las fuentes de ejecución del commit verificado.

Lint y tipos correctos; comparación propia antes/después20citas/4fichas/48jobs y4archivos R13 idénticos por IDs/hashes. Los ensayos protegidos del lunes siguen pendientes. Evidencia actual: `C:/Users/dcalu/.codex/slotly-evidence/development-unification-20261025/`. Los recursos separados preparados en20 ya no son el destino configurado; no se eliminaron.

## Registro histórico — Reto20

25/10/2026. Dirección pública: **https://slotly-gold.vercel.app**. Despliegue final publicado y comprobado sin sesión; **la autenticación positiva en producción sigue pendiente**. Google está habilitado en Clerk, pero faltan sus credenciales OAuth propias. Planificación aceptó la publicación y las guardas anónimas dentro de estos límites; la entrega documental21 también quedó revisada.

## Destinos y fuentes

| Capa | Producción verificada | Desarrollo conservado |
| --- | --- | --- |
| Vercel | Proyecto `slotly`, `prj_3RGFG5cEI0UC9zeCeTeBkclZwFMt`, equipo `caluffs-projects` | Servidor Slotly3001/PID49176;3000/PID26640 pertenece a otra app |
| Convex | `daniel-caluff / slotly / production`, `prod:tremendous-chihuahua-369` | `determined-poodle-377` |
| Clerk | Aplicación Slotly existente; nueva instancia `ins_3LCYnARrVqA4zU58D3XQYQt2SWz` | `ins_3KvjGvQ2kKr8mecSAvIOrwwzstM` |

Release final `dpl_2hvB1JjAvPbRzNp25vawRfLkeueA`, estado READY; dirección inmutable `https://slotly-809ghyzo7-caluffs-projects.vercel.app`. La consulta del alias confirma que `slotly-gold.vercel.app` apunta a ese ID. Producción pública y previews con protección de Vercel. No se compró dominio, plan ni complemento.

Se publicaron los158archivos necesarios de las fuentes actuales de la copia principal, incluidos los cambios locales autorizados, con manifiesto individual SHA256/SHA1/tamaño. No se usó un commit anterior como sustituto. Manifiesto final SHA256: `c1cfd31d473c6e4f2aa5ee55466ba3f889a92e36b8dae9caaf07ec49dfb664de`;4.962.421bytes. Se excluyeron archivos `.env*`, estado privado de herramientas, respaldos, evidencia, dependencias, resultados de build, documentación y arneses. No hubo commit, push, PR ni conexión de Git.

La build remota ejecutó instalación con lockfile congelado y `pnpm exec node --version && pnpm --version && pnpm build`: **Node24.22.1, pnpm12.11.2**, Next16.4.2, compilación y TypeScript correctos. La build local aislada final pasó con Node24.19.0 en proceso e hijo, salida UUID propia, sin usar `.next` compartido. No se presenta esa versión local como la versión remota.

**Conexión GitHub posterior,25/10/2026:** el usuario conectó este proyecto Vercel a `caluff/slotly`, confirmado mediante lectura. El alias conserva la release revisada anterior y no se observó un despliegue nuevo desde Git. El `main` remoto sigue en `d46d58d373b1dc3e2ef7168427f903cdc8e5e898`; no incluye las mejoras locales sin commit publicadas mediante el manifiesto de158fuentes. Antes de sustituir la release desde Git hay que revisar e incorporar esas fuentes; esta inspección no hizo commit/push ni cambió despliegues. La conexión posterior no modifica la procedencia por archivos de la release20.

## Autenticación en la dirección gratuita

Clerk producción usa su proxy oficial en `https://slotly-gold.vercel.app/__clerk`. `proxy.ts` habilita `frontendApiProxy` únicamente con `SLOTLY_CLERK_FAPI_PROXY=true` y cubre `/__clerk/(.*)`. Esa variable solo se añadió al proyecto nuevo de producción; el desarrollo conserva su configuración.

En un dominio del proveedor como `vercel.app`, el Backend API genérico rechazó cambiar `proxy_url` con `provider_domain_operation_not_allowed`. Se resolvió mediante el **Platform API oficial**, `PATCH /platform/applications/{application_id}/domain`, cuerpo público `name=slotly-gold.vercel.app`, `proxy_path=/__clerk`. La fuente es el [esquema oficial de Platform API](https://github.com/clerk/openapi-specs/blob/main/platform/beta.yml); la [guía del proxy](https://clerk.com/docs/guides/dashboard/dns-domains/proxy-fapi) describe el transporte del SDK. Este ajuste pertenece solo a la instancia nueva de producción.

La validación del dominio/proxy terminó correctamente; los registros CNAME propios y SSL adicional de Clerk no son requeridos para esta configuración. OIDC y JWKS reales responden200 en el proxy; el emisor publicado es `https://slotly-gold.vercel.app/__clerk`. Convex usa ese emisor y la configuración oficial existente `applicationID: "convex"`. La plantilla JWT producción conserva `aud: "convex"`, RS256 y60s. No se fabricó ni emitió un JWT para la prueba.

Durante la preparación se ensayó una configuración JWT alternativa; se retiró por completo después de confirmar el emisor real. `convex/auth.config.ts` termina idéntico al comienzo de20. El sync final de producción pasó con tipos/esquema/funciones; después se retiró la variable JWKS ya innecesaria. El despliegue preliminar de bootstrap no es la release final ni un rollback verificado.

Variables Vercel, exclusivamente destino `production`: `CLERK_SECRET_KEY` sensible, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CLERK_PROXY_URL`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL`, `SLOTLY_CLERK_FAPI_PROXY`, `SLOTLY_EMAIL_READY`, `ENABLE_EXPERIMENTAL_COREPACK`. La clave nueva se transportó directamente al almacenamiento sensible de Vercel, sin copiarla al repositorio, archivos de evidencia ni salida visible.

Convex producción contiene `CLERK_JWT_ISSUER_DOMAIN` con el emisor anterior y `SLOTLY_EMAIL_READY=false`. El correo transaccional continúa desactivado. La selección local y `.env.local` de desarrollo no se modificaron.

## Comprobaciones y límites

- `/` responde200. Acceso y registro muestran los componentes reales de Clerk; el formulario de acceso se comprobó en1280×720 y390×720, controles36px, sin desborde horizontal, capturas PNG nativas.
- `/dashboard` sin sesión redirige a `/sign-in` antes del contenido privado. La consulta pública `businesses:getMyBusiness`, sin token, devuelve `UNAUTHENTICATED`.
- `/reservar/slotly` llega a «Enlace no disponible»; `publicBooking:getBusiness` devuelve `null`. `/gestionar-cita` sin capacidad llega al estado genérico. Se esperó el estado final tras la carga. Cero errores de consola en las pestañas propias observadas.
- Las14tablas de la app y `_scheduled_functions` de producción están vacías; Clerk producción tiene0usuarios. No se importaron negocios, cuentas ni citas de desarrollo, ni se ejecutaron seed, backfill o pruebas con escrituras.
- La comprobación posterior conserva IDs y hashes completos de las14tablas del desarrollo y48jobs:20citas/4fichas. Los4archivos protegidos R13 y la configuración compartida permanecen iguales. Los dos servidores originales siguen activos. Solo se operaron y cerraron pestañas propias.

Esto acredita publicación, transporte Clerk, UI anónima y guardas sin sesión. **No acredita** registro/correo/Google con cuenta real, persistencia de sesión tras recarga, cierre de sesión, lectura autenticada de Convex, creación o gestión de una reserva en producción. Las pruebas reales16/17 de desarrollo conservan su alcance y autoría; no se convierten en pruebas de producción.

## Decisión posterior: un único entorno de desarrollo

El25/10/2026 el humano aclaró que Slotly es una demo de portfolio y por ahora solo tendrá un entorno de desarrollo. La conexión Google a Clerk Production se detuvo; el plan anterior de separar desarrollo y producción deja de estar vigente. Este documento conserva la release20 como evidencia histórica: no se han cambiado variables, redirigido la demo al backend de desarrollo, retirado recursos ni ejecutado una consolidación. Las pruebas protegidas del lunes26/10 y los datos actuales deben conservarse íntegros durante cualquier ajuste posterior.

Antes de esta aclaración se creó, con autorización expresa, la configuración Google Auth Platform de `slotly-512723`, externo en estado Prueba, un cliente web `Slotly web producción` y una única cuenta de prueba. Proyecto sin facturación vinculada. Origen `https://slotly-gold.vercel.app`; retorno leído de Clerk `https://slotly-gold.vercel.app/__clerk/v1/oauth_callback`. No se conectó con Clerk ni se ejecutó el acceso real. El secreto inicial quedó expuesto en la salida de inspección por una etiqueta accesible de Google; no se transfirió a Clerk ni se guardó en fuentes/evidencia, y debe retirarse antes de cualquier uso. La sustitución de credenciales requiere intervención humana según la política del navegador. No repetir la creación del cliente ni usarlo como si estuviera configurado. Checkpoint: `C:/Users/dcalu/.codex/slotly-evidence/google-oauth-setup-20261025/progress.json`.

## Operación y reversión

Para futuras actualizaciones autorizadas, usar un selector explícito de **esta producción** sin reescribir `.env.local`; comprobar primero `login status`, referencia y variables del destino. El sync final20 usó `pnpm exec convex deploy --env-file <selector-produccion> --codegen disable --typecheck enable`, con selector público `CONVEX_DEPLOYMENT=prod:tremendous-chihuahua-369`. Nunca seleccionar/provisionar `prod` desde una inspección ambigua. Vercel debe compilar las fuentes exactas con Node24/pnpm fijado y variables propias antes de promover y comprobar el alias.

Esta es la primera release comprobada con el formulario visible: **no hay una release anterior declarada como rollback funcionalmente validado**. El bootstrap no cumple ese papel. Ante una regresión futura, identificar una versión previamente comprobada, promoverla y verificar alias/auth/backend; el backend se revierte por fuente compatible, sin restaurar o borrar datos por inferencia. No se ejecutó rollback real ni restauración. El patch incremental20 permite revisar únicamente `proxy.ts` y los documentos de esta entrega; su comprobación inversa no aplica cambios.

Evidencia y manifiestos: `C:/Users/dcalu/.codex/slotly-evidence/reto20-deployment/20261025-main/INDEX.md`. Reto13 del lunes26/10 y correo real15 siguen pendientes e independientes. 21 se autorizó tras esa revisión y modifica solo documentación; no cambia esta release ni su manifiesto.
