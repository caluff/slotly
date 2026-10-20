---
version: 1
slug: "app-dashboard-page-tsx"
primary_target: "app/dashboard/page.tsx"
related_targets: ["components/business-profile.tsx","components/business-availability.tsx","components/appointment-search.tsx","components/dashboard-workspace.tsx","components/business-services.tsx","components/business-weekly-schedule.tsx","components/weekly-schedule-form.tsx"]
---

# Espacio privado de Slotly

Modo: Operate. Mejora autorizada de UX/UI sobre Retos 01–06, sin nuevas funciones de negocio. Las decisiones de marca y alcance ya están confirmadas en el brief del usuario.

## Direction contract

THESIS: Consultar el día sigue siendo la entrada; Buscar citas permite encontrar a un cliente sin recordar la fecha, en una lista independiente y sin horizontes ocultos.

OWN-WORLD: Conserva logo, Geist, fondo claro, verde de Slotly, separadores finos y radio de 6px. Inputs, selects y botones propios tienen 36px en escritorio y móvil; los de solo icono, 36×36px. Preferencia permanente explícita: no imponer 44px sin petición del usuario; navegación y UserButton oficial son elementos distintos. El acento señala navegación activa, acciones y confirmaciones.

STORY: La persona elige Día o Buscar citas, combina nombre/servicio/período y un rango opcional, recorre las páginas y abre el día exacto con Ver día. Los resultados muestran fecha completa. Nueva cita sigue bajo demanda y su borrador sobrevive a ambos modos; en búsqueda, un borrador nuevo exige elegir fecha explícitamente.

FIRST VIEWPORT: Se conserva cabecera, cuatro destinos, título Agenda y Nueva cita. Dos acciones compactas Día/Buscar citas cambian el área de consulta. En Buscar, nombre/servicio/período y Buscar/Limpiar comparten cuatro columnas cuando el contenedor dispone de al menos 48rem. Con menos ancho disponible, también en escritorio con el panel abierto, nombre ocupa una fila completa, servicio/período dos columnas y Buscar/Limpiar quedan debajo. El rango opcional se despliega bajo los filtros y permanece abierto si está aplicado. Debajo, orden y zona explícitos y filas con fecha, horas, cliente, servicio, Confirmada y Ver día, sin una tarjeta por cita. El panel contextual existente mantiene su columna lateral y su posición móvil.

FORM: Extensión dirigida por código, estructura fijada por brief; sin sorteo ni comp visual aprobada. Los borradores permanecen al cambiar de vista o cerrar el panel; la salida del documento avisa cuando hay cambios. Horario guarda la semana completa explícitamente.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Composición y comportamiento implementados

Buscar citas conserva la jerarquía de Agenda y usa las primitivas, separadores y espacios existentes. El cambio de composición de los filtros depende de una consulta al contenedor (`@container`/`@3xl`, 48rem), no del ancho de la ventana. El rango opcional usa `details`/`summary`; Desde y Hasta permanecen en dos columnas. Nombre, servicio, período y rango se combinan, y los filtros aplicados y el modo quedan en la URL y el historial. El día elegido para Día no limita esta búsqueda.

Cada resultado muestra fecha completa e inicio/fin en la zona IANA del negocio, cliente, servicio y Confirmada. El orden es ascendente por fecha e inicio. En móvil, fecha/horas ocupan una fila y cliente/servicio comparte la siguiente con Ver día; desde `sm`, se disponen en tres columnas. Ver día abre la fecha exacta en Día, sin borrar el borrador.

Los estados de resultado distinguen carga inicial, carga adicional, páginas pendientes, búsqueda agotada, validación y error de lectura con reintento. El contador habla de citas cargadas mientras quedan páginas y de citas encontradas al agotarlas. Si aún no hay coincidencias pero quedan páginas, la interfaz muestra La búsqueda continúa y Seguir buscando; Sin coincidencias queda reservado para la consulta agotada. El período y la zona se explican antes de la lista: Próximas incluye todo el día de referencia y los posteriores, y Pasadas los días anteriores.

Nueva cita desde Buscar citas deja vacía la fecha de un borrador nuevo. Un borrador existente conserva servicio, fecha, inicio y cliente al cambiar de modo, abrir otro día o cerrar el panel. El enlace del panel permite ir al día del borrador. Todos los controles propios heredan 36px y los botones de icono 36×36px, sin repetir la altura en los consumidores.

Fuentes contrastadas estáticamente: `components/appointment-search.tsx`, `components/business-availability.tsx`, `components/dashboard-workspace.tsx`, `components/appointment-form.tsx`, `lib/appointment-search.ts` y `lib/dashboard-navigation.ts`. Esta extensión conserva los tokens y patrones de `DESIGN.md`; no requiere regenerar `.impeccable/design.json`.
