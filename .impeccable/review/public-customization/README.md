# Personalizar vista pública — evidencia y cierre

Fecha: 26/10/2026. Dirección: [public-customization](../../surfaces/public-customization.md). Contrato funcional y límites: [PUBLIC_APPEARANCE](../../../docs/PUBLIC_APPEARANCE.md).

Extensión ordinaria code-led de Slotly en la app principal, desde Negocio. Se preservan `PRODUCT.md`, `DESIGN.md` y `.impeccable/design.json`: no hay un nuevo mundo visual ni una renovación del sistema. Este documenter contrastó hojas de estilo, componentes compartidos, integración de dashboard/reserva pública, informes y cuatro capturas locales; comprobó las dimensiones de los ocho PNG. No abrió navegador, ejecutó pruebas, consultó datos ni guardó cambios de aplicación.

Las capturas fueron obtenidas por el ejecutor con CUA/CDP directamente, sin retoque ni generación de diseño. Muestran una sesión existente y borradores sintéticos sin guardar. La imagen de ejemplo es el icono propio `app/icon.png`, no una persona. Nombre, teléfono y dirección de ejemplo no se publicaron. Ninguna captura acredita una reserva, un cliente creado o una publicación.

| Captura | Tamaño | Alcance |
| --- | --- | --- |
| [desktop.png](desktop.png) | 1440×900 | Editor y preview, columnas independientes. |
| [user-1280.png](user-1280.png) | 1280×720 | Composición de escritorio. |
| [mobile.png](mobile.png) | 390×720 | Pestaña Vista previa. |
| [mobile-edit.png](mobile-edit.png) | 390×720 | Pestaña Editar. |
| [user-320.png](user-320.png) | 320×720 | Adaptación móvil estrecha. |
| [mobile-long-name.png](mobile-long-name.png) | 320×720 | Nombre público largo con reflujo. |
| [mobile-error.png](mobile-error.png) | 390×720 | Validación local: teléfono vacío con Mostrar teléfono activo, error visible desde preview. |
| [public-default.png](public-default.png) | 1265×789 | Evidencia previa de lectura pública sin personalización y validación vacía; no pertenece al lote de siete capturas finales. |

Evidencia privada del ejecutor: `C:/Users/dcalu/.codex/slotly-evidence/public-customization-20261026/`. `engine-final.json` registra motor real Convex/SQLite temporal, 9 carreras/18 solicitudes HTTP participantes/3 rondas y 6 grupos seriales, todos correctos; incluye persistencia tras reiniciar y catálogo de 34 servicios en 2 páginas. Son datos sintéticos y clientes HTTP independientes, sin carreras cloud, Clerk, fallos de red inducidos ni certificación de carga. `ui-observations.json` recoge geometría, 36 px, fecha conservada entre selectores y movimiento reducido. `real-state.json` registra la tabla real de apariencia vacía. Los cotejos antes/después del ejecutor conservan por ID/hash 20 citas, 4 clientes, 48 jobs y 4 archivos R13. Lint, tipos y build seguro correctos según el ejecutor. Estos informes finales prevalecen sobre el estado intermedio de `progress.json`; no se suman pruebas históricas como nuevas.

El detector ya ejecutado, `design-detect.json`, contiene cinco advisories de tamaños de 11/12 px y una advertencia de `padding-right` animado en el shell heredado. No se repitió, no es un resultado vacío y no se convierte en nuevos tokens. Drift previo preservado: una nota Markdown de R13 aparece dentro del bloque de frontmatter de `DESIGN.md`; la muestra Panel de cuenta del sidecar usa radio de 1 rem frente al radio app de 0.375 rem documentado. Su reparación queda fuera de esta extensión. Los tamaños locales y las paletas públicas no sustituyen la escala o la identidad global.

Dictamen final atribuido al finish-reviewer independiente, recibido directamente por coordinación; no se presenta como revisión independiente propia del documenter. **Disposition: `ship`.**

## persistence

**Pass.** Se conservan las siete capturas finales válidas a 1440/1280/390/320 y la dirección code-led. Presentan borradores en la misma app y muestran el resultado sin necesidad de guardar. La persistencia de preferencias tras reiniciar se acredita aparte en el motor real sintético; no se atribuye a las capturas ni a una escritura en el negocio compartido.

## fidelity

**Match.** TYPE, MATERIAL, GROUND, composición y FORM conservan Slotly: Geist, superficie clara/verde, radios de 6 px, controles de 36 px, ajustes a la izquierda y preview a la derecha. **Adaptation: móvil**, mediante Editar/Vista previa, scroll interno y textos con reflujo. Catálogo de preview: **match/resolved**, con el mismo índice, orden, DTO y paginación públicos, también con enlace desactivado. Errores/conflictos: **match/resolved**, en una zona común visible fuera de los tabs ocultables. La captura de error demuestra validación local, no un fallo de red.

## ceiling

**Alcanzado para esta extensión.** El resultado es revisable y conserva el sistema establecido. La revisión no acredita publicación, un envío real, Clerk bajo carrera, una interrupción real de red ni cierre de los seguimientos R13. El flujo de guardado se verificó en el motor real sintético con el alcance descrito en el contrato.

## material_fixes

**Ninguno pendiente.** Los dos puntos corregidos —fidelidad/paginación del catálogo y visibilidad común del feedback— están resueltos. Los avisos del detector y el drift previo se registran sin normalizarlos ni ampliar el alcance.

## keep

Conservar presentación y controles compartidos entre público y preview, preview sin creación de reservas, guardado explícito, borradores dentro del workspace y controles de 36 px. Mantener aislada la paleta de la página pública y no publicar datos de QA. Conservar el sistema global y las evidencias históricas con sus límites.
