# Corrección local del panel de demo

Fecha: 29/10/2026. Alcance: el hueco señalado por el usuario en el panel derecho de `/demo`, sin rediseño.

La hoja compartida sitúa el panel con referencia fija a la ventana. En la demo, el aviso ocupa (45px) y desplaza el workspace y su rail; el panel comenzaba en (0px), tapando esa franja y desalineando el cierre. La única regla funcional añadida en `components/demo-dashboard.css` es:

```css
.demo-original-shell .workspace-sidepanel { position: absolute; height: 100%; }
```

El workspace ya tiene posición relativa. En escritorio, el panel queda anclado a él; en modo compacto, el diálogo modal conserva su capa superior y la altura completa con el rail interior. `components/dashboard-workspace.css` permanece intacto.

## Evidencia inspeccionada

- Captura aportada por el usuario y [before.png](before.png): referencia del desajuste previo.
- [user-1280.png](user-1280.png): panel y rail alineados debajo del aviso, visible a todo el ancho.
- [compact-1199.png](compact-1199.png), [mobile.png](mobile.png) de390px y [user-320.png](user-320.png): modal desde el borde superior, con cierre, contenido y rail interior visibles.
- [desktop.png](desktop.png) de1440px: alineación del panel corregida. La cabecera del calendario aparece comprimida en esa captura de emulación; este ajuste no acredita corregirla.
- [geometry.json](geometry.json): mediciones del ejecutor; el ancho documental coincide con cada viewport.

| Ancho | Fin del aviso | Inicio del panel | Inicio del rail | Fin del panel | Modal |
| --- | --- | --- | --- | --- | --- |
| 1440 | 45 | 45 | 45 | 900 | No |
| 1280 | 45 | 45 | 45 | 720 | No |
| 1199 | 45 | 0 | 0 | 720 | Sí |
| 390 | 45 | 0 | 0 | 844 | Sí |
| 320 | 45 | 0 | 0 | 720 | Sí |

Valores en píxeles observados, sin convertirlos en tokens. [detector.json](detector.json) contiene `[]`, resultado del único pase de scanlayout del ejecutor; el documenter no lo repitió.

El ejecutor comprobó HMR, cierre por el botón y apertura de Clientes seguida de cierre por Escape; observó `/demo` y `dialog.open=false` al terminar. No guardó datos reales ni de ejemplo. Para esta regla CSS no repitió lint, tipos, build ni motor. Resultado recibido del revisor fresco: `ship`, sin arreglos materiales, limitado a la alineación del panel. No certifica la cabecera comprimida de1440px ni acredita una relación directa con estas dos declaraciones.

## Registro documental

Se contrastaron `reference/document.md`, PRODUCT.md, DESIGN.md y `.impeccable/surfaces/home.md` con las fuentes y esta evidencia. La identidad, tokens, primitivas y capacidades vigentes no cambian; PRODUCT.md, DESIGN.md y `.impeccable/design.json` no requieren modificaciones por esta corrección. Sus cambios previos de home se conservan, al igual que el drift ajeno.

Este pase solo añade el apunte final a `.impeccable/surfaces/home.md` y este README. El documenter inspeccionó las seis PNG de este directorio y la captura del usuario, además de fuentes y JSON. No abrió navegador ni ejecutó pruebas o detector propios. El principal concilió `docs/PROJECT_CONTEXT.md` y conserva la responsabilidad del cierre final.
