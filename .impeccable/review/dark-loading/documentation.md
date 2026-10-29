# Registro documental — temas y cargas, 29/10/2026

Extensión autorizada del sistema Slotly existente. El usuario pidió modo oscuro y pantallas de carga con skeletons, sin texto pequeño pegado a la esquina superior izquierda. Se conserva el mundo visual, la composición y la historia; no hubo nueva comp, seed, identidad o etapa de producto en este pase.

## Fuentes y cambios documentados

Se contrastaron PRODUCT.md, DESIGN.md, el sidecar, la superficie home, el contrato y README del ejecutor; las hojas globals/home/loading-screens; ThemeProvider, ThemeToggle, las cuatro variantes de carga, Skeleton, Button, layout de Clerk, consumidores de carga y el helper público de apariencia. El contexto de proyecto se consultó para distinguir el estado actual de los registros históricos.

- [DESIGN.md](../../../DESIGN.md): valores reales de claro/oscuro, tarjetas y foregrounds de acciones; roles de resultados/calendario; aliases de shadcn/Tailwind; variantes públicas `light-dark()`; persistencia, modalidad, tamaño36px, accesibilidad y movimiento reducido de las cargas.
- [design.json](../../design.json): metadatos y bindings de las dos paletas sin copiar los valores primitivos, aliases y fuente de preferencias; muestras vigentes que heredan variables de tema; muestras adicionales de selector y skeleton; sombra local y pulso. Se conserva la muestra histórica del panel de cuenta y el drift previo ajeno.
- [surfaces/home.md](../../surfaces/home.md): extensión de temas sobre la portada vigente, reflujo estrecho, cargas de demo y atribución precisa de pruebas. Las entregas anteriores permanecen con sus fechas y límites.

Los colores oscuros proceden de `:root.dark`; la paleta clara conserva sus valores. Los botones usan `primary-foreground` o `destructive-foreground`, con su valor oscuro correspondiente, y los campos usan las superficies de su rol. El `input` CSS apunta a `line`, mientras la utilidad `color-input` apunta a `muted`: se describe esa diferencia existente, sin normalizarla. Los cuatro colores de reserva pública siguen siendo variantes locales del helper; no se convierten en identidades nuevas del workspace.

`ThemeToggle` hereda36×36px de Button, conserva tres opciones radio oficiales, foco y Escape. El portal se monta dentro del diálogo abierto cuando corresponde. La preferencia `slotly-theme` es por navegador; Sistema sigue la preferencia del sistema. Clerk usa su tema oficial shadcn y variables semánticas de Slotly, sin autenticación propia.

Las cargas reservan anatomía de agenda, formulario, lista o calendario parcial. Sus contenedores anuncian estado mediante `role="status"`, `aria-label` contextual y `aria-busy="true"`; las piezas tienen `aria-hidden="true"`. No hay rótulo visible de espera en una esquina. Los campos-placeholder de36px no alteran las primitivas ni los tamaños oficiales de Clerk. El pulso de1.8s desaparece con movimiento reducido; el estado sigue visible sin animación.

## Evidencia inspeccionada y autoría

El documenter abrió los cinco PNG nativos entregados en este directorio. [desktop.png](desktop.png) es la agenda real a1280×720 en oscuro, con resultados diferenciados; [mobile.png](mobile.png) es el skeleton de demo a320×720; [panel-mobile.png](panel-mobile.png) es Servicios de demo a320×720; [home-mobile.png](home-mobile.png) es portada a320×720 con cabecera refluida; [form-skeleton.png](form-skeleton.png) es el formulario público en carga a1280×720. No son cinco vistas equivalentes de un mismo estado ni nuevos assets de marketing.

El [README del ejecutor](README.md) atribuye a CUA el cambio Claro/Oscuro/Sistema, persistencia al recargar, seguimiento de preferencia emulada, selección con Enter y Escape con retorno de foco dentro del modal320. El selector se midió36×36px. Portada final registró ancho documental305/320px después del reflujo. Agenda real, resultados y menú oficial de Clerk se observaron con sesión existente, solo en lectura; se abrió una reserva pública sin completar ni enviar formulario.

El skeleton de agenda se observó en la carga real y después se retuvo para capturarlo mediante bloqueo temporal de chunks JS solo en la pestaña QA. Se registraron23piezas, nombre de estado Cargando agenda, ausencia de texto visible y pulso desactivado durante la emulación de movimiento reducido. El formulario se capturó con el mismo bloqueo. Bloqueo y emulación se retiraron y una recarga recuperó la app. Estas capturas prueban apariencia, sin acreditar latencia natural ni un fallo real del servidor.

Según el ejecutor, ESLint acotado y TypeScript sin emisión pasaron. El build seguro final Node24/Next16.4.2 pasó con marcador `2cca8b53-163c-4368-8d8a-4b7b4d60ddc7`, incluyendo reflujo320 y skeleton semanal; sustituye al build previo `ca8e181d-902c-42f6-80b7-157f46245d77`. Usó salida propia y no construyó sobre `.next` activo. El diff no presenta errores de espacios. El documenter no ejecutó estas comprobaciones ni repitió pruebas de interfaz.

El detector se ejecutó una sola vez por el ejecutor:53advisories (38rampa,12radios,2color,1grid) y3warnings previos (2transiciones de layout y1borde lateral de estado). La grilla representa un calendario en carga; los otros dispositivos conservan su contrato anterior. No se añadieron ignores o cambios tipográficos para ocultar los avisos. Los18pares de contraste calculados desde tokens dieron6,04:1–15,33:1; no equivalen a una auditoría de todos los elementos del DOM.

## Límites y drift conservado

Next16.4.2 en desarrollo mantiene el aviso `instant-unrendered-segment` de la portada. La página renderiza y el build pasa; no se declara consola libre de incidencias ni causa raíz aislada. Mover el proveedor dentro de Clerk y retirar un loading raíz redundante no lo resolvieron, según el ejecutor. No se desactivó el validador. El aviso de script durante HMR se distingue de un error de hidratación de una carga completa.

El párrafo histórico de R13 permanece dentro del delimitador inicial de DESIGN.md por el límite expreso de no reparar drift ajeno. Se preserva su posición y contenido; no se declara ese bloque YAML portable validado. Los tokens se registran desde las fuentes reales y el sidecar permanece JSON. La antigua referencia a pausa manual en `home-video-crossfade`, los glyphs de muestras históricas y el panel de cuenta retirado se conservan fuera del contrato nuevo. La documentación no convierte esos registros históricos en instrucciones para nuevas pantallas ni cambia sus evidencias previas.

Los skeletons de listas, calendario parcial y semana cuentan con comprobación de fuente/tipos/build por el ejecutor; no se provocó una caída del backend. No se cerró sesión humana ni se repitieron acceso anónimo, E2E de autenticación/reserva, pruebas con escrituras o R13. No hubo nuevas capturas del documenter, detector repetido, backend, sync, cambios remotos, commit, push o despliegue. La conservación de datos se describe por el alcance de las acciones, sin inventar una comparación nueva de hashes cloud.
