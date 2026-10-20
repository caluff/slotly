---
version: 1
slug: "app-dashboard-page-tsx"
primary_target: "app/dashboard/page.tsx"
related_targets: ["components/business-profile.tsx","components/business-availability.tsx","components/appointment-search.tsx","components/dashboard-workspace.tsx","components/business-services.tsx","components/business-weekly-schedule.tsx","components/weekly-schedule-form.tsx"]
---

# Espacio privado de Slotly

Modo: Operate. Mejora autorizada de UX/UI sobre Retos 01–06, sin nuevas funciones de negocio. Las decisiones de marca y alcance ya están confirmadas en el brief del usuario.

## Direction contract

THESIS: Agenda tiene un único listado paginado y un conjunto de filtros. Hoy es la entrada; Todas permite encontrar una cita sin recordar su fecha, sin cambiar de pantalla ni horizontes ocultos.

OWN-WORLD: Conserva logo, Geist, fondo claro, verde de Slotly, separadores finos y radio de 6px. Inputs, selects y botones propios tienen 36px en escritorio y móvil; los de solo icono, 36×36px. Preferencia permanente explícita: no imponer 44px sin petición del usuario; navegación y UserButton oficial son elementos distintos. El acento señala navegación activa, acciones y confirmaciones.

STORY: La persona consulta Hoy o cambia período, nombre, servicio y fechas en el mismo formulario. Editar un límite selecciona Personalizado; elegir un período sincroniza los límites visibles. Ver día aplica esa fecha al mismo listado. Nueva cita sigue bajo demanda y su borrador sobrevive a los filtros; solo un filtro de un día puede aportar la fecha de un borrador nuevo.

FIRST VIEWPORT: Se conservan los cuatro destinos globales; nombre del negocio y Nueva cita comparten la cabecera local. Agenda conserva su h1 accesible sin ocupar espacio visible. Cliente, servicio, período, Desde, Hasta y Buscar forman una sola fila desde 70rem de contenedor. No hay modos, Limpiar ni banda visible de Resultados/contador. Las citas siguen inmediatamente al cierre del formulario. Con panel lateral o menos ancho, los filtros se redistribuyen en tres, dos o una columna. Las ayudas y anuncios permanecen accesibles, y la paginación pendiente sigue visible. El panel contextual conserva su columna lateral y su posición móvil.

FORM: Extensión dirigida por código, estructura fijada por brief; sin sorteo ni comp visual aprobada. Los borradores permanecen al cambiar de vista o cerrar el panel; la salida del documento avisa cuando hay cambios. Horario guarda la semana completa explícitamente.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Composición y comportamiento implementados

Agenda usa las primitivas, separadores y espacios existentes. Su cabecera visible reúne negocio y Nueva cita; el h1 permanece solo para lectores de pantalla. El formulario ofrece nombre del cliente, servicio, período, Desde, Hasta y Buscar; no tiene modos ni Limpiar. La composición depende del contenedor: seis columnas desde 70rem; tres desde 40rem; dos desde 20rem, con nombre y grupo de acción a todo el ancho; una por debajo. Desde y Hasta permanecen visibles dentro del mismo grupo y en el orden de tabulación. La lista sigue inmediatamente al formulario, sin banda visible de Resultados/contador ni separador superior redundante.

Hoy es el período predeterminado y muestra hoy en ambos límites según la zona IANA del negocio. Todas deja ambos vacíos; Próximas muestra Desde hoy y Pasadas, Hasta el día anterior. Editar un límite activa Personalizado, que exige al menos uno y admite extremos abiertos e inclusivos. Elegir otro período sincroniza los campos y, al aplicarlo, elimina los límites derivados de la URL. Buscar/Enter combina nombre, servicio y fechas; un rango invertido muestra un error sin mutar la consulta aplicada. El fragmento de nombre no distingue tildes ni mayúsculas, conserva el orden y unifica espacios.

