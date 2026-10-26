# Calendario de reservas y formulario

Capturas propias de la app principal del26/10/2026. Una pestaña de QA independiente con sesión existente para el editor y la ruta pública del mismo negocio. Se cerró al terminar, sin guardar preferencias ni crear reservas/fichas.

- `editor-desktop.jpg`:1280×720, primera sección abierta y resto contraídas, calendario por defecto, días disponibles y horas en la misma fila. Hora seleccionada como borrador.
- `preview-320.png`:320×720, día y hora seleccionados, controles36px y cabecera estable durante el scroll interior.
- `contact-390.png`:390×720, bloque de contacto, datos sintéticos escritos solo en la preview y botón de confirmación deshabilitado.
- `public-form.png`: captura completa nativa de la página pública a1280px de ancho, mismos controles, calendario/horas y contacto en grupos.

Revisión propia de layout: la lectura sigue servicio → fecha/hora → contacto. Agrupación por proximidad, bordes entre decisiones y paleta/Geist actuales. En escritorio fecha y horas comparten región; en móvil se apilan. Flechas recorren fechas y radios, días no disponibles no se seleccionan, el cambio de servicio limpia fecha/hora y alternar el selector conserva el borrador. Se corrigió un desplazamiento del shell al enfocar; el foco ahora desplaza únicamente la preview. Ningún desborde horizontal ni error de consola observado. Detección de layout antes/después: sin hallazgos. No se modificaron PRODUCT.md, DESIGN.md ni el sidecar.

La prueba nueva del motor real local cubre6grupos seriales y ninguna carrera. La UI real no ejecutó una confirmación con datos: la única pulsación de Confirmar en la ruta pública fue con Servicio vacío y produjo validación local antes de cualquier envío. La prueba R13 manual autorizada ocurrió de forma independiente durante el trabajo y queda documentada por separado; no se presenta como prueba del calendario.
