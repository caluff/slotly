# Registro documental de home y demo — 29/10/2026

La extensión se documenta sobre el sistema incumbente claro/verde, Geist y controles propios de 36px. La autoridad es el montaje code-led fijado por el video del usuario y por su indicación de usar exactamente el dashboard original en la demo. No existe comp aprobada ni comparación contra una comp.

| Documento | Actualización acotada |
|---|---|
| `DESIGN.md` | Sustituye la portada retirada en Overview, Colors, Typography, Layout, Shapes y Components: hero abierto, crema, video original, reflujo, acciones, agenda de ejemplo y estado autenticado. Añade tokens `home-*` y dos roles tipográficos locales; conserva los valores globales. |
| `.impeccable/design.json` | Refleja esos roles locales, puntos de cambio y movimiento; añade muestras autocontenidas de tipografía/acciones y agenda de ejemplo con SVG. Marca la muestra del panel de cuenta anterior como histórica, conservando su CSS. No reemplaza los ejemplos del dashboard. |
| `PRODUCT.md` | Registra la capacidad de demo pública, acceso Google, persistencia local por pestaña y sus límites frente al sistema real. Conserva todas las entradas de Reto13 y su historia. |
| `.impeccable/surfaces/home.md` | Precisa reflujo de dos a tres líneas, excepciones locales, fundido, acceso autenticado, evidencia y límites de autoridad. |

## Hechos contrastados

- `app/page.tsx` y `app/home.css`: accesos visibles a demo, Google/correo y agenda según sesión; muestra identificada como ejemplo; flechas `HomeArrow` SVG de 14px. Crema, foco, selección, escala fluida y puntos locales de 900/600px pertenecen a home.
- `components/particle-film.tsx`: dos capas del MP4 original, desfase de media duración, opacidad `sin²`, pausa manual, pausa de pestaña oculta y movimiento reducido con reproducción manual disponible. No hay raster generado ni poster sustituto.
- `components/demo-dashboard.tsx`, su CSS y `lib/demo-store.ts`: workspace, calendario, paneles, formularios y diálogos originales conectados a adaptadores de datos ficticios. Estado validado y acotado en `sessionStorage`, respaldo en memoria y reinicio. Las notificaciones del sistema están deshabilitadas en este entorno; no se importa un cliente de backend en el store.
- Las ocho capturas locales se abrieron: home1440/1250/390/320 y demo1440/1250/390/320. Muestran la portada autenticada y el shell original de demo. En móvil, el calendario mantiene su desplazamiento horizontal interior. El overlay N pertenece a Next dev.
- Se leyó `README.md`, `finish-review.md` y el contrato de superficie. Las observaciones del ejecutor sobre Google usan una sesión de Google disponible, sin nueva introducción de credenciales. Los PNG no acreditan el estado anónimo ni todos los paneles abiertos. Las muestras temporales del ejecutor respaldan el mecanismo del bucle y sus pausas; un PNG no demuestra continuidad temporal.

## Límites y drift conservado

Este pase solo leyó fuentes, informes y capturas, y editó los documentos indicados. No abrió navegador, no ejecutó pruebas de aplicación, build, cloud ni otro detector. Las verificaciones funcionales y de herramientas pertenecen al ejecutor y se atribuyen en `README.md`; no se duplican como resultados propios. La revisión fresca inicial pidió únicamente SVG y persistencia documental: los SVG están presentes en la fuente y este pase resuelve la documentación. El veredicto posterior corresponde al reviewer.

El detector ya ejecutado una vez entregó advisories sobre colores y tamaños locales de home; documentar su alcance no equivale a que no existieran ni a convertirlos en reglas del dashboard. Se conserva también drift preexistente fuera de este cambio: el párrafo histórico de R13 está insertado dentro del frontmatter de `DESIGN.md`, antes de `name`, y la muestra histórica del panel de cuenta usa radio1rem frente al radio compartido de6px. No se normalizó ese frontmatter, no se cambió el CSS de dicha muestra ni se repararon otras primitivas o descripciones históricas del dashboard.

`docs/PROJECT_CONTEXT.md` ya tiene el registro del ejecutor y quedó fuera del límite de escritura de este documenter. La demo no acredita concurrencia, scheduler, correos, avisos del SO, E2E cloud, cierre pendiente de R13 ni producción. Los datos y verificaciones anteriores mantienen su alcance.