Cada resultado muestra fecha completa e inicio/fin en la zona IANA del negocio, cliente, servicio y Confirmada. El orden es ascendente por fecha e inicio. En móvil, fecha/horas ocupan una fila y cliente/servicio comparte la siguiente con Ver día; desde `sm`, se disponen en tres columnas. Ver día aplica el día exacto como Personalizado en el mismo listado, conservando los demás filtros y el borrador.

Los estados distinguen carga inicial, carga adicional, páginas pendientes, búsqueda agotada, validación y error de lectura con reintento. El encabezado y contador, las ayudas y el contexto de zona/orden quedan solo para lectores de pantalla. El contador anuncia citas cargadas mientras quedan páginas y citas encontradas al agotarlas. Las páginas pendientes conservan explicación y acción visibles. Si aún no hay coincidencias, La búsqueda continúa y Seguir buscando permiten avanzar; Sin coincidencias queda reservado para la consulta agotada. Próximas incluye todo hoy y los días posteriores; Pasadas, los anteriores, sin clasificación por hora.

Los filtros aplicados se conservan al recargar, recorrer el historial y navegar entre las cuatro vistas. Hoy omite `periodo` y deriva sus fechas dinámicamente; Todas usa `periodo=todas`; Personalizado usa `periodo=personalizado` y `desde`/`hasta`. Aplicar filtros o Ver día retira `modo`, `fecha` y `vista`. Los enlaces anteriores con `fecha` sin filtros temporales representan un día personalizado; `modo=listado` sin período ignora esa fecha y representa Todas. Un rango explícito prevalece sobre un preset válido y se presenta como Personalizado, sin intersección oculta.

Nueva cita hereda la fecha solo si el filtro aplicado representa un día; los rangos de varios días y Todas empiezan con fecha vacía. Un borrador existente conserva servicio, fecha, inicio y cliente al aplicar filtros, usar Ver día, cambiar de vista o cerrar el panel. El enlace del panel aplica el día del borrador. Todos los controles propios heredan 36px y los botones de icono 36×36px, sin repetir alturas en consumidores. Se conservan autenticación, recuperación y escrituras transaccionales.

Fuentes contrastadas estáticamente: `app/globals.css`, primitivas `Button`/`Input`/`NativeSelect`, `components/appointment-search.tsx`, `components/business-availability.tsx`, `components/business-profile.tsx`, `components/dashboard-workspace.tsx`, `lib/appointment-search.ts`, `lib/dashboard-navigation.ts` y el diff de las pruebas. Hoy y Personalizado se traducen a la lectura existente con período Todas y límites; no hay cambios en Convex, despliegues ni datos. La consulta diaria existente solo conserva la invalidación de disponibilidad del panel. Se retira `components/appointment-list.tsx`, ya sin consumidores. Esta extensión conserva tokens y sidecar de `DESIGN.md`; no requiere regenerar `.impeccable/design.json`.

Verificación final de implementación: 278 tests en 11 archivos, lint, tipos, build y diff sin errores; detector de layout previo y posterior sin hallazgos. Revisión independiente fresca `agenda_unified_finish_review`: `ship`, sin arreglo material solicitado, tras contrastar diez capturas finales. Evidencia permanente: `C:/Users/dcalu/.codex/visualizations/2026/10/20/01a15af6-d920-7b10-9b31-1bbd082297d0/agenda-unificada/`. Incluye listado a 1531, 1280, 768, 390 y 320px, panel a 1531/1280/390px y rango inválido. El PNG del panel móvil mide 390×1342; no se atribuye la altura solicitada del viewport al archivo. Son evidencias de revisión, no rasters nuevos del producto. La lectura autenticada reutilizó la cita existente; medianoche/zona y paginación extensa se verificaron en memoria. El registro detallado con ejecutores y límites está en `docs/PROJECT_CONTEXT.md`; este pase documental no ejecutó navegador ni repitió esas pruebas.
