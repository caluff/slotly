# Home y demo —29/10/2026

La portada conserva Geist/verde y emplea el video suministrado por el humano. La petición posterior fija que la demo use exactamente el dashboard original y que el video repita sin salto. Contrato en [home.md](../../surfaces/home.md). Los archivos PNG finales se revisaron al abrirlos; las capturas intermedias defectuosas se sustituyeron. No se fabricó un poster ni otra app de prueba.

## UI y movimiento observados

- Demo accesible sin sesión antes de probar Google. Mismos componentes de calendario, paneles, formularios y diálogos; únicamente banner y cuenta ficticia propios.
- Dos citas locales de «Prueba Demo Dana», Seguimiento30min,29/10 a13:00 y14:00; segundo correo en mayúsculas: una sola ficha `demo-dana@example.test`, historial de dos citas. Primera reprogramada a15:00, ambas canceladas y persistentes tras recarga. Sin reservas reales.
- Servicio ficticio creado20min, editado25min; nueva edición30min seguida de SU Deshacer, valor25min confirmado. Semana: viernes cerrado, guardado y conservado tras recarga. Una cancelada ficticia archivada desde su papelera; reinicio devolvió los datos iniciales y retiró las citas/servicio de prueba.
- Fondo:26muestras durante11s documentan dos vueltas del video5.041667s; capa superior casi transparente en su reinicio y opaca durante el reinicio inferior. Pausa con tiempos idénticos tras700ms, reproducción manual y arranque automático comprobados. Emulación de movimiento reducido: ambas capas pausadas y tiempos estables tras650ms. Se retiró la emulación al terminar. [Muestras](motion-observations.json). Son observaciones del video/DOM y UI, sin medición de rendimiento en móviles físicos.
- Google: botón oficial de Clerk desde home anónimo, estado «Conectando…» y llegada a `/dashboard` con el negocio existente. No se introdujeron credenciales ni se seleccionó/creó una cuenta; se utilizó la sesión de Google disponible. Las capturas finales de home muestran el estado autenticado «Ir a mi agenda». No se cerró la sesión humana para repetir autenticación o capturar el estado anónimo.

## Capturas

`desktop.png`1440×1206, `user-1250.png`1250×1193, `mobile.png`390×1373 y `user-320.png`320×1424: documento completo desde arriba. Demo: `demo-desktop.png`1440×900, `demo-user-1250.png`1250×884, `demo-mobile.png`390×844 y `demo-user-320.png`320×720. La agenda semanal conserva el desplazamiento horizontal interior del componente original en móvil. Todos los anchos documentales coinciden con el viewport; los overrides se retiraron. El botón N visible pertenece a Next dev.

## Comprobaciones y límites

ESLint pertinente y TypeScript sin emisión correctos. Build aislado correcto con Node24.19.0/Next16.4.2 mediante el arnés existente; el shell usa Node26 y se seleccionó explícitamente el ejecutable24 solo para esta verificación. Primera salida y hashes de configuración preservada en `C:/Users/dcalu/.codex/slotly-evidence/home-demo-20261029/build/`, marcador `a7b859f5-20d7-42cd-8b33-fac917ab71d1`. Tras sustituir las flechas Unicode por SVG, build final correcto en `build-final/`, marcador `3923cc4c-89fb-407a-b5cd-2dc2bd2a6e93`; lint/tipos y recaptura de los mismos ocho tamaños correctos. Sin salida sobre `.next` activo, comandos de datos o despliegue.

Detector Impeccable ejecutado una vez: advisories de colores de la superficie crema y tamaños tipográficos locales fuera de la rampa documentada antigua; se entregaron al reviewer. No se cambian por ello los tokens de todo el dashboard. Procedencia del MP4 en el contrato de superficie; no hay assets raster nuevos. La [revisión inicial](finish-review.md) pidió dos ajustes, SVG y documentación. El [veredicto posterior](verdict.md) dispone **ship**, con ambos **resolved** y las ocho recapturas válidas; su alcance es ese listado de correcciones. El [documenter independiente](documentation.md) contrastó fuentes, capturas y sistema incumbente, documentó las excepciones locales y conservó el drift previo sin repararlo.

El MP4 servido y el archivo original suministrado tienen el mismo SHA256: `D01801A625FCC8B237ADC9E14C47C4C35F3C7F65BE8131C2AE98B0B2A71631FC`. La composición del bucle conserva el archivo original.

La demo mantiene datos ficticios acotados por pestaña; cerrar la pestaña termina su persistencia. No envía correos ni simula entrega de avisos del SO. No prueba concurrencia, red o scheduler cloud. No hubo sync, cambio de claves/env/esquema, nuevas cuentas, modificación de citas reales, commit/push o despliegue. Los documentos R13 previos se conservaron; su veredicto sigue siendo «todavía no validado».
