# Personalización de la página pública

## Alcance autorizado

Desde Negocio, «Personalizar vista pública» abre un editor dentro de la misma aplicación. Escritorio: formulario izquierdo y preview derecha. Móvil: Editar/Vista previa. El usuario autorizó teléfono y foto opcionales, selector de fecha en calendario o nativo, nombre de la persona y bienvenida, y opciones adicionales razonables: nombre público, dirección opcional y paleta de colores accesibles.

## Criterios de aceptación

- Perfil por negocio y acceso privado de su propietario. La configuración vive en una tabla nueva; no modifica los negocios, horarios, servicios, citas, recibos o trabajos existentes.
- Valores ausentes conservan la presentación anterior: nombre del negocio, selector nativo, verde y sin datos de contacto o foto.
- El borrador actualiza la preview sin guardar ni crear reservas. Guardar explícito aplica la configuración; Volver conserva el borrador dentro del workspace. Salir del documento avisa si hay cambios.
- Los campos son texto plano acotado. Teléfono y foto solo aparecen públicamente si se activa su visibilidad. Ningún ownerId, revisión, comando o identificador de almacenamiento se expone en el DTO público.
- Foto propia, sin URLs externas proporcionadas por el usuario. El navegador prepara una imagen pequeña; el backend valida tamaño y firma JPEG/PNG/WebP. El cliente no puede asociar un storageId arbitrario. La sustitución conserva el archivo activo ante una respuesta incierta y retira archivos reemplazados cuando se confirma.
- Guardado con comando estable y revisión esperada, reintento exacto y conflicto ante cambios concurrentes. Reutilizar un comando con otro contenido falla; un replay no cambia timestamps o revisiones.
- La página pública lee únicamente los campos permitidos de negocios con enlace activo. Desactivar el enlace sigue ocultando su contenido. No activa enlaces ni modifica reservas al personalizar.
- Calendario y control nativo escriben el mismo campo de fecha de la reserva actual. Servicio, opciones, límites temporales, ocupación, correo, idempotencia, recuperación y enlace de gestión conservan su lógica.
- Controles36px, foco/teclado, errores recuperables, modo móvil y movimiento reducido. Una sola app, rama main y destinos de desarrollo.

## Verificación

Implementación en la app principal,26/10/2026. Sin dependencias, cuentas, entornos ni aplicaciones adicionales. La tabla aditiva `publicBookingProfiles` mantiene las preferencias aparte de los datos de agenda. Las fotos se preparan en el navegador y se guardan mediante una acción autenticada; el commit vuelve a comprobar propietario y revisión en una transacción. Un fallo de resultado incierto conserva el archivo potencialmente activo. Los archivos sustituidos y los uploads de transacciones rechazadas se retiran; un fallo de limpieza puede dejar un archivo huérfano sin exponerlo en la página.

- `pnpm lint`, tipos sin emisión y build seguro Node24/Next16.4.2 correctos. El build usa una salida propia sin romper `.next` ni modificar la configuración compartida.
- Motor **real Convex/SQLite temporal** del arnés existente: `--public-appearance-only`,9carreras/18solicitudes HTTP participantes/3rondas y6grupos seriales. Comprueba replays, payload distinto, revisión obsoleta/ABA, permisos, visibilidad pública, subida/sustitución/borrado de imágenes, rechazo de tamaño/firma, reserva y recibo original conservados, documentos protegidos idénticos y persistencia tras reiniciar. El catálogo privado de preview y el público coinciden para34servicios en2páginas; la preview no exige activar el enlace. No son carreras cloud ni pruebas de carga o de Clerk. Los órdenes observados se conservan por operación en `engine-final.json`; no se atribuyen reintentos internos.
- UI con CUA en la **app principal real**, sesión existente y borradores sin guardar:1440×900,1280×720,390×720 y320×720, controles36px, sin scroll documental, foto local, texto largo, contacto y color, ambos selectores de fecha conservando la selección, teclado del calendario/pestañas, validación/foco, Volver conservando borrador y movimiento reducido. Página pública actual leída sin personalización y validación de formulario vacío sin enviar reserva. Los mensajes de guardado y conflicto están en una zona común visible también en la pestaña de preview móvil.
- Sync de código/esquema/tipos solo al desarrollo verificado `daniel-caluff:slotly:dev/slotly`, `determined-poodle-377`. Sin migraciones, barridos ni trabajos nuevos sobre datos existentes. Cotejo por ID/hash:20citas/4clientes/48jobs y demás tablas protegidas,4archivos R13 y configuración compartida conservados. La nueva tabla siguió vacía durante QA: ningún borrador ficticio se publicó, ni se crearon citas o clientes reales.

Evidencia privada: `C:/Users/dcalu/.codex/slotly-evidence/public-customization-20261026/` (engine, sync, builds, observaciones y hashes). Capturas de borradores: `.impeccable/review/public-customization/`. Revisión independiente y publicación: se registran en `PROJECT_CONTEXT.md` al finalizar. El guardado público se probó en el motor real sintético; no se atribuye una prueba de escritura en el negocio compartido ni una interrupción real de red. El borrador vive en esta pestaña: se conserva al navegar dentro del dashboard, no al recargar; salir del documento avisa. Los ensayos anteriores R13–R21 no se contabilizan como nuevos. Los seguimientos del lunes26/10 permanecen independientes y esta función no valida R13.
