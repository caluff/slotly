# Archivo de citas canceladas

## Alcance y aceptación

- Solo una cita propia Cancelada puede archivarse. El icono de basura aparece a la derecha de su fila en la lista de coincidencias y en su detalle. No hay borrado físico ni un quinto estado.
- Archivar la oculta de Día/Semana/Mes y sus coincidencias. La búsqueda histórica y el historial por cliente conservan el registro; las archivadas se identifican y pueden restaurarse desde su detalle. Deshacer ofrece restauración inmediata.
- La marca y su revisión son independientes del estado, la versión de reserva, cancelación, intervalos, relaciones, resultados, avisos, trabajos y recibos. Reintento exacto sin renovar fecha/revisión; orden antiguo tras restaurar o volver a archivar no reaplica el cambio.
- Sin X de cierre en el detalle ni en la lista de coincidencias. Mantener cierre por clic fuera y Escape, navegación por teclado y retorno de foco.
- Iconos existentes, controles36px, filas con objetivos independientes sin botones anidados, sin rediseñar el calendario. Guardado pendiente/errores recuperables y comando estable ante incertidumbre.
- No archivar ni modificar citas reales para QA, incluidas todas las pruebas del lunes. Verificación de escrituras en el arnés existente con motor real Convex/SQLite sintético y comprobación visual real solo por lecturas. Sin nuevos entornos/apps, unitarios ni dependencias.

## Estado

Implementado el26/10/2026 en la misma app y desarrollo. Esquema aditivo, sin migraciones: marca opcional e índices de visibilidad; los registros legados sin marca siguen visibles. La búsqueda del calendario usa el índice visible antes de paginar; la búsqueda histórica mantiene su consulta completa. La revisión de archivo es independiente y rechaza operaciones antiguas, cambios de payload y propietarios ajenos.

El comando se conserva en la pestaña antes de enviarlo. Ante respuesta incierta o recarga se ofrece «Comprobar» sobre el mismo intento; no se escribe automáticamente al recargar. El detalle enfoca su título al abrir, evitando enfocar de entrada la papelera. Un solo Escape cierra también desde ese botón, sin que un tooltip consuma la primera pulsación.

## Verificación ejecutada

- Motor real Convex/SQLite local del arnés existente: **12carreras,24solicitudes participantes,3rondas y6grupos seriales**. Duplicado y replay, conflicto de payload/revisión, archivo/restauración/ABA, autenticación/propiedad, tres estados no archivables y resultados/Deshacer, historial por cliente, recibo público inmutable, ocupación liberada y documentos/trabajos completos. Densidad221registros,21visibles:4páginas visibles y32históricas con páginas de7.
- Se descartó deliberadamente **una respuesta HTTP local después de confirmar la mutación** (una solicitud observada), se recuperó con el comando exacto y se reinició SQLite sin cambios adicionales. No prueba cortes de red externos, carreras cloud, Clerk ni carga. En el informe crudo, `observedOrders` son resultados por índice de petición, no un orden interno de commits; su frase genérica de límites se aclara aquí sin alterar el original. El arnés queda con el nombre preciso `outcomesByRequest` para próximas ejecuciones.
- Lint, TypeScript sin emisión y diff correctos. Build seguro Node24.19.0/Next16.4.2 correcto, ID `qyzeVsJ98jr1MlrpM7Tk9`, sin usar el `.next` del servidor. Tras el último ajuste del tooltip se verificó de nuevo el build final.
- UI real de la app principal, sesión existente y pestaña propia: escritorio1440/1280 y móvil390/320×720; papelera36×36, sin botones anidados ni X, foco en título, Tab, Escape desde papelera y clic exterior con retorno de foco. Confirmadas sin archivo. Sin desbordamiento documental ni errores de consola observados. Las capturas válidas se conservan en [.impeccable/review/appointment-archive](../.impeccable/review/appointment-archive/).
- Sync únicamente de código/esquema/tipos al desarrollo verificado `daniel-caluff:slotly:dev`, `determined-poodle-377`. Cotejo antes/después de todas las tablas protegidas por IDs/hashes:20citas,4clientes,48jobs y demás documentos/configuración, más4archivos de R13, idénticos. No se archivó ninguna cita real ni se guardaron datos de prueba.

Evidencia privada: `C:/Users/dcalu/.codex/slotly-evidence/appointment-archive-20261026/`. Archivo, restauración y toast tras escritura están cubiertos por motor/revisión estática; no se atribuye un E2E de escritura en el negocio real. La revisión visual es de lectura, sin fabricar registros archivados para la captura. El seguimiento del lunes es independiente y no se declara validado desde esta tarea.
