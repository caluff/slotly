# Presentación de producto en la landing —29/10/2026

Petición: una frase seguida en el hero, retirar el bloque inferior derecho y presentar Slotly en la segunda sección con capturas, tomando como inspiración visual la [landing de JetBrains](https://www.jetbrains.com/es-es/). Se leyeron esa página y su composición mediante CUA; solo se adoptan jerarquía, navegación por pestañas e imágenes amplias. No se copian contenidos, assets ni claims.

Cambios en `app/page.tsx`, `app/home.css`, `components/particle-film.tsx` y el nuevo `components/home-product.tsx`. El texto del hero pierde el salto forzado; caption eliminado y pausa integrada en las acciones secundarias. La segunda sección explica citas, reservas, clientes, servicios, horarios y bloqueos con tres pestañas Radix de activación manual, imágenes Next Image y enlaces concretos a la demo.

Imágenes nativas finales `public/media/product/{agenda,clientes,servicios}.jpg`,1280×650. Se usa el dashboard original desde `/demo`, con datos ficticios; sus orígenes están embebidos en JPEG COM. No se abrió una copia de la app ni se guardaron datos reales. Se sustituyeron capturas CDP experimentales cuyo recorte alteraba la cabecera; los JPEG finales se abrieron y verificaron. El banner de demo permanece dentro de cada captura; el indicador Next queda fuera del área capturada. Importaciones estáticas aseguran hash y dimensiones correctas; no se generaron ilustraciones de interfaces.

Documentación consultada: Next16.4.2 instalada sobre imágenes/cliente-servidor; Context7 sobre Next Image e importaciones locales y Radix Tabs. No se añaden dependencias ni se cambia configuración.

Comprobación inicial: `geometry.json` registra una línea29.69px con line-height29.7px en escritorio1440/1280, dos líneas naturales en móvil390/320, caption ausente, imágenes cargadas y anchura documental sin exceso. Flecha derecha mueve el foco conservando Agenda; Enter activa Clientes. Las tres capturas originales están identificadas como datos ficticios.

`interaction.json`: Agenda/Clientes/Servicios y horarios activadas, imágenes cargadas y enlaces `/demo`, `/demo?vista=clientes`, `/demo?vista=servicios`. Se observaron ambas capas pausadas tras el control reubicado; al reanudar, `final-geometry.json` confirma reproducción en los cuatro tamaños. El bucle y movimiento reducido conservan su implementación anterior; no se atribuye aquí una nueva prueba temporal de ciclos completos. Tras reducir el gap móvil, el ancho de las pestañas coincide con su contenido incluso en320px.

Seis capturas finales abiertas y válidas: `desktop.png`1440, `user-1280.png`, `mobile.png`390 y `user-320.png` muestran Agenda; `desktop-clientes.png` y `desktop-servicios.png`1280 muestran los otros dos contenidos. Documentos completos desde su inicio, con emulación retirada al terminar. El overlay N pertenece a Next dev.

ESLint de las tres fuentes y TypeScript sin emisión correctos. Build seguro final Node24.19.0/Next16.4.2 correcto, marcador `b23febe8-1ef6-4e43-bd1c-665475d04b1d`, en `C:/Users/dcalu/.codex/slotly-evidence/home-product-20261029/build-final/`. Hashes compartidos conservados y `noSharedBuildOutput=true`; no se ejecutó sobre `.next` activo. No se abrió un nuevo flujo Google ni se guardaron citas o clientes reales o ficticios para producir estas imágenes.

[Revisión visual fresca](review.md): **ship**, ningún arreglo material, seis capturas válidas y alcance limitado a este refinamiento. El documenter independiente concilia los bloques vigentes del sistema y el contrato sin cambiar sus valores globales; [registro documental](documentation.md). Las pestañas propias de referencia, captura de assets y QA se cerraron, conservando las del humano.

Detector corrido una vez: `detector.json`,10advisories de tamaños tipográficos locales y2de radios de imagen8/12px, sin hallazgos mecánicos. No cambia la rampa ni el radio de los controles del dashboard. No se ejecutan otra vez suites de motor ni E2E cloud para esta extensión visual; tampoco commit, push o despliegue.
