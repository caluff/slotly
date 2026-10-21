---
name: Slotly
description: Interfaz clara y sencilla con acentos verdes.
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
  destructive: "#9f2f2f"
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
    textColor: "{colors.white}"
    typography: "{typography.label}"
    rounded: "{rounded.app}"
    padding: "0.375rem 1rem"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    typography: "{typography.label}"
    rounded: "{rounded.app}"
    padding: "0.375rem 1rem"
  form-control:
    backgroundColor: "{colors.white}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.app}"
    padding: "0.375rem 0.75rem"
  account-panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.app}"
    padding: "1.75rem"
  workspace-action:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.white}"
    typography: "{typography.label}"
    rounded: "{rounded.app}"
    height: "2.25rem"
  workspace-header-row:
    backgroundColor: "{colors.white}"
    height: "4rem"
  context-panel:
    backgroundColor: "{colors.white}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.app}"
    padding: "1.25rem"
  weekly-state-select:
    rounded: "{rounded.app}"
    height: "2.25rem"
    width: "8rem"
---

# Design System: Slotly

## Overview

Interfaz clara, sencilla y profesional, con acentos verdes. La portada y la autenticación conservan su presentación existente; el espacio privado usa una composición más amplia para consultar y gestionar el día.

**Key Characteristics:**

- Fondo claro y texto verde oscuro.
- Jerarquía tipográfica en Geist.
- Acciones principales verdes y formularios oficiales de Clerk.
- Espacio privado con cuatro vistas, listas con separadores y formularios bajo demanda.

## Colors

Los valores del frontmatter son normativos y proceden de la hoja global y de la configuración de Clerk.

### Primary

- `accent`: acciones principales, navegación activa, confirmaciones, énfasis de la portada y foco visible.
- `accent-hover`: fondo de la acción principal al pasar el cursor.
- `surface`: fondo verde claro del panel de cuenta y de avisos, cargas y estados de interacción del espacio privado.
- `selection`: fondo de la selección de texto, con `foreground` como texto.

### Neutral

- `background`: fondo general.
- `foreground`: texto principal.
- `muted`: descripciones, notas y pie.
- `line`: separadores de cabecera y pie.
- `white`: texto de la acción principal, cabecera privada, paneles contextuales y fondo configurado para Clerk.
- `destructive`: bordes y mensajes de error, acción de cancelación y estado textual de citas canceladas. La confirmación destructiva usa fondo opaco y texto blanco, también cuando el sistema operativo prefiere modo oscuro; la aplicación mantiene su paleta clara.

## Typography

Geist es la fuente de la interfaz, mediante la variable existente y su respaldo sans-serif. Geist Mono está cargada, sin un papel visual usado en estas pantallas.

El frontmatter recoge la escala base: display para el título de portada, title para encabezados de sección, auth-title para autenticación, lead para la introducción, body para descripciones y label para las acciones.

El título principal crece en `sm` (3.75rem) y en `lg` (4.5rem); el encabezado del panel crece en `sm` (1.875rem). Las notas usan texto pequeño (0.875rem) con interlineado amplio (1.5rem); el pie usa texto menor (0.75rem) con interlineado (1.25rem). Los enlaces de texto tienen peso medio (500).

En el espacio privado, los títulos visibles de vista usan el tamaño base de title (1.5rem), aumentan en `sm` (1.875rem) y conservan peso seminegrita (600) y espaciado cerrado. Agenda mantiene su h1 solo para lectores de pantalla; la cabecera visible reúne el nombre del negocio y Nueva cita. Los títulos de panel y estados vacíos usan (1.125rem); las descripciones, etiquetas y listas usan principalmente (0.875rem). La navegación móvil usa (0.75rem) y aumenta en `md` (0.875rem). Las horas y duraciones usan cifras tabulares.

## Layout

La portada conserva su contenedor centrado de (72rem), con márgenes interiores horizontales de (1.5rem), que aumentan en `sm` (2.5rem). Su estructura ocupa al menos la altura de la ventana, con cabecera, contenido flexible y pie.

La portada tiene una columna en móvil. En `lg` pasa a dos columnas, con proporción (1.2fr / 1fr), separación (5rem) y texto a la izquierda del panel. Antes de ese punto la separación es (3rem). Las acciones del panel permanecen apiladas.

