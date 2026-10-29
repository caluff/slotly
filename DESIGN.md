---

**Centro de notificaciones vigente de Reto13 —23/10/2026:** referencia estructural de YouTube adaptada a la paleta clara/verde de Slotly: título Notificaciones, engranaje36×36, vista Ajustes con volver y switch36×36, sin X ni pie. Menú ⋮36×36 a la derecha de cada aviso; Ya llegó / Reprogramar / Cancelar Cita, esta última destructive. Nuevas/Leídas estables durante la apertura y reconocimiento automático por fase; no botón Leído. Snapshot histórico y tiempo relativo de publicación con fecha exacta accesible. Cinco iniciales y otros cinco al desplazarse dentro del panel; al reabrir vuelve a cinco. Ancho máximo420px/margen8px, altura acotada, nombres largos con reflujo y sin desbordamiento en1440/1280/390/320×720. Verde, Geist, radios6px y controles36px heredados. Se conservan flotante único, salto completo5s, pointer y ausencia de hovercard. Corrección actual: menú derecho y edad creciente sin mover la escena, 36 controles nuevos en reto13-runtime-age;59controles anteriores en reto13-notification-center se conservan como evidencia previa; contrato y límites en [APPOINTMENT_ATTENTION.md](docs/APPOINTMENT_ATTENTION.md).
name: Slotly
description: Interfaz sencilla con temas claro y oscuro y acentos verdes.
colors:
  background: "#fcfdfb"
  foreground: "#183c30"
  accent: "#176348"
  accent-hover: "#104b36"
  surface: "#eaf3e9"
  muted: "#52665b"
  line: "#d9e4da"
  selection: "#c7e6ca"
  white: "#ffffff"
  card: "#ffffff"
  primary-foreground: "#ffffff"
  destructive-foreground: "#ffffff"
  destructive: "#9f2f2f"
  confirmed-bg: "#eaf3e9"
  confirmed-ink: "#183c30"
  cancelled-bg: "#fbefed"
  completed-bg: "#eaf1fb"
  completed-ink: "#214f85"
  absent-bg: "#fff2d8"
  absent-ink: "#78500b"
  block-bg: "#ecefe9"
  block-ink: "#354638"
  calendar-faint: "#f3f6f3"
  calendar-muted: "#e6ece6"
  calendar-today: "#eef6eb"
  calendar-highlight: "#d6ead8"
  home-background: "#f8f6e7"
  home-foreground: "#153d32"
  home-accent: "#176348"
  home-muted: "#42574b"
  home-line: "#c9d0b7"
  home-control-border: "#a0ac96"
  home-selection: "#d3df8f"
  dark-background: "#101b16"
  dark-card: "#17271f"
  dark-foreground: "#e4efe7"
  dark-accent: "#82d7ae"
  dark-accent-hover: "#a1e5c4"
  dark-primary-foreground: "#0a281b"
  dark-surface: "#203a2c"
  dark-muted: "#a8beaf"
  dark-line: "#395044"
  dark-destructive: "#f3a1a1"
  dark-destructive-foreground: "#351111"
  dark-selection: "#355c44"
  dark-confirmed-bg: "#203a2c"
  dark-confirmed-ink: "#b3e8c7"
  dark-cancelled-bg: "#3b2527"
  dark-completed-bg: "#203448"
  dark-completed-ink: "#adcefa"
  dark-absent-bg: "#3b331e"
  dark-absent-ink: "#f1d28b"
  dark-block-bg: "#2a332c"
  dark-block-ink: "#bacbbb"
  dark-calendar-faint: "#14221a"
  dark-calendar-muted: "#23382b"
  dark-calendar-today: "#1a3224"
  dark-calendar-highlight: "#2d503a"
  dark-home-background: "#101914"
  dark-home-foreground: "#e6f0e5"
  dark-home-accent: "#a3d995"
  dark-home-muted: "#b3c4b4"
  dark-home-line: "#3c4c3d"
  dark-home-control-border: "#7c927b"
  dark-home-selection: "#415a35"
typography:
  display:
    fontFamily: "var(--font-geist-sans), sans-serif"
    fontSize: "3rem"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.035em"
  title:
    fontFamily: "var(--font-geist-sans), sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    letterSpacing: "-0.025em"
  auth-title:
    fontFamily: "var(--font-geist-sans), sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  lead:
    fontFamily: "var(--font-geist-sans), sans-serif"
    fontSize: "1.125rem"
    lineHeight: "2rem"
  body:
    fontFamily: "var(--font-geist-sans), sans-serif"
    fontSize: "1rem"
    lineHeight: "1.75rem"
  label:
    fontFamily: "var(--font-geist-sans), sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: "1.25rem"
  home-display:
    fontFamily: "var(--font-geist-sans), sans-serif"
    fontSize: "clamp(58px, 6.8vw, 96px)"
    fontWeight: 500
    lineHeight: 1.06
    letterSpacing: "-0.04em"
  home-display-mobile:
    fontFamily: "var(--font-geist-sans), sans-serif"
    fontSize: "clamp(48px, 11vw, 65px)"
    fontWeight: 500
    lineHeight: 1.06
    letterSpacing: "-0.04em"
rounded:
  app: "0.375rem"
spacing:
  "3": "0.75rem"
  "4": "1rem"
  "5": "1.25rem"
  "6": "1.5rem"
  "7": "1.75rem"
  "8": "2rem"
  "10": "2.5rem"
  "11": "2.75rem"
  "12": "3rem"
  "20": "5rem"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.app}"
    padding: "0.375rem 1rem"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-primary-dark:
    backgroundColor: "{colors.dark-accent}"
    textColor: "{colors.dark-primary-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.app}"
    height: "2.25rem"
  button-primary-dark-hover:
    backgroundColor: "{colors.dark-accent-hover}"
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.destructive-foreground}"
    rounded: "{rounded.app}"
    height: "2.25rem"
  button-destructive-dark:
    backgroundColor: "{colors.dark-destructive}"
    textColor: "{colors.dark-destructive-foreground}"
    rounded: "{rounded.app}"
    height: "2.25rem"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.app}"
    padding: "0.375rem 1rem"
  form-control:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.app}"
    padding: "0.375rem 0.75rem"
  account-panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.app}"
    padding: "1.75rem"
  workspace-action:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.primary-foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.app}"
    height: "2.25rem"
  workspace-header-row:
    backgroundColor: "{colors.card}"
    height: "4rem"
  context-panel:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.app}"
    padding: "1.25rem"
  weekly-state-select:
    rounded: "{rounded.app}"
    height: "2.25rem"
    width: "8rem"
  home-hero:
    backgroundColor: "{colors.home-background}"
    textColor: "{colors.home-foreground}"
    typography: "{typography.home-display}"
---

# Design System: Slotly

## Overview

Interfaz sencilla y profesional, con acentos verdes y Geist, disponible en Claro u Oscuro. La portada amplía este mundo con un fondo crema en claro y un fondo verde profundo en oscuro, conservando el video de partículas aportado por el usuario. La demo pública reutiliza el dashboard original con datos ficticios. La extensión de temas y cargas del 29/10/2026 conserva las composiciones y el contexto histórico registrado más abajo.

**Key Characteristics:**

- Fondos y texto semánticos que cambian juntos entre claro y oscuro.
- Jerarquía tipográfica en Geist.
- Acciones principales verdes y formularios oficiales de Clerk.
- Espacio privado con cuatro vistas, listas con separadores y formularios bajo demanda.
- Portada abierta con video original y acceso a la demo; crema y tipos fluidos restringidos a esa superficie.
- Selector persistido por navegador y cargas estructurales sin texto visible de esquina.

## Colors

Los valores de color registrados en el bloque inicial proceden de `:root` y `:root.dark` de la hoja global. Las claves sin prefijo corresponden a claro; `dark-` registra sus valores oscuros, activados por la clase del documento, sin cambiar los nombres CSS. `home-` se limita a portada y no sustituye la paleta del dashboard o `/demo`. El párrafo histórico de Reto13 dentro del delimitador inicial es un defecto de formato previo, conservado fuera del alcance de esta extensión: ese bloque no se declara YAML portable validado. El sidecar sigue siendo JSON válido.

### Primary

- `accent`: acciones principales, navegación activa, confirmaciones y foco visible.
- `accent-hover`: fondo de la acción principal al pasar el cursor.
- `surface`: fondo tonal de avisos y estados de interacción del espacio privado; combinado con `line` forma las piezas de carga.
- `selection`: fondo de la selección de texto, con `foreground` como texto.

### Neutral

- `background`: fondo general.
- `foreground`: texto principal.
- `muted`: descripciones, notas y pie.
- `line`: separadores de cabecera y pie.
- `card`: superficies elevadas por tono, campos públicos, menú de tema y fondo oficial de Clerk.
- `primary-foreground`: texto sobre el acento; `destructive-foreground`: texto sobre una acción destructiva. Cambian con el fondo y sustituyen el blanco fijo en los botones vigentes.
- `white`: valor histórico conservado; no gobierna los foregrounds de acciones ni los fondos dependientes del tema.
- `destructive`: mensajes de error, acción de cancelación y texto de citas canceladas. Su foreground específico conserva la pareja de contraste en ambos temas.

`home-background` integra el video sin recuadro en ambos temas; `home-foreground` y `home-muted` sostienen sus dos niveles de lectura. `home-line` separa la presentación de producto y el pie, divide los pasos móviles, forma los segmentos inactivos del indicador y enmarca las capturas; `home-control-border` delimita la acción secundaria. `home-selection` se limita a la selección de texto de esta página. «Calma», enlaces de producto, segmento activo y caret usan `home-accent`; los botones principales siguen usando `accent` y `primary-foreground`. Los azules y amarillos del video pertenecen al material del usuario, sin extender la paleta del dashboard. El antiguo separador de filas `home-row-line` deja de usarse al retirar la lista de ejemplo.

