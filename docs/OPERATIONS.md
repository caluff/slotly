# Operación y verificación de Slotly

Guía contrastada el25/10/2026 para la copia principal. El Reto19 dejó la preparación operativa aceptada; el despliegue20 fue revisado dentro de su alcance anónimo, según [RELEASE.md](RELEASE.md).21 concilia la presentación sin ejecutar nuevos procesos ni publicaciones.

## Requisitos y configuración

- Node24 LTS. Build final comprobado con **24.19.0**, no solo mediante `--version`. Los servidores existentes continúan con su proceso original; esta comprobación no cambia el runtime global.
- pnpm **12.11.2**, fijado en `packageManager`; versiones efectivas en `package.json` y `pnpm-lock.yaml`. No usar otro gestor.
- Next16.4.2, React19.3.0, Clerk Next7.9.17 y Convex1.47.0 en la verificación actual.
- En una instalación nueva, `pnpm install --frozen-lockfile`. No reinstalar dependencias con un servidor abierto sin coordinar su reinicio posterior. Esta etapa no reinstaló ni actualizó dependencias.
- `.env.example` describe nombres, no credenciales. Configuración real privada en `.env.local`, excluida de Git. Conservarla; nunca copiar sus valores a documentación, logs, capturas o artefactos.
- Clerk debe pertenecer a Slotly. El cliente usa la clave publicable; las claves privadas y el emisor JWT permanecen en sus entornos de servidor. No fabricar tokens ni reutilizar configuraciones de otro proyecto.
- El correo15 requiere remitente/clave propios y preparación explícita. Siguen pendientes; no activar envíos para verificar compilación.

El desarrollo existente es `daniel-caluff / slotly / dev / determined-poodle-377`. Los datos de ese desarrollo están protegidos. La última prueba real16/17 dejó20citas/4fichas/48trabajos; no borrar sus registros ni restaurar la base histórica18/3/36.

## Convex: inspección y selección

Consultas de ayuda contrastadas con la CLI instalada1.47.0, sin iniciar login, seleccionar destino o cambiar configuración:

```sh
pnpm exec convex --help
pnpm exec convex login --help
pnpm exec convex login status --help
pnpm exec convex deployment select --help
```

`login status` existe: comprueba la sesión de la CLI y lista equipos accesibles; no selecciona el entorno. Solo cuando se prepara **otro equipo autorizado**, iniciar `pnpm exec convex login` y seleccionar el desarrollo existente mediante `pnpm exec convex deployment select daniel-caluff:slotly:dev/slotly`. La selección es una operación con efectos: puede escribir `.env.local` y configuración de despliegue. Revisar las diferencias y conservar Clerk. No repetirla como diagnóstico de una copia ya configurada.

No usar `deployment select local`, creación de proyecto o modo anónimo para obtener un ejecutable de pruebas. Pueden crear/configurar otro backend. Tampoco usar un comando `run`, `dashboard` o `insights` dirigido a `team:project:prod` para comprobar supuesta existencia de producción: el resolver `handleProd` de esta versión llama a `fetchDeploymentCredentialsProvisioningDevOrProdMaybeThrows` y puede provisionarla. Incluso una consulta inline que devuelve `null` no convierte esa selección en inspección sin efectos. No se ejecutó.

Las variables del emisor y la sesión real de Clerk ya estaban configuradas; su modificación no forma parte del Reto19. La evidencia de ayuda y las anclas de implementación están en la carpeta de evidencia19.

## Arranque de desarrollo

En una copia ya configurada y con destino verificado:

```sh
pnpm convex:dev
pnpm dev
```

Son procesos distintos. `convex:dev` **sincroniza** código/esquema/tipos en el backend seleccionado; no es una consulta inocua ni se necesita repetirlo para cambiar textos de cliente. `dev` inicia Next; el puerto depende de los servidores existentes.

