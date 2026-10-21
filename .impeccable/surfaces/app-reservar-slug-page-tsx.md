---
version: 1
slug: "app-reservar-slug-page-tsx"
primary_target: "app/reservar/[slug]/page.tsx"
related_targets: ["components/public-booking.tsx", "components/business-booking-link.tsx", "components/business-profile.tsx"]
---

# Reserva pública

Modo: Operate. Alcance y composición fijados por el Reto 09 aceptado; extensión dirigida por código del mundo existente, sin concepto aleatorio ni comp nueva.

## Direction contract

THESIS: Elegir servicio, fecha y horario y confirmar con un nombre desde el enlace de un negocio. Una tarea breve, sin directorio ni nuevas funciones.

OWN-WORLD: Conserva Geist, fondo claro, verde, separadores y radio de Slotly. Input, NativeSelect y Button heredan 36px también en móvil. No añade recursos gráficos.

STORY: La persona identifica el negocio y su zona IANA, elige una opción libre, escribe su nombre y obtiene la confirmación. Los errores conservan los campos y permiten recuperar disponibilidad o reintentar la misma confirmación.

FIRST VIEWPORT: Marca discreta arriba; contenedor central de hasta 42rem, con hasta 38rem útiles tras márgenes interiores, nombre del negocio, título Reservar cita, servicio, fecha, horario y nombre en orden vertical. Confirmar cita cierra el formulario. La confirmación sustituye el formulario con servicio, fecha e intervalo. En Negocio, una sección compacta muestra estado, enlace y activar/desactivar, sin subtexto permanente.

FORM: Extensión precisa con controles nativos y sistema existente; code-led, sin seed por alcance fijado. Carga, vacío, enlace inactivo, conflicto y error de red tienen mensajes locales y foco útil.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Estado y evidencia de cierre — 2026-10-21

La implementación conserva las cinco promesas del contrato. La revisión independiente de acabado emitió `ship`, sin arreglos materiales, en `C:/Users/dcalu/.codex/slotly-evidence/reto09/finish-review.md`. El pase documental contrastó el código, el sistema existente y las once capturas finales; su informe es `C:/Users/dcalu/.codex/slotly-evidence/reto09/design-documentation.md`.

Se preservan `DESIGN.md` y `.impeccable/design.json`: esta superficie hereda el sistema existente y no establece otra identidad, tokens ni reglas globales. El contenedor público mide hasta 42rem, con 38rem útiles desde `sm`; la acción ocupa el ancho disponible en móvil. Las alturas proceden de las primitivas, sin repetir overrides de tamaño. Los iconos nuevos son Lucide y la única imagen de producto reutilizada es el logo preexistente `public/slotly-logo.png`; no hay rasters nuevos de producto.

Las capturas siguientes son evidencia de desarrollo con datos sintéticos, alojada fuera del producto en `C:/Users/dcalu/.codex/slotly-evidence/reto09/`. Las públicas usan la página y el componente reales con transporte WebSocket simulado. Las de gestión muestran el componente real en el fixture declarado `management-fixture.tsx`; no acreditan una sesión privada completa.

| Captura | Dimensiones | Estado documentado |
| --- | --- | --- |
| `public-desktop.png` | 1440×1000 | Formulario público de escritorio |
| `public-user-1280.png` | 1280×720 | Formulario al tamaño de ventana del usuario |
| `public-mobile-390.png` | 390×844 | Formulario móvil |
| `public-mobile-320.png` | 320×720 | Formulario móvil estrecho |
| `management-desktop.png` | 1440×1000 | Sección de gestión del enlace |
| `management-user-1280.png` | 1280×720 | Gestión al tamaño de ventana del usuario |
| `management-mobile-390.png` | 390×844 | Reflujo móvil de la gestión |
| `management-mobile-320.png` | 320×720 | Reflujo móvil estrecho de la gestión |
| `public-confirmed.png` | 1440×1000 | Confirmación sintética que sustituye al formulario |
| `public-conflict.png` | 1440×900 | Conflicto sintético, campos conservados y foco en horario |
| `public-lost-response.png` | 1440×900 | Respuesta perdida inyectada y reintento del mismo intento |

`ui-report.json` acredita 18 casos con transporte sintético, incluidos teclado, foco, doble envío, recuperación y medidas de 36px sin desbordamiento a 320, 390 y 1280px. `cloud-read-proof.json` conserva la evidencia inicial histórica de implementación: lectura real con sesión existente, enlace desactivado y sin URL asignada, citas históricas conservadas y cero escrituras cloud.

El pendiente E2E se resolvió posteriormente por **planificación**, con autorización expresa: activación de `/reservar/slotly`, una reserva pública real y comprobación de Agenda, ocupación, recarga y replay sin duplicados. El Reto 09 queda validado funcionalmente en desarrollo; evidencia y autoría en [verification.json de planificación](C:/Users/dcalu/.codex/visualizations/2026/10/21/01a15620-54fe-7153-a4ec-ca62821d3c15/reto09-cloud/verification.json) y `docs/PROJECT_CONTEXT.md`. Este cierre reutiliza las pruebas visuales/locales anteriores, sin atribuirles el flujo cloud ni afirmar nuevas pruebas o publicación del frontend en Internet.