Los pares `confirmed-*`, `completed-*`, `absent-*` y `block-*` mantienen los significados de Confirmada, Completada, No asistió y bloqueo; `cancelled-bg` se combina con `destructive`. Los tonos `calendar-*` separan malla tenue, fuera de atención, Hoy y resaltado sin cambiar los estados ni la geometría. Son roles implementados del calendario, no permiso para trasladar sus tonos a nuevas superficies.

Los aliases de shadcn conservan el significado de Slotly: `primary` y `ring` → `accent`; `secondary` → `surface`; `secondary-foreground`, `card-foreground` y `popover-foreground` → `foreground`; `popover` → `card`; `muted-foreground` → `muted`; `border` e `input` CSS → `line`. La utilidad Tailwind `color-input` toma `muted`, como en la fuente actual; no se homogeneiza esa diferencia en documentación. Los foregrounds de acciones tienen aliases propios en Tailwind.

Las reservas personalizadas conservan Verde, Azul, Terracota y Ciruela. `publicThemeStyle` resuelve acento, hover, superficie y selección mediante `light-dark()` y `color-scheme`; sus valores locales permanecen en `lib/public-appearance.ts`, sin convertirlos en cuatro identidades del workspace.

**The Semantic Foreground Rule.** Cada acción usa el foreground de su rol y tema; no heredar blanco fijo para botones en oscuro.

## Typography

Geist es la fuente de la interfaz, mediante la variable existente y su respaldo sans-serif. Geist Mono está cargada, sin un papel visual usado en estas pantallas.

El frontmatter conserva la escala base existente y añade dos roles `home-display` propios de la portada vigente. `title`, `auth-title`, `body` y `label` mantienen su alcance en el resto de la interfaz; el antiguo rol `display` no gobierna el nuevo hero.

En home, el titular usa el rol fluido de escritorio; entre los puntos locales de (900px) y (600px) mide (66px), y hasta (600px) usa `home-display-mobile`. Su salto explícito y el reflujo producen dos o tres líneas según el ancho. El énfasis usa el verde existente, sin cursiva. La frase de apoyo «Un hueco para cada cita. Más espacio para lo que haces bien.» ya no tiene salto forzado: ocupa una línea en escritorio y fluye naturalmente hasta (900px). Mide (18px), o (16px) en móvil, con interlineado (1.65).

El recorrido de producto entra directamente en sus tres pasos, sin título o introducción visibles. Cada nombre de apartado usa un tamaño fluido de (32–48px), peso (500) e interlineado (1.08); hasta (900px) mide (40px) y hasta (600px), (36px). El resumen mide (22px), o (20px) en móvil; el cuerpo mide (16px), o (15px) en móvil, con interlineado (1.65). Enlaces de paso usan (14px); contador y pie, (12px). Estos valores observados pertenecen solo a home y no amplían la escala global. Las acciones heredan su altura de (36px), con texto de (12px) en home móvil.

En el espacio privado, los títulos visibles de vista usan el tamaño base de title (1.5rem), aumentan en `sm` (1.875rem) y conservan peso seminegrita (600) y espaciado cerrado. Agenda mantiene su h1 solo para lectores de pantalla; la cabecera visible reúne el nombre del negocio y Nueva cita. Los títulos de panel y estados vacíos usan (1.125rem); las descripciones, etiquetas y listas usan principalmente (0.875rem). La navegación móvil usa (0.75rem) y aumenta en `md` (0.875rem). Las horas y duraciones usan cifras tabulares.

## Layout

La portada vigente usa un contenedor de hasta (1320px), con (56px) por lado; hasta (900px), los márgenes pasan a (24px). La cabecera mide (88px), o (72px) hasta (600px). Hero, presentación de producto y pie forman un documento vertical abierto, sin el panel de cuenta anterior ni el caption de esquina.

Hasta (360px), la cabecera de portada permite reflujo, recupera altura natural con mínimo de (72px) y da una fila completa a la navegación para conservar dentro del viewport el selector de tema de (36×36px).

El hero coloca el texto a la izquierda y el video a la derecha, con altura mínima fluida entre (600px) y (850px). El texto ocupa (56%) y pasa a (66%) hasta (900px); el video cuadrado admite un ancho de hasta (760px). Hasta (600px), el texto ocupa todo el ancho, el video se sitúa debajo y el hero reserva (390px) inferiores dentro de una altura mínima de (820px). Las acciones comparten fila cuando caben y admiten reflujo; no hay fila secundaria de correo o pausa.

La segunda sección usa tres columnas de escritorio: texto, captura e indicador derecho, con proporción (1:2), columna de (36px) y separación de (40px). Los pasos tienen altura mínima fluida de (420–480px) y relleno vertical de (48px), con la captura sticky centrada en el área visible. Hasta (900px), cada texto lleva debajo su imagen, los pasos recuperan altura natural con relleno vertical de (36px) y una línea entre ellos; el indicador sigue sticky en una columna de (20px) separada (12px). Sus tres botones conservan áreas de (36×36px) y un contador sin salto de línea. Las capturas mantienen la proporción del JPEG (1280×650), ocultando exclusivamente sus (45px) superiores mediante el marco CSS; no se reconstruye el calendario para móvil. El visor limita la imagen al viewport y conserva el mismo recorte superior.

Los puntos de cambio utilizados son `sm` (40rem), `md` (48rem) y `lg` (64rem). El login y el registro comparten `AuthShell`: un panel de dos columnas iguales desde `lg`, con formulario a la izquierda y una fotografía grande a la derecha. Su ancho máximo es (72rem), con fondo exterior verde claro y bordes redondeados. En tamaños inferiores se oculta la fotografía y el formulario conserva un máximo de (24rem). El pie permite que su contenido cambie de línea.

El espacio privado tiene un contenedor propio de (80rem), centrado y de ancho disponible. El relleno horizontal es (1rem), aumenta a (2rem) en `sm` y a (3rem) en `lg`; el contenido usa relleno vertical de (1.75rem), que aumenta a (2.5rem) en `sm`. La cabecera tiene una primera fila de (64px). Antes de `md`, los cuatro destinos ocupan una segunda fila de columnas iguales, con icono sobre etiqueta y una altura mínima de (56px); desde `md` se alinean junto a marca y cuenta.

Agenda, Servicios y Fechas especiales muestran una lista de ancho completo hasta abrir un panel. Desde `lg`, el listado comparte una rejilla con una columna derecha de (23rem) y separación de (1.5rem). En tamaños inferiores, el panel aparece antes del listado. El panel usa relleno de (1.25rem), que aumenta a (1.5rem) en `sm`. Horario limita la semana a (48rem) y su sección de fechas especiales a (64rem); la lectura del negocio a (42rem) y su creación inicial a (36rem).

Los filtros de Agenda responden al ancho disponible de su contenedor. Nombre del cliente, servicio, período, Desde, Hasta y Buscar comparten seis columnas desde (70rem); desde (40rem) usan tres columnas; desde (20rem), dos, con nombre y grupo de acción a todo el ancho; por debajo, una. Desde y Hasta permanecen visibles. Esta adaptación también se aplica al abrir el panel de Nueva cita, aunque la ventana siga siendo de escritorio. El formulario tiene separadores superior e inferior y relleno vertical de (1rem); el listado empieza inmediatamente después, sin banda visible de Resultados/contador ni un segundo separador superior.

## Elevation & Depth

Las superficies propias usan fondo, contraste tonal y separadores. El menú de tema introduce una sombra local (`0 8px 24px rgb(0 0 0 / .15)`) para distinguir esa capa flotante; no redefine el shell continuo ni la política de los paneles vigentes, descritos en sus precisiones históricas. Los fondos dependientes del tema usan `card`, `background` o `surface` según la fuente. El diálogo de salida con borradores oscurece el fondo con el texto principal al (20%); los diálogos de cancelación y reprogramación usan ese color al (30%). Los formularios conservan los estilos internos oficiales de Clerk.

En la portada, el video se mezcla con el crema mediante `darken`, sin tarjeta, sombra ni imagen sustituta. El recorrido de producto mantiene el campo abierto y usa espacio, jerarquía tipográfica, indicador y borde fino de imagen para ordenar la lectura. Solo el visor superpone un fondo oscuro local (80%) y la captura, sin sombra; no añade un token de elevación global.

En oscuro el mismo MP4 usa mezcla `screen` con `invert(1) hue-rotate(180deg) contrast(1.25)` sobre `home-background`; se conserva el material original. La marca transparente usa el filtro blanco del tema oscuro, con la misma proporción.

## Shapes

El radio compartido de la aplicación es `app`: 6px (0.375rem). Se aplica a inputs, botones, enlaces de acción, paneles, marco de autenticación, menús y superficies de Clerk. Las superficies propias usan `rounded-md`; Clerk usa su variable oficial y los ajustes de tarjeta y modal. Los avatares conservan su forma circular y los contenedores internos sin superficie visible pueden mantener radio cero. Los separadores de cabecera y pie son líneas finas con `line`.

La portada conserva ese radio en sus acciones y en el indicador de ampliación de (36×36px). Solo el marco de las capturas introduce radios locales de (12px), reducidos a (8px) hasta (600px); el visor usa (8px). Los segmentos del indicador miden (3×36px), con extremos redondeados de (3px); sus botones de navegación conservan (36×36px). Son geometrías locales y no modifican el radio compartido de los controles. La línea estructural y los marcos usan `home-line`.