Los puntos de cambio utilizados son `sm` (40rem), `md` (48rem) y `lg` (64rem). El login y el registro comparten `AuthShell`: un panel de dos columnas iguales desde `lg`, con formulario a la izquierda y una fotografía grande a la derecha. Su ancho máximo es (72rem), con fondo exterior verde claro y bordes redondeados. En tamaños inferiores se oculta la fotografía y el formulario conserva un máximo de (24rem). El pie permite que su contenido cambie de línea.

El espacio privado tiene un contenedor propio de (80rem), centrado y de ancho disponible. El relleno horizontal es (1rem), aumenta a (2rem) en `sm` y a (3rem) en `lg`; el contenido usa relleno vertical de (1.75rem), que aumenta a (2.5rem) en `sm`. La cabecera tiene una primera fila de (64px). Antes de `md`, los cuatro destinos ocupan una segunda fila de columnas iguales, con icono sobre etiqueta y una altura mínima de (56px); desde `md` se alinean junto a marca y cuenta.

Agenda y Servicios muestran una lista de ancho completo hasta abrir un panel. Desde `lg`, el listado comparte una rejilla con una columna derecha de (23rem) y separación de (1.5rem). En tamaños inferiores, el panel aparece antes del listado. El panel usa relleno de (1.25rem), que aumenta a (1.5rem) en `sm`. Horario limita su contenido a (48rem); la lectura del negocio a (42rem) y su creación inicial a (36rem).

Los filtros de Agenda responden al ancho disponible de su contenedor. Nombre del cliente, servicio, período, Desde, Hasta y Buscar comparten seis columnas desde (70rem); desde (40rem) usan tres columnas; desde (20rem), dos, con nombre y grupo de acción a todo el ancho; por debajo, una. Desde y Hasta permanecen visibles. Esta adaptación también se aplica al abrir el panel de Nueva cita, aunque la ventana siga siendo de escritorio. El formulario tiene separadores superior e inferior y relleno vertical de (1rem); el listado empieza inmediatamente después, sin banda visible de Resultados/contador ni un segundo separador superior.

## Elevation & Depth

Las superficies propias usan fondo, contraste tonal y separadores. No se definen sombras propias. Los paneles contextuales son blancos, con borde fino y sin superposición sobre el contenido. El diálogo de salida con borradores oscurece el fondo con el texto principal al (20%); los diálogos de cancelación y reprogramación usan ese color al (30%). Los formularios conservan los estilos internos oficiales de Clerk.

## Shapes

El radio compartido de la aplicación es `app`: 6px (0.375rem). Se aplica a inputs, botones, enlaces de acción, paneles, marco de autenticación, menús y superficies de Clerk. Las superficies propias usan `rounded-md`; Clerk usa su variable oficial y los ajustes de tarjeta y modal. Los avatares conservan su forma circular y los contenedores internos sin superficie visible pueden mantener radio cero. Los separadores de cabecera y pie son líneas finas con `line`.

## Components

### Marca y navegación

La marca usa el logo proporcionado por el usuario, con el calendario adaptado al verde de acción y la palabra oscura. La cabecera coloca la marca junto al acceso o menú de cuenta. El enlace para saltar al contenido se hace visible al recibir foco.

El archivo `public/slotly-logo.png` tiene fondo transparente y proporción 3:1. `Brand` lo muestra con `next/image` a 80px de ancho en móvil y 96px desde `sm`, conservando la proporción. La cabecera de portada conserva una altura mínima de (56px); la primera fila privada usa (64px).

La navegación privada ofrece Agenda, Servicios, Horario y Negocio. Usa iconos de Lucide de (16px), etiquetas sin salto de línea, texto secundario en reposo y acento con borde inferior de (2px) para la vista actual, anunciada con `aria-current="page"`. Al pasar el cursor usa texto principal y superficie verde clara al (50%). Al cambiar de vista, el foco pasa a su h1; en Agenda permanece solo para lectores de pantalla. El título del documento identifica la vista.

