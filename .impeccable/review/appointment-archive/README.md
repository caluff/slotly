# Revisión de archivo de canceladas

Capturas propias de la app principal del26/10/2026, con sesión existente, en pestaña de QA independiente. Solo lectura: ninguna papelera se pulsó sobre los datos reales. La pestaña se cerró al terminar.

- `desktop-group.jpg`:1280×720, papelera en la esquina solicitada; lista sin X.
- `desktop-detail.jpg`:1280×720, detalle cancelado con papelera y sin X.
- `mobile-group-390.png` y `mobile-group-320.png`: capturas nativas CDP a390/320×720, objetivos36×36 y sin desborde documental.
- `mobile-detail-320.png`: detalle, título enfocado y sin X a320×720.

Revisión propia de refinamiento Impeccable: se conservan calendario, colores semánticos, iconos actuales y controles36px. Se corrigió Escape desde la papelera: el tooltip interceptaba la primera pulsación; se sustituyó por título nativo y nombre accesible. Confirmación posterior con un único Escape, clic exterior, retorno de foco, ausencia de archivo en Confirmada y cero errores de consola observados.

`detect` se ejecutó una vez sobre los cinco targets TSX/CSS:42 avisos, todos en reglas CSS heredadas (40advisory y2warning, borde de eventos/transición del sidebar). Las cuatro reglas nuevas no añaden avisos. Se conserva el mundo visual existente y no se amplía este refinamiento a esos componentes. Se excluyó una captura fallida del transporte1440, sin retocar imágenes para simular resultados.

La funcionalidad de escritura/recuperación/restauración se prueba en motor real local con datos sintéticos, no en estas capturas. Contrato y límites: [APPOINTMENT_ARCHIVE.md](../../../docs/APPOINTMENT_ARCHIVE.md).