## Components

### Marca y navegación

La marca usa el logo proporcionado por el usuario, con el calendario adaptado al verde de acción y la palabra oscura. La cabecera coloca la marca junto al acceso o menú de cuenta. El enlace para saltar al contenido se hace visible al recibir foco.

El archivo `public/slotly-logo.png` tiene fondo transparente y proporción 3:1. `Brand` lo muestra con `next/image` a 80px de ancho en móvil y 96px desde `sm`, conservando la proporción. La cabecera de portada mide (88px), o (72px) en su punto móvil local; la primera fila privada histórica usa (64px), con las composiciones vigentes del dashboard detalladas más abajo.

La navegación privada ofrece Agenda, Servicios, Horario y Negocio. Usa iconos de Lucide de (16px), etiquetas sin salto de línea, texto secundario en reposo y acento con borde inferior de (2px) para la vista actual, anunciada con `aria-current="page"`. Al pasar el cursor usa texto principal y superficie verde clara al (50%). Al cambiar de vista, el foco pasa a su h1; en Agenda permanece solo para lectores de pantalla. El título del documento identifica la vista.

El favicon y los iconos de la aplicación usan solo el calendario, sin la palabra Slotly. Su fuente es `public/slotly-mark.png`, con fondo exterior transparente e interior blanco. Las variantes de Apple y maskable se apoyan en el fondo claro `background`; la variante maskable reserva margen para los recortes de los lanzadores móviles.

### Enlaces de acción

`button-primary` y `button-secondary` sirven para acciones y enlaces de navegación. Comparten altura mínima de 36px (2.25rem), relleno vertical de 6px, relleno horizontal de 16px y separación interna de 8px. Los campos y selectores propios reutilizan `form-control`, con la misma altura mínima de 36px, texto de 14px y relleno horizontal de 12px. La apariencia global de Clerk conserva esa altura y relleno vertical en sus campos y botones de formulario. Los controles de avatar y del menú de usuario oficial de Clerk mantienen sus áreas de interacción de 44px.

Preferencia permanente explícita del usuario: todos los inputs, selects y botones propios de Slotly se mantienen compactos, con (36px) de altura en escritorio y móvil. Incluye Nueva cita, Nuevo servicio, Confirmar cita, Guardar semana, filtros y acciones de Agenda, carga de servicios, cierre de panel y controles de los diálogos de salida, cancelación y reprogramación. Los botones de solo icono miden (36×36px). No imponer (44px) por defecto sin una nueva petición del usuario. La navegación y el `UserButton` oficial de Clerk son elementos distintos y conservan su configuración. Los botones con icono en las acciones de cabecera mantienen el relleno horizontal de (12px).

La altura se hereda de las primitivas: `Input` y `NativeSelect` usan `h-9`; `Button` usa `h-9` en su tamaño predeterminado y `size-9` para `size="icon"`, sin variantes responsive que agranden esos defaults. Los consumidores del dashboard no repiten clases de altura. El aumento anterior a 44px procedía de overrides locales `h-11`/`min-h-11`/`min-w-11`, no del tamaño base. Las variantes explícitas útiles se conservan cuando se solicitan deliberadamente; esta preferencia no modifica Textarea ni Clerk.

La acción secundaria tiene borde verde al 25% y, al pasar el cursor, fondo verde al 5%. Los cambios de color usan la transición existente (150ms), desactivada cuando se solicita movimiento reducido. Los enlaces de texto se subrayan al pasar el cursor.

El foco visible global usa un contorno de acento (3px) separado del elemento (4px).

### Menú de usuario

La cuenta autenticada conserva el avatar del `UserButton` oficial, con nombre accesible aportado por Clerk y un área de interacción mínima de 44px. El selector de tema propio lo acompaña en el grupo de cuenta del workspace; no modifica su tamaño. La apariencia de Clerk se comparte desde `ClerkProvider`.

El desplegable tiene 18rem de ancho, limitado al ancho de la ventana menos 2rem, y radio de 6px. La identidad usa relleno de 16px y separación de 12px; el nombre y el correo pueden partirse cuando son largos. Las acciones conservan una altura mínima de 44px, con iconos alineados y el radio compartido de 6px. Se mantienen las funciones oficiales de administrar cuenta y cerrar sesión.

El aviso de desarrollo se oculta mediante la opción oficial `unsafe_disableDevelopmentModeWarnings` para previsualizar el aspecto de producción del menú. La marca «Secured by Clerk» depende de la opción remota **Settings → Branding → Remove "Secured by Clerk" branding**; no se oculta mediante CSS ni se da por eliminada desde el código local.

### Portada con partículas y presentación de producto (29/10/2026)

La portada sustituye el panel de cuenta por un hero abierto con el MP4 original del usuario. Dos capas del mismo video, desfasadas media duración y con fundido periódico `sin²`, cubren sus reinicios sin modificar el archivo. No hay botón ni estado de pausa manual. Ambas capas se pausan al ocultar la pestaña y ante movimiento reducido; en condiciones normales se reproducen automáticamente. El material es decorativo, silencioso y queda fuera del árbol accesible. No se generó poster ni animación sustituta; las imágenes de producto son capturas de otra sección.

Ver demo aparece en cabecera y como acción principal. El acceso secundario inicia Google mediante Clerk; ofrece estado de conexión y error con recuperación hacia Iniciar sesión. Con sesión, se muestra Ir a mi agenda y la cabecera ofrece Mi agenda junto al UserButton oficial. El hero ya no incluye «O crea tu cuenta con correo». Las flechas son SVG decorativos de (14px), con el mismo trazo; el foco local usa contorno de (2px) separado (5px), y la selección y el caret están definidos para home. Los enlaces subrayan al pasar el cursor mediante una transición local de (160ms), desactivada con movimiento reducido.

El recorrido presenta Agenda, Clientes y Servicios y horarios directamente, sin introducción ni pestañas. Es una adaptación atribuida del registro Sticky Scroll Reveal de Aceternity: Motion sigue el scroll del documento y cambia la captura sticky de escritorio con fundido/desenfoque de (350ms). El apartado activo cambia el tono del título en (300ms); movimiento reducido elimina esa transición y el fundido. Tres segmentos a la derecha reflejan el apartado mediante verde y `aria-current="step"`; cada botón anuncia posición y nombre, y desplaza a su paso con scroll suave o instantáneo ante movimiento reducido. El contador muestra (1/3–3/3) sin partirse y la navegación permanece en móvil. Cada paso reúne nombre, resumen, explicación y enlace: `/demo`, `/demo?vista=clientes` y `/demo?vista=servicios`. La única dependencia directa nueva es Motion (14.7.1); no cambia el sistema global.

Los JPEG locales `public/media/product/{agenda,clientes,servicios}.jpg` proceden de capturas nativas CUA del dashboard original en la demo, con datos ficticios y contactos `example.test`, a (1280×650). Los archivos conservan su aviso y origen embebido sin edición de píxeles; preview y visor ocultan los (45px) superiores mediante margen negativo y clipping CSS. No hay captions inferiores y los enlaces siguen junto al texto. En la aplicación, las importaciones estáticas de Next Image aportan hash y dimensiones, `sizes` adapta la carga diferida y cada captura abre un Dialog oficial de Radix con título accesible, foco contenido y retorno al disparador. Enter abre; Escape o clic exterior cierran; pulsar la imagen la mantiene abierta. El sidecar representa los tres estados con sus imágenes y recorte como muestras estáticas: no reproduce Motion, el diálogo Radix ni la optimización de Next Image.

La demo monta el workspace, calendario, paneles, formularios y diálogos originales con adaptadores locales; conserva su fondo, densidad y desplazamiento interior. Solo la banda de demo, su reinicio y la cuenta ficticia identifican el entorno; el recorte de las imágenes no retira esa banda del entorno real. El crema, el video y la escala fluida pertenecen a `/`, sin overrides de identidad sobre ese dashboard. Evidencia nueva y límites del refinamiento en `.impeccable/review/home-sticky/documentation.md`; las pruebas históricas de home, home-product y Reto 13 conservan su alcance.

### Temas y estados de carga (29/10/2026)

Claro y Oscuro son los dos modos. `AppThemeProvider` escribe la clase del documento, persiste la preferencia en `slotly-theme` y comienza en Claro cuando no hay elección guardada. No sigue el tema del sistema operativo; una preferencia antigua Sistema se presenta como Claro hasta elegir uno de los dos modos. El cambio de tema desactiva las transiciones de color durante la conmutación. `color-scheme` acompaña la clase para los controles nativos y las paletas públicas resueltas con `light-dark()`.

`ThemeToggle` usa `Button size="icon"` de (36×36px), nombre accesible «Cambiar tema» e iconos SVG decorativos de (18px). Clic, Enter o Espacio alternan directamente entre Claro y Oscuro, sin desplegable ni opción Sistema. Los iconos dependen de la clase CSS del documento para conservar el renderizado seguro de servidor. Dentro de un diálogo nativo, el botón mantiene su foco y no altera la apertura del panel. Está en portada, grupo de cuenta del workspace y cabeceras de acceso, reserva y gestión pública; el grupo de cuenta mantiene su montaje único en el rail modal.