El favicon y los iconos de la aplicación usan solo el calendario, sin la palabra Slotly. Su fuente es `public/slotly-mark.png`, con fondo exterior transparente e interior blanco. Las variantes de Apple y maskable se apoyan en el fondo claro `background`; la variante maskable reserva margen para los recortes de los lanzadores móviles.

### Enlaces de acción

`button-primary` y `button-secondary` sirven para acciones y enlaces de navegación. Comparten altura mínima de 36px (2.25rem), relleno vertical de 6px, relleno horizontal de 16px y separación interna de 8px. Los campos y selectores propios reutilizan `form-control`, con la misma altura mínima de 36px, texto de 14px y relleno horizontal de 12px. La apariencia global de Clerk conserva esa altura y relleno vertical en sus campos y botones de formulario. Los controles de avatar y del menú de usuario oficial de Clerk mantienen sus áreas de interacción de 44px.

Preferencia permanente explícita del usuario: todos los inputs, selects y botones propios de Slotly se mantienen compactos, con (36px) de altura en escritorio y móvil. Incluye Nueva cita, Nuevo servicio, Confirmar cita, Guardar semana, filtros y acciones de Agenda, carga de servicios, cierre de panel y controles de los diálogos de salida, cancelación y reprogramación. Los botones de solo icono miden (36×36px). No imponer (44px) por defecto sin una nueva petición del usuario. La navegación y el `UserButton` oficial de Clerk son elementos distintos y conservan su configuración. Los botones con icono en las acciones de cabecera mantienen el relleno horizontal de (12px).

La altura se hereda de las primitivas: `Input` y `NativeSelect` usan `h-9`; `Button` usa `h-9` en su tamaño predeterminado y `size-9` para `size="icon"`, sin variantes responsive que agranden esos defaults. Los consumidores del dashboard no repiten clases de altura. El aumento anterior a 44px procedía de overrides locales `h-11`/`min-h-11`/`min-w-11`, no del tamaño base. Las variantes explícitas útiles se conservan cuando se solicitan deliberadamente; esta preferencia no modifica Textarea ni Clerk.

La acción secundaria tiene borde verde al 25% y, al pasar el cursor, fondo verde al 5%. Los cambios de color usan la transición existente (150ms), desactivada cuando se solicita movimiento reducido. Los enlaces de texto se subrayan al pasar el cursor.

El foco visible global usa un contorno de acento (3px) separado del elemento (4px).

### Menú de usuario

La cabecera autenticada muestra únicamente el avatar del `UserButton` oficial, con nombre accesible aportado por Clerk y un área de interacción mínima de 44px. Su apariencia se comparte desde `ClerkProvider` y solo afecta al menú de usuario.

El desplegable tiene 18rem de ancho, limitado al ancho de la ventana menos 2rem, y radio de 6px. La identidad usa relleno de 16px y separación de 12px; el nombre y el correo pueden partirse cuando son largos. Las acciones conservan una altura mínima de 44px, con iconos alineados y el radio compartido de 6px. Se mantienen las funciones oficiales de administrar cuenta y cerrar sesión.

El aviso de desarrollo se oculta mediante la opción oficial `unsafe_disableDevelopmentModeWarnings` para previsualizar el aspecto de producción del menú. La marca «Secured by Clerk» depende de la opción remota **Settings → Branding → Remove "Secured by Clerk" branding**; no se oculta mediante CSS ni se da por eliminada desde el código local.

### Panel de cuenta

Superficie verde clara con encabezado, descripción y acciones apiladas. El relleno aumenta en `sm` (2.5rem) y el relleno vertical en `lg` (3rem). Su contenido cambia según la sesión.

### Autenticación

Usar los componentes oficiales `SignIn` y `SignUp` de Clerk, con la localización española existente. Ambos utilizan `authAppearance`, con el verde de acción, el texto principal y Geist. Los campos y sus estados internos pertenecen a Clerk.

El login y el registro integran su componente oficial directamente en la columna, sin borde ni sombra de tarjeta. La marca, el formulario y el pie comparten alineación y un ancho máximo de (24rem). Los títulos se alinean a la izquierda y los distintos pasos conservan su comportamiento oficial. Los campos y botones tienen altura mínima (2.25rem), relleno vertical (0.375rem), radio compartido de 6px y Google aparece después del acceso por correo. Ambos usan la fotografía `public/login-workspace.png`, un espacio de trabajo con luz natural, madera y tonos salvia, con recorte `cover` y sin texto superpuesto. Es decorativa y queda fuera del árbol accesible.

