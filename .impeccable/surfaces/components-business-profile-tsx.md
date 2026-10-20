---
version: 1
slug: "components-business-profile-tsx"
primary_target: "components/business-profile.tsx"
related_targets: ["components/business-weekly-schedule.tsx","components/weekly-schedule-form.tsx"]
---

# Dashboard: horario semanal

Modo: Operate. Extensión del dashboard existente para consultar y guardar la semana de atención del negocio. Alcance y estados confirmados en la petición del Reto 04.

## Direction contract

THESIS: Editar los siete días y guardar una semana completa desde una sola sección del dashboard.

OWN-WORLD: Hereda verde claro, Geist, controles compactos de 36px y radio de 6px. Usa Field, NativeSelect, Input y Button existentes, sin nuevos tokens.

STORY: La persona identifica su zona horaria, abre o cierra días, define un tramo y guarda. La ausencia de configuración, carga, errores y guardado tienen estados distintos.

FIRST VIEWPORT: La sección sigue a servicios, con título de 24px, zona IANA y siete filas separadas. Cada fila tiene día/estado y apertura/cierre. En móvil, el día precede a dos columnas de horas. La acción queda al final.

FORM: Extensión de superficie existente, dirigida por código; sin torneo ni semilla de concepto. El guardado conserva la semana visible y el toast existente confirma una sola vez.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