La carga anticipa la estructura que ocupará el contenido. `DashboardSkeleton` dispone toolbar, filtros/minicalendario, malla de siete días, bloques de citas y rail a altura de viewport (`100dvh`, mínimo de 400px); incrustado toma la altura de su contenedor y omite el rail duplicado. Hasta (700px), oculta la columna de filtros y reduce la distribución de placeholders; las piezas de (28px) del rail móvil son decorativas y no cambian el tamaño de ningún botón real. `CalendarSkeleton` cubre solo la grilla mientras se prepara y el calendario real queda oculto durante `aria-busy`. `FormSkeleton` reserva título, líneas, campos de (36px) y envío; la variante de reserva añade calendario y se apila en móvil. `ListSkeleton` dibuja tres filas de título/detalle. Se reutilizan en las fronteras de ruta, acceso oficial, consultas iniciales y cargas parciales, incluyendo semana, servicios, clientes y fechas especiales; no simulan un tiempo de espera artificial en la app.

Cada contenedor de carga usa `role="status"`, un `aria-label` contextual y `aria-busy="true"`; las piezas `Skeleton` llevan `aria-hidden="true"`. No hay texto visible «Cargando…» pequeño en una esquina: el nombre sigue disponible para tecnologías de asistencia. Esto no elimina los mensajes visibles de error, vacío o recuperación que corresponden a otros estados.

Las piezas tienen radio compartido y mezcla `color-mix(in srgb, var(--line) 65%, var(--surface))`. El pulso `skeleton-breathe` dura (1.8s), `ease-in-out`, baja a opacidad (0.45) a mitad de ciclo y desaparece por completo con `prefers-reduced-motion: reduce`. El placeholder permanece visible y estable sin animación.

**The Structural Loading Rule.** La espera conserva la anatomía del contenido y un estado accesible, sin rótulos visibles de esquina ni movimiento cuando se solicita reducirlo.

**The Compact Control Rule.** Input, NativeSelect y Button fijan (36px) por defecto; el selector de tema hereda (36×36px). Las piezas decorativas de carga y el UserButton oficial no redefinen esa regla.

Evidencia del ejecutor y límites de esta extensión: [dark-loading/README.md](.impeccable/review/dark-loading/README.md) y [registro documental](.impeccable/review/dark-loading/documentation.md). El aviso experimental de navegación instantánea de portada en Next sigue documentado; build correcto no implica consola libre de incidencias. Los bloques anteriores y posteriores conservan su valor histórico; las afirmaciones de paleta exclusivamente clara y carga textual quedan sustituidas por este contrato de temas y cargas.

### Autenticación

Usar los componentes oficiales `SignIn` y `SignUp` de Clerk, con la localización española existente. Ambos utilizan `authAppearance`, con el verde de acción, el texto principal y Geist. Clerk recibe el tema oficial `shadcn` y las variables de Slotly para primario, foreground de primario, texto, texto secundario, tarjeta e inputs; sus estados internos pertenecen a Clerk.

El login y el registro integran su componente oficial directamente en la columna, sin borde ni sombra de tarjeta. La marca, el formulario y el pie comparten alineación y un ancho máximo de (24rem). Los títulos se alinean a la izquierda y los distintos pasos conservan su comportamiento oficial. Los campos y botones tienen altura mínima (2.25rem), relleno vertical (0.375rem), radio compartido de 6px y Google aparece después del acceso por correo. Ambos usan la fotografía `public/login-workspace.png`, un espacio de trabajo con luz natural, madera y tonos salvia, con recorte `cover` y sin texto superpuesto. Es decorativa y queda fuera del árbol accesible.

### Paneles contextuales y borradores

Nueva cita, Nuevo servicio y Fecha especial abren un `aside` no modal dentro de la página. No tienen fondo de superposición ni trampa de foco. Al abrir, el foco pasa al primer selector o campo habilitado; si no existe, al botón de envío habilitado. Al cerrar con el botón o Escape vuelve al disparador; si desapareció la fecha editada, vuelve a Añadir fecha. El cierre queda deshabilitado durante el guardado. El contenido se monta al abrirlo por primera vez y permanece montado al ocultarlo, por lo que cerrar el panel o cambiar de vista conserva el borrador.

La vista y los filtros aplicados de Agenda se reflejan en la URL de `/dashboard`, mediante el historial nativo y `useSearchParams`. Las cuatro vistas permanecen montadas para conservar su estado al navegar y volver. Los cambios de servicio o fecha de una cita también cuentan como borrador aunque aún no se haya elegido horario ni escrito un cliente. Salir del documento mediante un enlace presenta un diálogo HTML con «Seguir editando» como foco inicial y «Salir sin guardar» como alternativa; recargar o cerrar la pestaña usa el aviso nativo de `beforeunload`. Los borradores viven en esta pestaña; el guardado sigue siendo explícito. Ante un fallo transitorio de autenticación Convex se oculta el espacio privado y se suspenden sus consultas, conservando el borrador de la misma identidad. Recuperar conexión/foco/visibilidad puede reintentar el acceso si Clerk sigue conectado; «Reintentar acceso» ofrece la misma recuperación explícita y hereda los 36px del Button base. El estado vuelve a autenticado únicamente después de validación de Convex, sin recargar la página. Si Clerk confirma cierre de sesión, el contenido privado y sus borradores se desmontan; cambiar de usuario siempre reinicia el subárbol privado.

### Perfil del negocio

Cuando existe un negocio, Negocio presenta nombre y zona IANA como una lista de definición con separadores y enlaces contextuales a Agenda y Horario. Es una vista de lectura. Si aún no existe, aparece la creación inicial con una breve introducción, etiquetas visibles, controles compactos y una única acción «Guardar perfil».

El formulario usa la anatomía oficial de shadcn/ui: `FieldGroup`, `Field`, `FieldLabel` y `FieldError`, con `Input`, `Button` y `NativeSelect`, adaptados al tema existente. Los errores de campo utilizan `destructive`, `data-invalid`, `aria-invalid` y un mensaje asociado mediante `aria-describedby`; el foco pasa al primer campo inválido después del envío. React Hook Form y Zod gestionan el estado y la validación. Los errores generales conservan los valores, y el estado de guardado permanece anunciado para lectores de pantalla. La zona horaria es un selector nativo cerrado, con opciones IANA generadas en servidor y UTC; inicia en `America/Montevideo`. En móvil el botón ocupa el ancho del formulario. Los aliases semánticos de shadcn apuntan a los colores de Slotly y conservan el significado anterior de `accent` y `muted`.

### Servicios y horario

Servicios presenta nombre y duración en filas con separadores finos; la duración queda alineada al extremo y usa un icono de reloj decorativo. El estado vacío tiene borde discontinuo y una indicación para añadir el primer servicio. Nuevo servicio abre el panel contextual con nombre y duración apilados, sin ocultar la lista.

Horario es una vista propia con título, explicación breve y zona IANA. Cada día se separa por una línea; los días abiertos muestran estado, apertura y cierre. En móvil, día y estado comparten la primera fila y las horas ocupan dos columnas; un día cerrado se reduce a esa fila. Desde `sm`, los días usan tres columnas y los cerrados indican «Sin atención». El wrapper del selector Abierto/Cerrado mide (128px), el select ocupa todo su ancho y la flecha permanece dentro del borde.

La barra de guardado semanal permanece junto al borde inferior al desplazarse, con fondo general y separador superior. Distingue semana sin configurar, cambios sin guardar, guardado en curso, error y cambios guardados. «Guardar semana» guarda la semana completa explícitamente y queda deshabilitado durante el envío o cuando una semana existente no cambió.

### Fechas especiales

Debajo de la semana, un separador y el título Fechas especiales introducen una lista paginada de fechas individuales. Cada fila muestra la fecha completa, «Cerrado» o su intervalo con cifras tabulares y Editar. Añadir fecha usa una acción secundaria con el icono Plus de Lucide. La carga inicial, el estado vacío y Cargar más fechas mantienen texto breve y el patrón de lista existente; la semana conserva su guardado independiente.

Añadir fecha y Editar abren el panel contextual con Fecha y Atención; Abierto añade Apertura y Cierre en dos columnas. Una excepción admite cerrado completo o un solo tramo del mismo día. La fecha queda deshabilitada al editar y el foco inicial pasa a Atención. Guardar fecha es la acción principal; Eliminar excepción es secundaria y restaura la semana habitual. En móvil el panel precede la lista y las acciones cambian de línea cuando falta ancho. Inputs, selectores y botones heredan (36px), y el cierre hereda (36×36px), sin nuevas alturas locales, superficies ni recursos gráficos.

Los campos se conservan al cerrar, cambiar de fecha o alternar editores y vistas. La identidad y revisión aceptadas no se sustituyen silenciosamente al recibir una actualización: el panel muestra la configuración actual y exige «Revisar configuración actual» antes de habilitar otra escritura, conservando los campos elegidos. Un error de campo recibe foco y se asocia al mensaje; un error general recibe foco dentro del panel. Un bloqueo inmediato evita envíos duplicados, y los controles y Escape quedan deshabilitados durante el envío. Ante una confirmación incierta, «Comprobar intento anterior» repite el comando conservado y bloquea la edición hasta resolverlo.

Cuando hay citas confirmadas, un único aviso contextual muestra su recuento y explica que los cambios las conservan. Tras la respuesta, el resultado incorpora ese recuento y sustituye el aviso previo. Solo un cambio efectivo emite «Fecha especial guardada» o «Semana habitual restaurada»; los resultados ya aplicados o sin cambio se explican en el panel sin otro toast. La disponibilidad privada de creación y reprogramación y la reserva pública reciben actualizaciones reactivas de la fecha, conservando sus composiciones existentes.

### Confirmaciones por toast

