---
version: 1
slug: "components-business-profile-tsx"
primary_target: "components/business-profile.tsx"
related_targets: ["components/business-weekly-schedule.tsx","components/weekly-schedule-form.tsx","components/dashboard-workspace.tsx"]
---

# Dashboard: horario semanal

Modo: Operate. Extensión del dashboard existente para consultar y guardar la semana de atención del negocio. Alcance y estados confirmados en la petición del Reto 04.

## Direction contract

THESIS: Editar los siete días y guardar una semana completa desde la vista Horario del espacio privado.

OWN-WORLD: Hereda verde claro, Geist, controles compactos de 36px y radio de 6px. Usa Field, NativeSelect, Input y Button existentes, sin nuevos tokens.

STORY: La persona identifica su zona horaria, abre o cierra días, define un tramo y guarda. La ausencia de configuración, carga, errores y guardado tienen estados distintos.

FIRST VIEWPORT: Horario tiene una vista propia dentro de la navegación Agenda/Servicios/Horario/Negocio. Presenta título de 24px que crece a 30px desde sm, zona IANA y siete filas separadas. Cada día abierto tiene día/estado y apertura/cierre. En móvil, día y estado comparten una fila y las horas ocupan dos columnas; los días cerrados quedan compactos. La barra de guardado y estado permanece junto al borde inferior al desplazarse.

FORM: Extensión de superficie existente, dirigida por código; sin torneo ni semilla de concepto. La vista permanece montada al navegar para conservar el borrador. El selector de estado conserva su wrapper de 128px y su flecha interior. El guardado explícito conserva la semana visible y el toast existente confirma una sola vez. La composición general vigente está en app-dashboard-page-tsx.md.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