### Paneles contextuales y borradores

Nueva cita y Nuevo servicio abren un `aside` no modal dentro de la página. No tienen fondo de superposición ni trampa de foco. Al abrir, el foco pasa al primer selector o campo; al cerrar con el botón o Escape vuelve al disparador. El cierre queda deshabilitado durante el guardado. El contenido se monta al abrirlo por primera vez y permanece montado al ocultarlo, por lo que cerrar el panel o cambiar de vista conserva el borrador.

La vista y los filtros aplicados de Agenda se reflejan en la URL de `/dashboard`, mediante el historial nativo y `useSearchParams`. Las cuatro vistas permanecen montadas para conservar su estado al navegar y volver. Los cambios de servicio o fecha de una cita también cuentan como borrador aunque aún no se haya elegido horario ni escrito un cliente. Salir del documento mediante un enlace presenta un diálogo HTML con «Seguir editando» como foco inicial y «Salir sin guardar» como alternativa; recargar o cerrar la pestaña usa el aviso nativo de `beforeunload`. Los borradores viven en esta pestaña; el guardado sigue siendo explícito. Ante un fallo transitorio de autenticación Convex se oculta el espacio privado y se suspenden sus consultas, conservando el borrador de la misma identidad. Recuperar conexión/foco/visibilidad puede reintentar el acceso si Clerk sigue conectado; «Reintentar acceso» ofrece la misma recuperación explícita y hereda los 36px del Button base. El estado vuelve a autenticado únicamente después de validación de Convex, sin recargar la página. Si Clerk confirma cierre de sesión, el contenido privado y sus borradores se desmontan; cambiar de usuario siempre reinicia el subárbol privado.

### Perfil del negocio

Cuando existe un negocio, Negocio presenta nombre y zona IANA como una lista de definición con separadores y enlaces contextuales a Agenda y Horario. Es una vista de lectura. Si aún no existe, aparece la creación inicial con una breve introducción, etiquetas visibles, controles compactos y una única acción «Guardar perfil».

El formulario usa la anatomía oficial de shadcn/ui: `FieldGroup`, `Field`, `FieldLabel` y `FieldError`, con `Input`, `Button` y `NativeSelect`, adaptados al tema existente. Los errores de campo utilizan `destructive`, `data-invalid`, `aria-invalid` y un mensaje asociado mediante `aria-describedby`; el foco pasa al primer campo inválido después del envío. React Hook Form y Zod gestionan el estado y la validación. Los errores generales conservan los valores, y el estado de guardado permanece anunciado para lectores de pantalla. La zona horaria es un selector nativo cerrado, con opciones IANA generadas en servidor y UTC; inicia en `America/Montevideo`. En móvil el botón ocupa el ancho del formulario. Los aliases semánticos de shadcn apuntan a los colores de Slotly y conservan el significado anterior de `accent` y `muted`.

### Servicios y horario

Servicios presenta nombre y duración en filas con separadores finos; la duración queda alineada al extremo y usa un icono de reloj decorativo. El estado vacío tiene borde discontinuo y una indicación para añadir el primer servicio. Nuevo servicio abre el panel contextual con nombre y duración apilados, sin ocultar la lista.

Horario es una vista propia con título, explicación breve y zona IANA. Cada día se separa por una línea; los días abiertos muestran estado, apertura y cierre. En móvil, día y estado comparten la primera fila y las horas ocupan dos columnas; un día cerrado se reduce a esa fila. Desde `sm`, los días usan tres columnas y los cerrados indican «Sin atención». El wrapper del selector Abierto/Cerrado mide (128px), el select ocupa todo su ancho y la flecha permanece dentro del borde.

La barra de guardado semanal permanece junto al borde inferior al desplazarse, con fondo general y separador superior. Distingue semana sin configurar, cambios sin guardar, guardado en curso, error y cambios guardados. «Guardar semana» guarda la semana completa explícitamente y queda deshabilitado durante el envío o cuando una semana existente no cambió.

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