Las escrituras de servicio, horario y cita se confirman con «Servicio creado», «Horario guardado», «Cita confirmada», «Cita cancelada.» y «Cita reprogramada.» mediante Sonner y el wrapper de shadcn/ui adaptado al tema claro. Hay un único `Toaster` en el layout raíz. La confirmación se emite solo después de una escritura efectiva. Una cancelación o reprogramación ya aplicada, incluida la recibida desde otra pestaña, se explica en el diálogo sin un nuevo toast; elegir el mismo intervalo tampoco genera éxito. El resultado de reprogramación permanece visible con el horario guardado y Ver día. Consultar disponibilidad no emite un toast. Los errores de formulario permanecen en `FieldError`; los de cancelación y reprogramación permanecen en el diálogo con foco. El estado de guardado conserva su anuncio exclusivo para lectores de pantalla.

El toast reutiliza Geist con texto de (14px), fondo `surface`, texto `foreground`, borde fino `line`, radio compartido de (6px) y ninguna sombra. El icono de éxito es `CircleCheck` de Lucide, decorativo, de (16px) y color `accent`. Conserva la posición nativa de Sonner en la esquina inferior derecha, con márgenes móviles de (16px) y duración base de (4000ms).

La región de notificaciones se anuncia mediante `aria-live="polite"`, con el nombre «Notificaciones» y el atajo nativo `Alt+T`. Mostrar el éxito no toma el foco. Al crear un servicio, el formulario se limpia y el foco vuelve a «Nombre del servicio»; al confirmar una cita se limpian cliente y horario y el foco vuelve al selector de horario. Guardar la semana conserva sus valores y marca el borrador como guardado. Se mantiene un único anuncio accesible de cada confirmación.

### Citas privadas

Agenda presenta un único listado paginado, con Hoy como período inicial según la zona IANA del negocio. Nombre del negocio y Nueva cita comparten la cabecera compacta. No hay selector de modos ni botón Limpiar. El h1 Agenda, las ayudas de nombre/rango/período y el contexto de zona y orden permanecen solo para lectores de pantalla.

El formulario reúne seis controles con etiquetas visibles: nombre del cliente, servicio, período, Desde, Hasta y Buscar. Los límites permanecen a la vista: Hoy muestra hoy en ambos; Todas los vacía; Próximas muestra hoy en Desde; Pasadas muestra ayer en Hasta. Editar una fecha selecciona Personalizado, que exige al menos un extremo y admite dejar el otro vacío. Ambos límites son inclusivos. Buscar o Enter aplica todos los filtros combinados; un rango invertido muestra un error sin cambiar la consulta aplicada. El nombre permite un fragmento literal con o sin tildes. Los controles heredan los (36px) de las primitivas existentes.

Cada fila muestra fecha completa, inicio/fin en la zona IANA del negocio, cliente, servicio, estado textual y un único botón de tres puntos verticales, con separadores finos y orden cronológico ascendente por fecha e inicio. «Cancelada» usa el color destructivo y añade la fecha/hora de cancelación con zona IANA; «Confirmada» conserva su tratamiento anterior. Cuando existe, «Última reprogramación» aparece como nota secundaria con fecha/hora y zona IANA. El botón sustituye toda la columna de Ver día, Reprogramar y Cancelar cita. En móvil, fecha y horas ocupan la primera fila, y cliente/servicio y el botón comparten la segunda; desde `sm`, fecha/horas, cliente/servicio y botón forman tres columnas. Ver día, dentro del menú, aplica esa fecha en ambos límites de Personalizado dentro del mismo listado, conservando nombre, servicio y borrador. No se añade filtro de estado ni una banda nueva.

El encabezado Resultados y su contador permanecen solo para lectores de pantalla: anuncian la carga y distinguen citas cargadas con páginas pendientes de un total encontrado al agotar la consulta. El listado empieza inmediatamente después de los filtros. Un tramo sin coincidencias conserva «La búsqueda continúa» y Seguir buscando mientras queden páginas; solo la búsqueda agotada muestra «Sin coincidencias». Cargar más citas cambia a «Buscando más citas…» y se deshabilita durante la carga. Las páginas pendientes mantienen una explicación visible. Los errores de lectura presentan una explicación y Reintentar búsqueda, conservando filtros y borrador.

Nueva cita reúne servicio, fecha, disponibilidad automática, horario y cliente en el panel contextual. Servicio y fecha disparan la consulta; «Confirmar cita» es la acción final y queda deshabilitada sin un horario vigente y nombre válido. Mantiene `Field`, React Hook Form, Zod, campos de (36px) y radio de (6px). Los selectores quedan deshabilitados mientras se confirma, y los envíos rápidos comparten un bloqueo inmediato del formulario. Si el filtro aplicado no coincide con el día del borrador, aparece un enlace para aplicar ese día en Agenda. El nombre y el horario se conservan ante errores; si el intervalo deja de estar disponible, se identifica en el selector y el error se asocia al campo, con foco para elegir otro. Las actualizaciones de disponibilidad conservan el borrador.

Un borrador nuevo hereda fecha únicamente cuando el filtro aplicado representa un solo día; con Todas, un rango de varios días o un extremo abierto, la fecha empieza vacía y exige elegirla. Un borrador existente conserva servicio, fecha, horario y cliente al aplicar filtros, usar Ver día, cambiar de vista o cerrar el panel. El enlace del panel permite aplicar el día del borrador en Agenda sin descartar los datos.

Los nombres largos pueden partirse dentro de la columna de contenido sin desplazar las fechas, horas ni la acción. Esta composición reutiliza los tokens y primitivas existentes; no introduce un segundo listado diario ni nuevos recursos gráficos.

### Menú de acciones de cita

El disparador es un botón sin fondo en reposo, con `EllipsisVertical` de Lucide y tamaño heredado de `Button size="icon"` (36×36px). Su nombre accesible identifica cliente, fecha y hora. `DropdownMenu` de Radix abre una superficie blanca plana, alineada al extremo derecho, con borde fino, radio compartido, ancho de (12rem) limitado a la ventana y desplazamiento vertical cuando lo exige el espacio. Las opciones combinan texto e iconos decorativos de (16px): `CalendarDays` para Ver día, `CalendarClock` para Reprogramar y `CalendarX2` para Cancelar cita. El resaltado usa la superficie verde clara; cancelar se separa con una línea y conserva texto y resaltado destructivos.

Ver día está disponible en todas las filas. Reprogramar y Cancelar cita se ofrecen solo en confirmadas futuras; canceladas, iniciadas y pasadas conservan únicamente Ver día. Radix gestiona Enter, Espacio, flechas, End, Escape y el cierre exterior. Al elegir un diálogo, el menú cierra y desmonta su ámbito de foco antes de entregárselo al diálogo, sin restaurarlo prematuramente. Al cerrar el diálogo vuelve al botón de puntos; si la fila salió del rango, pasa al enlace del aviso del horario guardado o al filtro Nombre del cliente. Ver día cierra el menú y conserva filtros, borrador e historial de navegación.

### Confirmación de cancelación

Cancelar cita abre un `AlertDialog` de Radix sobre el contenido. Reutiliza fondo claro, borde fino, radio compartido y espaciado de los paneles, sin sombra. El diálogo está centrado, limitado a (28rem), deja (16px) de margen mínimo por lado y admite desplazamiento vertical dentro de la ventana. Muestra fecha completa, intervalo, zona IANA y acciones; omite explicación permanente y bloques visibles de cliente/servicio, conservando una descripción accesible breve y los estados operativos necesarios.

Volver recibe el foco inicial; Tab y Mayús+Tab permanecen dentro del diálogo y Escape permite cerrarlo. Al confirmar se bloquean ambos botones y Escape hasta recibir respuesta, con «Cancelando…» y un anuncio de estado. Un error conserva el contexto y recibe foco; permite reintentar. Si la cita ya estaba cancelada o se cancela desde otra pestaña, el diálogo muestra «Cita ya cancelada», su timestamp y Cerrar, sin ofrecer otra cancelación. Al cerrar, el foco vuelve al botón de puntos de la misma fila o al destino alternativo descrito para el menú si esa fila dejó de estar visible. Estos estados conservan filtros, navegación y borrador de Nueva cita.

El contexto revisado se conserva al abrir. Si otra pestaña reprograma la cita, la confirmación queda bloqueada y muestra el horario actual con «Revisar horario actualizado»; solo esa acción sustituye el contexto aceptado antes de volver a permitir cancelar. Si otra pestaña la cancela, se muestra el estado ya cancelado descrito arriba.

### Reprogramación de citas

Reprogramar abre un `Dialog` de Radix con la misma superficie clara, borde fino, radio compartido, ancho máximo de (28rem), margen mínimo de (16px), relleno y desplazamiento vertical de la confirmación de cancelación. Muestra el horario original revisado y los campos Nueva fecha y Nuevo horario. Por preferencia explícita del usuario, reduce el subtexto de información extra: omite la explicación permanente, el bloque visible de cliente/servicio y el resumen repetido del destino. Conserva descripción accesible y mensajes necesarios según el estado. El horario actual sigue reservado hasta confirmar. Los campos y botones heredan (36px); las acciones cambian de línea cuando el ancho lo exige.

Nueva fecha recibe el foco inicial y consulta las opciones para el servicio conservado. La selección permanece ante errores y actualizaciones; una opción vencida o no disponible se identifica dentro del selector. Los errores reciben foco y los estados de consulta y guardado se anuncian. Tab y Mayús+Tab permanecen dentro; Volver y Escape cierran mientras no haya envío. Un bloqueo inmediato evita duplicados y deshabilita los controles y Escape durante la espera. Al cerrar se restaura el foco en el botón de puntos, en el enlace del aviso del horario guardado o en Nombre del cliente cuando la fila ya no está en el rango.

