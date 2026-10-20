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
  "6": "1.5rem"
  "7": "1.75rem"
  "10": "2.5rem"
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
---

# Design System: Slotly

## Overview

Interfaz clara, sencilla y profesional, con acentos verdes. Esta documentación captura la implementación visual de la etapa 1.

**Key Characteristics:**

- Fondo claro y texto verde oscuro.
- Jerarquía tipográfica en Geist.
- Acciones principales verdes y formularios oficiales de Clerk.

## Colors

Los valores del frontmatter son normativos y proceden de la hoja global y de la configuración de Clerk.

### Primary

- `accent`: acciones principales, énfasis del título y foco visible.
- `accent-hover`: fondo de la acción principal al pasar el cursor.
- `surface`: fondo verde claro del panel de cuenta.
- `selection`: fondo de la selección de texto, con `foreground` como texto.

### Neutral

- `background`: fondo general.
- `foreground`: texto principal.
- `muted`: descripciones, notas y pie.
- `line`: separadores de cabecera y pie.
- `white`: texto de la acción principal y fondo configurado para Clerk.

## Typography

Geist es la fuente de la interfaz, mediante la variable existente y su respaldo sans-serif. Geist Mono está cargada, sin un papel visual usado en estas pantallas.

El frontmatter recoge la escala base: display para el título principal, title para los encabezados de sección y autenticación, lead para la introducción, body para descripciones y label para las acciones.

El título principal crece en `sm` (3.75rem) y en `lg` (4.5rem); el encabezado del panel crece en `sm` (1.875rem). Las notas usan texto pequeño (0.875rem) con interlineado amplio (1.5rem); el pie usa texto menor (0.75rem) con interlineado (1.25rem). Los enlaces de texto tienen peso medio (500).

## Layout

El contenedor compartido está centrado, ocupa el ancho disponible y tiene el máximo existente `max-w-6xl` (72rem). Sus márgenes interiores horizontales son (1.5rem), y aumentan en `sm` (2.5rem). La estructura ocupa al menos la altura de la ventana, con cabecera, contenido flexible y pie.

La portada tiene una columna en móvil. En `lg` pasa a dos columnas, con proporción (1.2fr / 1fr), separación (5rem) y texto a la izquierda del panel. Antes de ese punto la separación es (3rem). Las acciones del panel permanecen apiladas.

Los puntos de cambio utilizados son `sm` (40rem) y `lg` (64rem). El login y el registro comparten `AuthShell`: un panel de dos columnas iguales desde `lg`, con formulario a la izquierda y una fotografía grande a la derecha. Su ancho máximo es (72rem), con fondo exterior verde claro y bordes redondeados. En tamaños inferiores se oculta la fotografía y el formulario conserva un máximo de (24rem). El pie permite que su contenido cambie de línea.

## Elevation & Depth

Las superficies propias usan fondo, contraste tonal y separadores. No se definen sombras propias. Los formularios conservan los estilos internos oficiales de Clerk.

## Shapes

El radio compartido de la aplicación es `app`: 6px (0.375rem). Se aplica a inputs, botones, enlaces de acción, paneles, marco de autenticación, menús y superficies de Clerk. Las superficies propias usan `rounded-md`; Clerk usa su variable oficial y los ajustes de tarjeta y modal. Los avatares conservan su forma circular y los contenedores internos sin superficie visible pueden mantener radio cero. Los separadores de cabecera y pie son líneas finas con `line`.

## Components

### Marca y navegación

La marca usa el logo proporcionado por el usuario, con el calendario adaptado al verde de acción y la palabra oscura. La cabecera coloca la marca junto al acceso o menú de cuenta. El enlace para saltar al contenido se hace visible al recibir foco.

El archivo `public/slotly-logo.png` tiene fondo transparente y proporción 3:1. `Brand` lo muestra con `next/image` a 80px de ancho en móvil y 96px desde `sm`, conservando la proporción. La cabecera compartida tiene una altura mínima de 56px.

El favicon y los iconos de la aplicación usan solo el calendario, sin la palabra Slotly. Su fuente es `public/slotly-mark.png`, con fondo exterior transparente e interior blanco. Las variantes de Apple y maskable se apoyan en el fondo claro `background`; la variante maskable reserva margen para los recortes de los lanzadores móviles.

### Enlaces de acción

`button-primary` y `button-secondary` sirven para acciones y enlaces de navegación. Comparten altura mínima de 36px (2.25rem), relleno vertical de 6px, relleno horizontal de 16px y separación interna de 8px. Los campos y selectores propios reutilizan `form-control`, con la misma altura mínima de 36px, texto de 14px y relleno horizontal de 12px. La apariencia global de Clerk conserva esa altura y relleno vertical en sus campos y botones de formulario. Los controles de avatar y menú mantienen sus áreas de interacción de 44px.

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

### Perfil del negocio

El formulario utiliza etiquetas visibles, controles compactos y una única acción «Guardar perfil», sin párrafos introductorios ni textos de ayuda permanentes. Usa la anatomía oficial de shadcn/ui: `FieldGroup`, `Field`, `FieldLabel` y `FieldError`, con `Input`, `Button` y `NativeSelect`, adaptados al tema existente. Los errores de campo utilizan `destructive` (#9f2f2f), `data-invalid`, `aria-invalid` y un mensaje asociado mediante `aria-describedby`; el foco pasa al primer campo inválido después del envío. React Hook Form y Zod gestionan el estado y la validación. Los errores generales conservan los valores, y el estado de guardado permanece anunciado para lectores de pantalla. La zona horaria es un selector nativo cerrado, con opciones IANA generadas en servidor y UTC; inicia en `America/Montevideo`. En móvil el botón ocupa el ancho del formulario. Los aliases semánticos de shadcn apuntan a los colores de Slotly y conservan el significado anterior de `accent` y `muted`.

### Confirmaciones por toast

La creación de un servicio se confirma con «Servicio creado» mediante Sonner y el wrapper de shadcn/ui adaptado al tema claro. Hay un único `Toaster` en el layout raíz. La confirmación se emite solo después de que el guardado termine correctamente; no se duplica con un mensaje de éxito dentro del formulario. Los errores permanecen en `FieldError` y el estado de guardado conserva su anuncio exclusivo para lectores de pantalla.

El toast reutiliza Geist con texto de (14px), fondo `surface`, texto `foreground`, borde fino `line`, radio compartido de (6px) y ninguna sombra. El icono de éxito es `CircleCheck` de Lucide, decorativo, de (16px) y color `accent`. Conserva la posición nativa de Sonner en la esquina inferior derecha, con márgenes móviles de (16px) y duración base de (4000ms).

La región de notificaciones se anuncia mediante `aria-live="polite"`, con el nombre «Notificaciones» y el atajo nativo `Alt+T`. Mostrar el éxito no toma el foco: el formulario se limpia y devuelve el foco a «Nombre del servicio», preparado para crear otro servicio. Se mantiene un único anuncio accesible de la confirmación.

