# Personalizar vista pública

## Refinamiento vigente —26/10/2026

El usuario solicita primera sección desplegada y resto contraídas, calendario predeterminado, días disponibles reales y habilitación de horas tras elegir día, conservando pasos15min y duración del servicio. El nuevo layout agrupa servicio, calendario/horas y contacto; en escritorio calendario y radios horarios comparten fila, y nombre/correo otra. En móvil cada grupo conserva su orden. El formulario público y preview comparten controles. Se conserva el mundo visual y la altura36px; no se rediseña el shell. Una regla acotada evita que el foco desplace el shell del editor, manteniendo los scrollers interiores.

Verificación del refinamiento:1280×720,390/320×720, secciones iniciales, calendario y horas reales, sin escritura de reservas ni preferencias; teclado, alternancia de selector, reinicio por servicio y cabecera estable. `detect --scope layout` antes/después sin hallazgos. Motor real local nuevo:6grupos seriales,0carreras, sin atribuir las9carreras de la entrega inicial a este cambio. Contrato vigente y límites en `docs/PUBLIC_APPEARANCE.md`; capturas nuevas en `.impeccable/review/booking-calendar/`.

El registro inferior describe la entrega inicial: su selector nativo por ausencia queda sustituido por el calendario predeterminado de este refinamiento.

MODE: Operate. Extensión ordinaria de Slotly, con diseño establecido y montaje code-led. El humano fijó la estructura mediante una imagen: controles a la izquierda y vista previa a la derecha. La referencia aporta distribución, nunca su contenido personal ni sus colores.

THESIS: el propietario configura qué presenta su página de reservas y comprueba el resultado antes de guardarlo.

OWN-WORLD: conservar claro/verde, Geist, radios6px, iconos existentes y controles36px. Los colores alternativos pertenecen exclusivamente a la página pública y su preview; el editor mantiene Slotly.

STORY: Negocio → Personalizar vista pública → ajustes y preview → Guardar → confirmación. Volver a Negocio conserva los borradores del workspace. La vista se representa dentro del dashboard existente; no hay otra app o demo.

FORM: nombre público, persona, bienvenida, dirección opcional, teléfono opcional con visibilidad, foto opcional subida desde archivo, color de una paleta acotada y fecha con calendario o control nativo. Guardar es explícito. Perfil ausente mantiene la página anterior. No se altera disponibilidad, servicio, datos obligatorios de cliente, confirmación, recuperación o autogestión.

LAYOUT: cabecera compacta con Volver, título y Guardar; escritorio dividido entre formulario estrecho con scroll propio y preview flexible con scroll propio. En móvil, Editar/Vista previa accesibles, preservando el borrador y sin scroll horizontal documental. La preview reutiliza la presentación pública real y nunca confirma citas.

STATES: carga, vacío por defecto, borrador, foto en preparación/error, validación por campo, guardando, conflicto de versión, incertidumbre y guardado. Visibilidad pública por consentimiento del propietario; los campos desactivados y metadatos privados no salen en el DTO anónimo.

QUALITY BAR: preview inmediata y fiel, controles36px, foco visible y teclado, Escape/Volver, error recuperable sin perder datos, ancho1440/1280/390/320, sin desbordamiento documental. Mantener íntegros los ensayos de R13. Verificar con lecturas/borradores en la app principal y el arnés real existente para escrituras sintéticas; no crear otra app ni publicar datos de referencia.

## Cierre documentado — 26/10/2026

Extensión ordinaria implementada dentro del dashboard, sin cambiar el mundo visual. Las fuentes conservan fondo claro/verde, Geist, radios de 6 px y primitivas de 36 px; las cuatro paletas disponibles se limitan a la superficie pública y su preview. La presentación y los campos de reserva son compartidos; confirmar permanece deshabilitado en preview. En escritorio los ajustes y la preview tienen scroll propio; en móvil se alternan mediante Editar/Vista previa. El borrador se conserva al volver dentro del workspace, no tras recargar el documento.

La revisión final independiente recibida por coordinación emite `ship`, sin hallazgos materiales. Se resolvieron dos puntos: catálogo de preview con el mismo índice/orden/DTO/paginación del público, comprobado con 34 servicios en 2 páginas; y errores/conflictos en una zona común visible fuera de los tabs ocultables. Procedencia, capturas y las cinco secciones del dictamen se registran en [README de revisión](../review/public-customization/README.md).

Evidencia atribuida al ejecutor: siete capturas finales nativas a 1440/1280/390/320, con borradores sintéticos sin guardar en la app principal y sesión existente; la foto de ejemplo usa `app/icon.png` de Slotly. `public-default.png` es evidencia previa de lectura pública y validación vacía. Motor real Convex/SQLite temporal: 9 carreras, 18 solicitudes HTTP participantes, 3 rondas y 6 grupos seriales; no carreras cloud, Clerk ni fallos de red inducidos. Lint, tipos y build seguro correctos. El cotejo por hashes conserva 20 citas, 4 clientes, 48 jobs y 4 archivos R13; la tabla real de apariencia siguió vacía. No se crearon citas/clientes reales ni se publicó contacto ficticio.

El documenter contrastó fuentes, sistema existente, informes y capturas locales; no ejecutó navegador, pruebas ni escrituras de aplicación. `PRODUCT.md`, `DESIGN.md` y `.impeccable/design.json` se preservan. No se promueven a reglas globales los tamaños locales de 11/12 px; el detector existente también registra `padding-right` animado heredado del shell. Se conserva sin reparar el drift previo del sistema: nota Markdown de R13 dentro del bloque de frontmatter y muestra antigua de Panel de cuenta con radio de 1 rem en el sidecar frente a app de 0.375 rem. Este cierre no acredita publicación, envío real ni interrupciones reales de red, y no cierra R13.