Un cambio remoto conserva el contexto original y los campos elegidos, muestra el horario actual y exige «Revisar horario actualizado» antes de confirmar. Una cancelación remota bloquea el movimiento. Ante una respuesta incierta, «Comprobar intento anterior» permite repetir ese intento conservado. El resultado distingue movimiento guardado, movimiento ya aplicado y mismo intervalo; solo el primero emite el toast. Si la cita cambió después del intento, el diálogo explica su horario actual o su cancelación. Agenda conserva filtros, URL y borradores, y muestra la fecha e intervalo guardados junto a Ver día, también cuando el movimiento queda fuera del rango visible.


### Extensión visual actual: calendario de Agenda

Esta descripción vigente sustituye las anteriores de FullCalendar en esta superficie. Conserva claro/verde, Geist, Lucide, superficies planas, borde fino, radio compartido de (6px), controles heredados de (36px) y botones de icono de (36×36px). Solo Agenda deja (16px) entre navegación global y toolbar; las otras vistas conservan su espaciado. Nombre del negocio y resumen de zona/filtros siguen accesibles sin banda visible redundante, con zona en formularios/detalles. Es un refinamiento local, sin cambiar frontmatter, tokens ni .impeccable/design.json.

La toolbar flexible ocupa ambas columnas y reúne Hoy, anterior/siguiente, intervalo, tabs Día/Semana/Mes y Nueva cita. Debajo, sidebar de (252px), separación de (24px) y calendario flexible arrancan alineados, sin compensaciones. Tabs controlados de Radix conservan roles, aria-selected, paneles y activación manual. Solo activar un tab cambia escala; las restantes acciones conservan vista, y elegir otra fecha de la misma semana conserva scroll. En Día/Semana, abreviatura de (12px) y número de (16px) comparten el botón de fecha de (36px). Verde/subrayado y aria-pressed indican selección; Hoy conserva aria-current y contorno propio. Cerrado queda en nombre accesible y fondo gris. La cabecera personalizada se expone al árbol accesible desde el hook público de montaje.

Las coincidencias temporales se resuelven progresivamente: una tarjeta representante, preferentemente Confirmada, conserva ancho habitual e intervalo original, y un indicador Layers2 con contador en la cabecera abre la lista completa. No se dibuja la duración agregada del grupo. El botón de (36×36px) conserva nombre accesible con fecha y recuento de todos los miembros, incluida la representante. El Popover modal de Radix se ancla debajo con separación de (6px), borde y radio de (6px), ancho máximo de (23rem) o viewport menos (32px), altura máxima de (28rem) o espacio disponible y lista con scroll propio. Cierre de (36×36px), fecha, nota de historial y filas con intervalos/nombres/servicios/estados completos evitan depender del color. La fila elegida cierra la capa antes de abrir detalle y devuelve el foco al indicador al terminar.

Confirmadas verdes y canceladas rojas mantienen fondos suaves y la franja de (3px) solicitada expresamente. En las tarjetas, hora de (12px), cliente de (14px) y metadatos de (12px) cuando caben conservan jerarquía; eventMinHeight=0 mantiene duración proporcional. El recorte tiene acceso completo bajo demanda: tooltip único conectado por aria-describedby en mouse/foco, con intervalo, cliente, servicio, estado, fecha y zona. Permite hover sobre su contenido y Escape; superficie plana con radio de (6px), ancho máximo de (20rem) o viewport menos (32px), altura limitada y scroll si hace falta. Touch mantiene lista y detalle. La franja, tamaño de (12px), radio interior de (3px) y tonos locales siguen siendo excepciones de esta superficie, no reglas globales.

El eje horario estrecho conserva padding horizontal de (2px), 24 horas, etiquetas españolas cada hora y cuartos de menor intensidad. La guía resalta exactamente la porción visible de una columna y un cuarto mediante rectángulos actuales de lanes/slots públicos. Contorno verde y relleno tenue acompañan fecha/hora civil; fuera de atención usa trazo discontinuo y texto explícito. La guía tiene pointer-events:none y no afirma disponibilidad. Su etiqueta y geometría se recalculan tras desplazamiento/zoom sin ratios de pixel persistidos; salir, scroll, resize, visibilidad, overlays y drag limpian o pausan el estado. La región enfocable conserva flechas, Home/End, PageUp/Down y Enter/Espacio hacia el editor validado. Mes no ofrece una hora inventada. El estado aislado evita reconstruir FullCalendar en cada hover y conserva la geometría de sus interacciones. Desmontar una lista abierta libera su pausa; el cleanup no cambia la presentación, según la revisión estática posterior de lifecycle-review.md.

Mes mantiene altura de (650px), seis filas y hora/cliente de (12px) en una línea; conserva todas las filas y dayMaxEvents adaptativo sin agrupación temporal. +N más cuenta las ocultas tras paginación/filtros y abre todas las citas del día en el popup oficial, con inicio/fin, cliente, estado y detalle/acciones. Su capa plana conserva ancho máximo de (23rem), radio de (6px), cierre de (36×36px), alto máximo de (26rem), ajuste a bordes y scroll. Clic, Enter, Espacio y touch abren; Escape/exterior cierran con foco útil. Las listas no inician arrastre ni creación accidental. Fondos fuera de atención y Especial respetan excepción → semana y conservan citas previas; canceladas no ocupan disponibilidad.

Nueva cita conserva Popover modal contextual en escritorio y Dialog por debajo de (640px), fondo claro, borde fino, radio de (6px), ancho máximo de (23rem), margen mínimo de (16px) y scroll. Cliente recibe foco; cierre recupera origen útil. Borradores del padre, bloqueos de duplicados y resolución por lectura de intentos inciertos mantienen el contrato existente. Filtros conserva maestro indeterminado/Confirmadas/Canceladas, estado vacío explícito y búsqueda global paginada; Localizar fecha conserva escala. Editor, detalle y confirmación de arrastre no incorporan otro flujo ni escritura al soltar.

Por debajo de (1024px), Filtros usa el Dialog lateral existente y la toolbar cambia de línea. Tabs reducen relleno horizontal a (8px) manteniendo (36px), junto a Nueva cita incluso a (320px). Día ocupa el ancho disponible. Semana usa mínimo interno de (620px), elevado a (800px) solo cuando hay grupos para alojar fecha y contador; Mes conserva (700px). La región horizontal enfocable evita desbordamiento global a (390px)/(320px). Las medidas de cabecera, malla y paneles describen esta superficie, sin añadir primitivas.

La revisión independiente actual de calendar-coincidences emite ship sin arreglos materiales. El documenter contrastó fuentes, informes y doce capturas sin navegador, pruebas o cloud propios. Coincidencia/lista/contenido sintéticos son documentos completos desde arriba, escritorio de 1440/1280×1000 y móvil de 973px de documento sobre viewport de 844px. Las imágenes de hora son viewports actuales, con 844px de alto en móvil; capturar full-page redimensiona temporalmente la emulación y limpia legítimamente la guía. cloud-lista es 1280×720 desde arriba y cloud-contenido 1265×712 desplazada por foco; no son full-page. El detector de una sola ejecución conserva un warning side-tab por la franja autorizada y 17 advisories locales; no se vacía ni legitima mediante tokens. Evidencia y atribuciones en la sección final de .impeccable/surfaces/app-dashboard-page-tsx.md y calendar-coincidences/design-documentation.md.
### Composición vigente del dashboard: lienzo y paneles (21/10/2026)

Esta sección final prevalece en la superficie `app/dashboard/page.tsx`. Las descripciones anteriores de navegación superior por vistas, listado inferior, Añadir servicio sobre el mini, representante Confirmada/Layers2, cabecera horizontal, Semana de 800px por coincidencias y Mes fijo de 650px se conservan como historia y quedan sustituidas. La composición nueva está expresamente aprobada; la identidad y los tokens compartidos no cambian. Las reglas de portada, autenticación, reserva pública y primitivas conservan su alcance.

El shell ocupa la ventana (100dvh), con cabecera de (56px) y rail derecho de (48px); Agenda permanece visible en el área restante, sin ancho máximo ni scroll documental. La toolbar contiene Menu, Hoy, navegación, intervalo y tabs manuales. Menu alterna el lateral izquierdo de (232px), sin hueco reservado al ocultarlo; a (1023px) o menos, los mismos nodos viven en un diálogo modal lateral. El lateral y los paneles largos tienen scroll propio. Añadir cita con Plus precede al minicalendario; Nueva cita solo aparece en toolbar cuando ese lateral está oculto. Crear servicio pertenece al panel Servicios.

FullCalendar recibe altura (100%) dentro de padres con altura definida y `min-height: 0`; su observación de tamaño de v7 acompaña el espacio disponible, sin `updateSize`. Las horas se desplazan dentro de la grilla. Semana mantiene un mínimo interno de (620px), también con grupos; Mes conserva (700px) de mínimo horizontal y adapta la altura útil. En Día/Semana, el día abreviado aparece sobre un número de (24px), centrado en un círculo de (36px). Hoy lleva relleno verde y la fecha seleccionada, contorno; sus atributos accesibles distinguen ambas condiciones. Este control de navegación compuesto conserva su altura deliberada de (64px), sin modificar la regla de (36px) de inputs, selects y botones propios ordinarios.

El rail reúne Servicios, Horario y Negocio mediante iconos Lucide, botones de (36×36px), nombres accesibles y tooltips. La sección activa usa superficie clara, acento y contorno. Sus formularios se presentan en un panel derecho de (360px) desde (1200px), que reserva solo su ancho; por debajo, un diálogo modal nativo admite una superficie de hasta (408px), incluido su rail interior de (48px). Se conserva un único subárbol de formularios al cerrar, cambiar sección y redimensionar. Servicios mantiene lista y creación; Horario, semana y fechas especiales; Negocio, perfil y enlace existente. Cerrar/cambiar se bloquea durante el envío; foco, errores, revisión explícita y recuperación siguen en contexto. Un solo portal Sonner se aloja dentro del modal cuando corresponde, sin duplicar confirmaciones.