En esta sesión Slotly ya está en [localhost:3001](http://localhost:3001); el puerto3000 corresponde a otra app. Mantener ambos procesos y sus pestañas humanas. No iniciar un servidor adicional ni reiniciar uno para esta verificación. En otra instalación usar la dirección anunciada por Next, sin asumir3000.

## Puertas locales de verificación

| Puerta | Qué acredita | Efectos y límite |
| --- | --- | --- |
| `pnpm lint` | Reglas estáticas del proyecto. | No prueba datos, sesión ni UI. |
| `pnpm exec tsc --noEmit --incremental false` | Tipos sobre las declaraciones ya disponibles, sin emitir ni escribir caché incremental. | En una copia recién instalada las declaraciones de rutas pueden faltar; el build aislado genera y comprueba sus propios tipos. |
| `pnpm verify:build` | Compilación de producción y tipos de las fuentes actuales con Node24 y configuración de build sintética. | No despliega ni valida una cuenta, backend real, correo o rollback. Usa salida UUID propia y conserva configuración compartida. |
| `pnpm test:appointments:engine` | Integración real Convex/SQLite sintética del arnés existente. | Solo cuando cambia un contrato o falta cobertura concreta; requiere binario nativo. No ejecutar por rutina ni atribuirlo a cloud. |
| Navegador principal | Flujos realmente recorridos y estados visibles. | No inventar respuestas perdidas, confirmaciones o capturas de ramas no visitadas. Escrituras reales requieren su autorización concreta; las dos de16/17 ya se cumplieron. |

`pnpm typecheck` sigue disponible para el desarrollo habitual: ejecuta `next typegen` antes de TypeScript y puede actualizar tipos/declaraciones de Next. En esta verificación se usó la comprobación sin emisión y el build con salida propia para preservar el servidor activo.

El alias genérico **`test:local` fue retirado**. El archivo histórico `scripts/test-businesses-local.mjs` sigue conservado como antecedente: carga configuración administrativa de `.convex/local/default/config.json` y deja dos perfiles sintéticos persistentes. No ejecutarlo como puerta ordinaria, no leer su configuración/BD ni borrar sus datos para limpiar una prueba.

### Build aislado reproducible

`scripts/verify-build.mjs` exige Node24; ejecuta `pnpm exec next build` con Node24 también en el hijo. Usa `distDir` y `typescript.tsconfigPath` propios bajo `node_modules/.cache/`, con UUID/marcador. No construye sobre `.next`, no cambia `next.config.ts`/`tsconfig.json` y restaura exactamente `next-env.d.ts` si Next lo genera para esa salida. Una modificación concurrente inesperada se conserva y provoca fallo.

El transporte serializado de configuración usado por el hijo es interno de Next y está contrastado/fijado a16.4.2, siguiendo el patrón ya verificado en17. El runner rechaza una versión distinta para exigir revisar ese transporte antes de actualizar. No convertirlo en configuración de hosting. El build puede mostrar que encontró `.env.local`; el runner no lo edita ni copia y fija valores públicos/de correo sintéticos para la compilación.

Con Node24 como runtime normal:

```sh
pnpm verify:build --output /ruta/absoluta/a/evidencia
```

En este equipo se ejecutó el binario24 existente explícitamente, sin instalación ni modificación del PATH global:

```powershell
pnpm exec 'C:/Users/dcalu/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' scripts/verify-build.mjs --output 'C:/Users/dcalu/.codex/slotly-evidence/reto19-operations/20261025-main'
```

Sin `--output`, conserva los resultados en `node_modules/.cache/slotly-verification/`. Con salida explícita, archiva únicamente el build propio, tsconfig, marcador, resultado y prueba de conservación en esa carpeta; no borra directorios. El resultado registra versiones del proceso/hijo y BUILD_ID. No contiene credenciales reales.

No se creó ni ejecutó un workflow remoto de GitHub en19. Estas puertas son locales; un CI futuro debe seleccionar Node24/pnpm fijado y configuración sintética, sin `pull_request_target`, sincronización cloud, credenciales incorporadas ni presentar la ausencia de binario del motor como suite superada.

### Binario nativo para el arnés existente

El arnés no lee `.env.local` ni `.convex`; crea SQLite, configuración, identidades, clave y fixtures exclusivamente en su workspace temporal propio, usa loopback y comprueba raíz/prefijo/marcador al limpiar. Solo el stub de correo controlado recibe los envíos sintéticos. No representa otra app de uso humano.

Acepta `SLOTLY_CONVEX_BACKEND` con ruta absoluta a un ejecutable ya provisionado, o busca la caché de Convex. La release usada por la evidencia local previa es `precompiled-2026-10-10-72ce13c`. No se descargó ni ejecutó una campaña nueva en19.

Para preparar una máquina que no lo tenga, descargar **solo el binario oficial**, extraerlo en una carpeta propia y asignar la ruta explícita. La CLI1.47.0 construye sus URLs como `https://github.com/get-convex/convex-backend/releases/download/<release>/<archivo>`; en Windows x64 el archivo es `convex-local-backend-x86_64-pc-windows-msvc.zip`. Fuente contrastada: `node_modules/convex/src/cli/lib/localDeployment/download.ts`; [release oficial utilizada](https://github.com/get-convex/convex-backend/releases/tag/precompiled-2026-10-10-72ce13c). Verificar la procedencia, versión y hash del archivo descargado conforme a la publicación antes de usarlo; una versión impresa no acredita compatibilidad de la suite.

En la terminal temporal de la prueba, por ejemplo: `$env:SLOTLY_CONVEX_BACKEND = 'C:/herramientas/convex-local-backend.exe'`; después `pnpm test:appointments:engine --report C:/evidencia/engine.json`. Esto documenta preparación, no afirma haberla ejecutado ni requiere crear un despliegue local en la configuración del proyecto. Si el binario falta, registrar el fallo explícito y conservar la atribución de la evidencia anterior.

## Recuperación por capa

| Síntoma | Acción pertinente | No confundir con |
| --- | --- | --- |
| Página pública no carga | El error accesible ofrece Reintentar conectado a `retry()`: vuelve a consultar/renderizar el segmento. Error genérico, sin imprimir el objeto privado. | `reset()` solo limpia el estado sin volver a consultar; no demuestra una caída real de servidor durante19. |
| Fallo de horarios | Reintentar horarios mantiene el borrador y vuelve a cargar opciones. No confirmar un horario que ya no aparece libre. | Repetir una intención nueva mientras hay otra confirmación incierta. |
| Intento guardado tras recarga | Mensaje neutral de recuperación; comprobar exactamente el mismo UUID/payload. Puede haber tenido respuesta anteriormente o haber quedado incierto. | Afirmar siempre que se perdió un acuse. |
| Acuse de creación después de mover/cancelar | `Confirmación original` conserva los datos originales; `Gestionar cita` consulta el estado vigente. | Reescribir el recibo o usar su horario histórico como disponibilidad actual. |
| Respuesta perdida al confirmar | Mantener el intento congelado y su capacidad; reintentar el mismo comando. Solo `Reservar otra cita` prepara explícitamente otra intención tras éxito. | Borrar almacenamiento, crear otra ficha/cita o regenerar secretos para salir de la incertidumbre. |
| Sesión privada o conexión en recuperación | Conservar el borrador y usar las acciones existentes; si la sesión terminó, volver al flujo oficial de Clerk. Revisar la capa que falló. | Fabricar tokens, cambiar issuer/instancia o publicar errores con datos personales. |
| Next no coincide con dependencias instaladas | Revisar el error concreto y las rutas del manifest. Un reinicio coordinado del proceso afectado puede ser necesario tras una instalación. | Borrar indiscriminadamente cachés, restaurar bases o reiniciar los servidores protegidos durante19. |

No copiar enlaces privados a informes, consola, capturas o chats. La ruta de gestión usa fragmento y lo retira; la inspección acotada18 no acredita una filtración ni garantiza el SDK remoto de terceros.

## Publicación y reversión

**Actualización20,25/10/2026:** [slotly-gold.vercel.app](https://slotly-gold.vercel.app) está publicado con el despliegue final `dpl_2hvB1JjAvPbRzNp25vawRfLkeueA`; el alias se verificó contra ese ID. Node remoto24.22.1/pnpm12.11.2 y build correctos. Convex producción `tremendous-chihuahua-369` y la nueva instancia Clerk producción están separados del desarrollo. Los formularios reales cargan; Google carece de credenciales propias y el E2E con cuenta real de producción está pendiente. Procedimiento, variables por nombre, evidencia y acción humana concreta en [RELEASE.md](RELEASE.md).

El proxy oficial Clerk está habilitado solo en producción en `/__clerk`; para el dominio del proveedor se configuró mediante Platform API de la aplicación, tras el rechazo del Backend API genérico. El emisor OIDC confirmado por HTTPS es `https://slotly-gold.vercel.app/__clerk`, configurado únicamente en el backend nuevo. No cambiar el emisor ni la selección del desarrollo para reparar producción. El build sintético aislado sigue siendo una puerta local; la release remota se compiló con su configuración real propia.

Conservar por release las fuentes/diff/hash, versiones, resultado de build, destino y alcance de verificación. No exponer el desarrollo protegido como backend público de producción. No activar correo sin remitente/clave propios y la prueba real correspondiente.

Para revertir **fuentes de19**, primero comprobar el diff incremental contra sus bytes finales con `git apply --reverse --check /ruta/reto19-only.patch`. El check no aplica la reversión. Revisar cambios concurrentes y limitar la operación al incremento; no usar un restore/reset global sobre el lote local13–18.

Este reto no cambia esquema ni datos. Una reversión de fuente no requiere importar una base, retirar trabajos o reabrir/cancelar citas. Los respaldos históricos privados de `.convex/backups/` siguen conservados; no se inspeccionaron ni restauraron. Ante una recuperación real de datos, primero identificar y autorizar origen/destino, comprobar un respaldo completo y ensayar en un entorno vacío aislado; una receta no es una restauración comprobada.

Para una futura publicación, conservar una release previa comprobada y verificar la asignación del alias después de la promoción.20 es la primera release con formulario visible comprobado: su bootstrap no se presenta como rollback validado. **No se ejecutó rollback real ni restauración en20;19 no ejecutó despliegue ni CI remoto.** La build remota20 y sus límites no sustituyen la prueba de una reversión.

## Evidencia y pendientes

Evidencia nueva19: `C:/Users/dcalu/.codex/slotly-evidence/reto19-operations/20261025-main/`. Contiene baseline actual, diff/manifest exclusivos, conservación de14tablas/48trabajos y4archivos R13, build Node24 con salida UUID propia, lint/tipos y revisión UI con sus límites.

La UI nueva observada corresponde al formulario fresco de una pestaña propia, en1280×720: controles36px y sin desborde horizontal. No había intento guardado propio ni se crearon capacidades/reservas para mostrar los textos cambiados; esas ramas se verificaron por fuente/build y se reutiliza el E2E16/17 anterior con su autoría. No se provocó una caída real para activar la página de error. La captura genérica de la herramienta no se entrega como PNG nativo de validación.

Las campañas del motor previas se reutilizan, sin nuevas carreras cloud ni escrituras. Siguen independientes el envío real de correo15 y las pruebas protegidas del lunes26/10 (tres citas y dos seguimientos). Reto19 fue aceptado por coordinación antes de20;21 conserva esa evidencia sin repetir las pruebas.