La búsqueda de nombre usa un input compacto con lupa Search de (36×36px) dentro del extremo derecho. No hay botón Buscar exterior ni lista inferior. Servicio y estado aplican al cambiar, conservando el nombre aplicado; el texto aún no enviado permanece como borrador y muestra su diferencia cuando corresponde. Enter o lupa aplican ese texto. El resultado global paginado flota en un diálogo nativo no modal junto al campo en escritorio; en móvil es modal sobre el lateral. Usa borde fino, radio compartido, ancho máximo de (440px) limitado a la ventana y scroll interior. El encabezado recibe foco; Escape/cierre lo devuelve al campo. Carga, páginas pendientes, vacío agotado y error/reintento se distinguen sin afirmar un total prematuro. Localizar conserva escala y filtros, resalta y enfoca tarjeta/grupo; para una fila oculta de Mes, enfoca el +N visible y, al abrirlo, la fila exacta con acceso al detalle.

Las coincidencias de Día/Semana aparecen como un enlace N citas dentro de la grilla, en el primer inicio del grupo. N cuenta todas, porque no queda una representante individual dibujada. La lista muestra cada cita una vez y sus horas reales; el marcador no representa la duración de la unión. Intersección por fecha, fin excluido, cadenas transitivas y filtros conservan su semántica. Mes mantiene su +N más nativo, cuyo N cuenta solo las ocultas; no hereda la agrupación temporal. Tooltip, guía de cuarto de hora, fuera de atención, detalle y editor existentes se conservan; una guía visual nunca declara disponibilidad.

La franja lateral autorizada de (3px), los textos locales de (12px), radios interiores de (3px) y tonos locales como `#fbefed` siguen siendo excepciones de Agenda. El detector previo registró una advertencia por la franja y diecisiete avisos de densidad/radio/tonos: no fue un resultado vacío, no se repitió en este pase y no se convierte en tokens globales ni se suprime para silenciarlo. Tampoco se repara drift ajeno. `.impeccable/design.json` solo actualiza las muestras locales obsoletas de navegación y panel; conserva las primitivas normativas y las otras superficies.

Fuentes contrastadas: `components/dashboard-workspace.tsx`, `dashboard-workspace.css`, `workspace-panel.tsx`, `agenda-calendar.tsx`, `agenda-calendar.css`, `agenda-filters.tsx`, `agenda-name-results.tsx` y las primitivas Input/NativeSelect/Button. La evidencia sintética del ejecutor suma (145) casos nuevos en `calendar-search/`; los (126) de `calendar-workspace/` son anteriores. La revisión fresca inicial pidió arreglar Mes y su revisión puntual posterior registra `resolved`/`ship` para ese arreglo. Este registro no acredita pruebas propias, otra revisión completa, escrituras reales, cierre E2E total ni producción; estados finales y límites en `docs/AGENDA_CALENDAR.md` y `docs/PROJECT_CONTEXT.md`.

### Composición final vigente: Agenda continua, sin divisores (21/10/2026)

Esta sección es la autoridad visual actual del dashboard y sustituye las descripciones anteriores de cabecera separada de (56px), bordes de toolbar/laterales/rail/paneles, separadores heredados en listas/formularios y calendario pegado al borde inferior. También prevalece sobre las composiciones históricas de listado inferior, Añadir servicio sobre el mini, representante Confirmada/Layers2, Semana de (800px) y Mes fijo de (650px). Los bloques anteriores conservan sus fechas y evidencias como historia. La composición distinta está aprobada; no cambia el mundo visual ni los tokens normativos, y no extiende estas decisiones a portada, autenticación o reserva pública.

El dashboard ocupa (100dvh), sin ancho máximo central ni scroll documental. Una sola toolbar ordena Menu, la marca real de Slotly y los controles temporales y de escala; se redistribuye en móvil. La cuenta oficial aparece encima de los tres accesos del rail de (48px), con un único montaje. El lateral izquierdo de (232px) se oculta sin reservar columna y pasa a modal a (1023px) o menos. Servicios/Horario/Negocio usan dock de (360px) desde (1200px), y un diálogo nativo modal con rail interior por debajo. Los paneles comienzan arriba, sin reservar altura de otra cabecera; sus contenidos largos se desplazan dentro.

Toolbar, minicalendario/filtros, rail y panel derecho comparten `background`: ningún borde o sombra los divide. Dentro de Servicios, semana, excepciones, perfil y enlace público se retiran también separadores heredados y cajas de formulario. La jerarquía procede del espacio, los títulos y los tonos. Solo la región del calendario conserva un contorno estructural fino de (1px), radio local de (12px), fondo propio y grilla horaria; no es un nuevo radio global. El lienzo deja aire inferior de (16px) y lateral de (8px) dentro del área útil, descontado del alto y ancho disponibles. FullCalendar mantiene altura (100%) y su observación de tamaño v7, sin `updateSize`; horas y grilla horizontal se desplazan dentro. Semana conserva mínimo interno de (620px) y Mes de (700px), con altura adaptable.

Los campos y botones outline de toolbar/lateral/panel usan el tono existente `surface`, sin bordes, exclusivamente en esas regiones privadas. No se cambian las primitivas Input/NativeSelect/Button: controles ordinarios de (36px), iconos de (36×36px), variantes deliberadas y tamaño oficial de Clerk se conservan. Foco y estados seleccionados siguen visibles; los campos inválidos conservan contorno de error y mensajes asociados. Los indicadores de checkbox mantienen su dibujo. Bordes funcionales de overlays, selección y franjas de cita conservan su finalidad: la petición elimina divisores del shell, no señales operativas.

Añadir cita permanece encima del mini; Nueva cita aparece en toolbar solo cuando ese lateral está oculto. Enter o lupa interior aplican nombre y abren la búsqueda global contextual sin reservar altura; servicio/estado aplican inmediatamente con el último nombre enviado, conservando el borrador aún no aplicado. Carga, vacío agotado, páginas pendientes y error/reintento siguen diferenciados. Localizar conserva escala/filtros y entrega foco a tarjeta/grupo o al +N visible de Mes, cuya lista enfoca la fila exacta. Las cabeceras conservan abreviatura sobre número de (24px), Hoy relleno y selección con contorno; la navegación compuesta tiene su altura deliberada. N citas expresa el total del grupo sin una representante individual, con intervalos originales, fin excluido y transitividad. Tooltip, guía temporal, detalle y editor conservan su comportamiento.

Un único subárbol de formularios conserva borradores y revisión al cambiar/cerrar/redimensionar. Los envíos bloquean cierre/cambio y mantienen recuperación y foco. Sonner conserva un portal, alojado dentro del modal cuando corresponde. `WorkspaceAccount` mueve un contenedor estable del UserButton oficial entre rail exterior e interior; el proveedor de portal exportado por Clerk Next.js (7.9.17) dirige su menú al diálogo activo. No se cambia configuración de autenticación ni se construye un menú de cuenta propio. Las muestras locales de navegación y panel del sidecar describen este acabado; las demás muestras y tokens permanecen intactos.

Evidencia final atribuida al ejecutor: `calendar-shell/ui-report.json`, (79/79) comprobaciones sintéticas, (22) mediciones y (20) PNG actuales a 1440/1280/390/320. `finish-review.md` es una revisión fresca completa con `ship` y sin arreglos materiales. Lint, tipos y build finales sin fixture terminaron correctamente. Los (55) casos de toolbar, (145) de búsqueda, (126) de composición y (469) tests son anteriores y reutilizados, no otra ejecución por este acabado. El fixture usa cuenta QA; la prueba real previa de Clerk solo acredita escritorio y ninguna acción de cuenta. El documenter leyó código e informes, sin navegador, tests ni cloud.

No se canonizan la franja autorizada de (3px), densidad local de (12px), radio interior de (3px) ni tonos locales de citas como `#fbefed`. El detector anterior tuvo una advertencia y diecisiete avisos; no se repite ni se registra vacío. No se repara drift preexistente ajeno. Los datos, backend/OCC, escrituras autorizadas históricas y pendientes reales conservan su alcance en los contratos de docs; este pase no declara E2E total ni producción.
### Precisión vigente: preview real y fechas circulares (21/10/2026)

Este bloque final sustituye las indicaciones anteriores de N citas sin representante, selección de fecha solo con contorno, tres casillas de estado y Semana siempre de (620px). Conserva el shell continuo claro/verde, Geist, Lucide, toolbar Menu → marca → controles, cuenta oficial en rail, paneles persistentes, contorno/radio local del calendario y aire (16/8px). Son decisiones de esta superficie, sin alterar frontmatter, primitivas, tokens globales ni otras páginas.

Día/Semana presentan una preview real por grupo: primera Confirmada según inicio/ID y, si no existe, primera Cancelada. Su geometría usa el intervalo propio; fin excluido, grupos transitivos e IDs únicos no se convierten en una unión de duración. Hora y cliente tienen una línea útil; un icono indica estado y el texto aparece cuando cabe. El hint y el detalle conservan toda la información. +N más expresa las ocultas (total−1), separado del contenido; su lista incluye a todas, con Visible en el calendario en la preview. Clic/Enter abre la cita y +N abre el grupo, con toque, Escape y retorno de foco. La preview Confirmada futura conserva el arrastre con propuesta/confirmación; Cancelada no se arrastra. Semana reserva un mínimo interno de (980px) cuando hay preview y (620px) sin grupos, mediante desplazamiento del calendario; Mes conserva su +N nativo.

Las tarjetas usan ancho completo y mínimo de ancho cero para mantener íntegros hora y comienzo del cliente. En previews menores de (45min), la separación del cliente se reduce a (12px), con texto local de (12px) y línea de (14px), sin agrandar artificialmente el evento. Es un ajuste local de legibilidad, no otra escala tipográfica global. Los filtros de Estado son solo Confirmadas y Canceladas, independientes y sin maestro o indeterminate. Ambos activos corresponden a URL sin estado; confirmed/cancelled seleccionan uno y none muestra vacío. Conservan nombre aplicado/borrador y actualización inmediata.

El calendario retira únicamente bordes verticales entre días mediante roles semánticos de cabecera/celda; mantiene contorno, horizontales de hora/cuarto y semanas de Mes. En Día/Semana, el número de (24px) se centra en un círculo de (44×44px) dentro de un control compuesto de (64px). Selección y hover usan relleno verde/texto blanco solo en el círculo; wrapper transparente y geometría estable. Hoy no seleccionado conserva contorno circular y aria-current, sin rectángulo residual. El foco de teclado es independiente; la revelación tras layout deja (8px) para mostrar el objetivo completo con scroll horizontal. Hover no navega. Mini conserva target compacto con círculo interior de (28px); Mes usa círculo de (36px), sin rellenar la celda. No se redimensionan las primitivas ordinarias de (36px).

La revisión fresca inicial pidió corregir cuatro puntos: contenido de Día, rectángulo de Hoy, foco cortado a320px y cliente en preview corta. El lote aplicado y sus recapturas resuelven los cuatro según calendar-dates/verdict-review.md; ship solo cubre esos arreglos. El ejecutor aporta117/117checks finales, cuatro mediciones y29PNG actuales; hover39/39 es evidencia complementaria del mismo lote, no39casos nuevos independientes. La captura estabilizada conserva viewport, puntero de hover y espera de montaje, sin editar imágenes. Las 91 comprobaciones consolidadas (incluidas las ocho de interacción) y lectura Clerk de calendar-preview/ son anteriores al último CSS; no prueban los nuevos círculos. Este documenter solo lee fuentes/informes y verifica preservación/diff. El sidecar no contiene muestras de fechas, preview o Estado: sus muestras vigentes de rail/panel se conservan por hash, sin añadir patrones que alteren el sistema compartido.

No se repite detector ni se canonizan la franja autorizada de (3px), densidad local de (12px), radios interiores de (3px) o tonos locales de citas. Drift ajeno y datos permanecen fuera del cambio. Evidencia, atribuciones, herramientas y pendientes reales en los contratos de docs y calendar-dates/design-documentation.md.
### Precisión final: extremos de la cabecera (21/10/2026)

La supresión de verticales incluye las dos líneas residuales en los extremos de la cabecera de fechas. Una clase pública local en tableHeaderClass permite hacer transparente el borde inline de sus separadores directos, sin clases generadas ni reset global. Se conservan sus anchos de (1px) y (15px) para alinear cuerpo/scrollbar, contorno exterior de (1px)/radio (12px), horizontales y geometría. Es una corrección local, sin tokens o muestras de sidecar afectadas;45/45checks y18capturas del ejecutor, revisión independiente registrada por root, sin pruebas visuales propias del documenter.
### Continuación vigente: movimiento y acción de cita contextual (21/10/2026)

Esta precisión local sustituye el cierre inmediato de paneles y la CTA de cita en toolbar con filtros ocultos. Filtros deslizan desde izquierda y paneles del negocio desde derecha, con opacidad, durante (200ms) ease-out. Grid y padding del padre reajustan gradualmente el calendario; FullCalendar observa su tamaño. No se escala texto, no se usa transition:all ni otra dependencia. Es duración local de estos paneles, no un token global de movimiento.

El diálogo nativo sigue abierto y conserva su última sección durante la salida, inerte y sin interacción; se cierra al terminar. El hook cancela la animación anterior, conserva el punto visual al invertir y descarta callbacks obsoletos. Una reapertura recupera foco dentro del modal; cambio de modalidad y movimiento reducido se resuelven sin esperar transitionend, también al cambiar preferencia. Animaciones/listeners propios se limpian. Formularios, borradores, guards y revisión persisten; los hosts únicos Clerk/Sonner permanecen en el modal hasta cerrarlo. La muestra estática Panel contextual del sidecar solo actualiza esta descripción de lifecycle, sin modificar sus estilos o la escala global de motion.

Con filtros visibles, Añadir cita sigue sobre el mini. Ocultos, un Plus de (36×36px), con nombre y tooltip en hover/foco, ocupa la celda vacía real del eje horario mediante hooks públicos y portal React; no se coloca encima del primer día. Mes añade una fila de cabecera con altura total de (44px), control de (36px) y celda que abarca siete columnas, sin cubrir día1. Toolbar no contiene CTA de cita. El mismo editor conserva contexto/borrador; crear desde filtros móviles espera su salida. Shell, aire16/8, círculos44/28/36, preview/+N y estados siguen vigentes.

Evidencia del ejecutor:119checks consolidados,18trazas de frames,33PNG actuales y cinco crops nativos de apoyo, sin sumar cinco casos funcionales. Verdict Pass ship limitado a confirmar lectura: el revisor retiró su diagnóstico inicial tras cinco recapturas y crops, sin arreglo de código UI ni causa de framework acreditada. Lint global/tipos/build finales sin fixture correctos;471tests son anteriores. Documenter solo leyó fuentes/informes y comprobó preservación/diff. No se repite detector ni se promueven duración200ms, densidad12px, franja3px o tonos locales a tokens globales.
## Reto 13 — resultados y próxima cita (22/10/2026)

Se conserva el mundo Operate de Agenda: shell continuo, Geist/Lucide, controles ordinarios de 36px e iconos36×36, navegación existente, grilla y paneles200ms. Cuatro estados aceptados: Confirmada verde; Completada azul #214f85 sobre #eaf1fb; Cancelada roja; No asistió ámbar #78500b sobre #fff2d8. Los dos tonos nuevos son semántica local de citas, sin promover excepciones de Agenda a tokens globales. Iconos distintos y etiquetas/nombres accesibles acompañan al color. Contraste medido:10,70/7,33/6,39/6,42:1 respectivamente.

El menú y el detalle ofrecen Completada/No asistió solo al terminar; feedback único y Deshacer fuera del detalle/filtros. Se conservan cuatro checkboxes individuales, URL/subconjuntos anteriores y bloqueos independientes. Sin Todas ni Periodo/rangos nuevos. Tooltip y atributos del evento se actualizan con el estado; Enter/Espacio en una fila +N no se propaga al manejador de FullCalendar y abre su detalle.

Foco del movimiento: una próxima Confirmada visible, desde15min antes y hasta el inicio. Salto600ms cada60s, con contorno estático en movimiento reducido. Un reloj del calendario y una única representación animada, pausa con pestaña oculta/fuera de pantalla/detalle/arrastre; overflow/z-index limitados al evento. En coincidencias solo se mueve la preview candidata y +N permanece fijo; Mes ofrece señal accesible de la candidata oculta. No se transforma el scroller ni se alteran columnas, slots o cabeceras.

Revisión propia sobre componentes y capturas finales, sin atribuir independencia:77comprobaciones UI/20PNG a1440/1280/390/320 y17adicionales de teclado/toque/contraste/menú/tooltip/+N/arrastre. Finales de detalle390 y toast320 sin recorte; geometría sin scroll documental. Detector único:2warnings preexistentes de franja3px/transición del panel y30advisories de densidad/radios/tonos, incluidos los nuevos colores locales. Se registran y no se silencian o corrigen estilos ajenos. Fixture retirado antes de lint/tipos/build finales. Fuentes, cifras de motor real local, sync dev, lectura real sin escrituras y E2E de resultados pendiente en docs/APPOINTMENT_RESULTS.md.

## Ajuste vigente de Reto 13 — tarjeta completa y detalle bajo demanda (23/10/2026)

Sustituye únicamente el movimiento y el hovercard del apartado anterior. La candidata Confirmada dentro de15min mueve su tarjeta completa: fondo, borde, contorno, contenido y controles de preview. Salto de600ms y ciclo de5s, con4400ms de reposo. `translate` individual compone con el posicionamiento de FullCalendar; overflow/z-index solo locales. Una preview animada, sin redistribuir o mover todas las citas; su +N sí la acompaña según la petición nueva. Se conservan pausas por inicio/detalle/arrastre/visibilidad/área visible y contorno con reduced-motion.

Las citas ya no muestran hovercard por puntero ni foco. Se eliminan estado/timer/portal/handlers/CSS de esa ayuda, y se usa el detalle por clic/Enter o la lista +N. Permanecen la guía de horario/celda, su ayuda accesible y tooltips de botones/rail. Sin nuevos colores, tamaños, filtros, paneles o reglas de citas.

Verificación sintética acotada actual: tarjeta y contenido−5px en Día/Semana a1280/390/320; dos ráfagas naturales separadas5s, reposo y controles de preview−5px. Puntero normal/grupo sin hovercard, guía de horario conservada, clic/Enter/+N/foco correctos y propuesta de arrastre sin guardar. Lint/tipos/diff actuales; sin build, motor, sync o datos reales nuevos. Capturas de escritorio1280×720 y móviles finales390×720 Día/320×720 Semana, nativas y revisadas. Los intentos móviles reescalados y844con raster repetido se archivan inválidos, sin atribuirlos al producto. Toque actual no soportado por IAB; no se afirma validación táctil nueva. Evidencia separada en reto13-card-motion; el E2E autorizado del26/10 sigue esperando su fin real y la preview3103 continúa disponible.
