# Compatibilidad de navegadores y responsive (RNF-12 / RNF-13)

## Matriz de navegadores

`e2e/compatibilidad.spec.ts` cubre en cada navegador: ingreso con contraseña errada, ingreso y recorrido de
las secciones del panel (con los enlaces del menú) sin errores de consola, recarga completa con la sesión
recuperada por la cookie de refresco, dibujo del mapa (WebGL) y cierre de sesión.

| Navegador | Motor | Dónde se ejecuta | Resultado (2026-10-14) |
|---|---|---|---|
| Chrome | Chromium | local + CI (`escritorio`) | 4/4 |
| Firefox | Gecko | local + CI (`firefox`) | local 4/4; CI 3/4 y 1 omitido (el mapa: Firefox headless no ofrece WebGL en el runner) |
| Edge | Chromium | CI (`edge`, canal `msedge`) | CI 4/4 |
| Safari | WebKit | CI (`webkit`) | CI 4/4 (dos corridas seguidas sin pruebas inestables) |

WebKit y Edge no se pueden ejecutar en la máquina de desarrollo (CachyOS: Playwright no da soporte oficial,
faltan librerías de sistema para WebKit y no hay Edge instalado). El job `navegadores` de
`.github/workflows/ci.yml` los corre en Ubuntu con `playwright install --with-deps`. Para reproducir uno:

```bash
bunx playwright install --with-deps firefox      # o webkit / msedge
bunx playwright test --project=firefox e2e/compatibilidad.spec.ts
```

Navegadores móviles: la app del conductor se prueba con el perfil Pixel 7 (`movil`). La prueba en
dispositivos reales (Android e iOS) es manual y se registra en la lista del piloto (`docs/piloto/`).

## Revisión responsive

`e2e/responsive.spec.ts` abre cada pantalla del panel y de la app del conductor a 360, 768 y 1280 px de
ancho y falla si la página tiene desplazamiento horizontal (`scrollWidth > clientWidth`).

| Tamaño | Pantallas revisadas | Resultado (2026-10-14) |
|---|---|---|
| Celular 360 × 740 | ingreso, panel, rutas, destinos, conductores, reportes, inicio y mi ruta del conductor | sin desborde |
| Tableta 768 × 1024 | las mismas | sin desborde |
| Escritorio 1280 × 800 | las mismas | sin desborde |

Con `CAPTURAS_DIR=/ruta` el mismo spec guarda una captura de cada pantalla y tamaño, útil para revisarlas a ojo.

## Limitaciones conocidas

- Las pruebas automáticas no sustituyen una revisión visual: comprueban que no haya desborde ni errores de
  consola, no que el diseño sea el esperado.
- El empaquetado PWA (instalar la app en el celular) quedó fuera de alcance en la fase 4; la comprobación de
  instalación en Android/iOS del plan no aplica mientras no se retome.
- Con el servidor de desarrollo de Vite en frío (como en CI) Firefox y WebKit interrumpen un `goto()` o un
  `page.reload()` que coincida con una redirección o con una petición de módulo en curso. Por eso la prueba
  navega con enlaces y recarga con `recargar()` (`e2e/ayudas.ts`); no se reemplace por `page.reload()`.
- `bun run test:e2e` corre solo Chromium (`escritorio` y `movil`); Firefox, WebKit y Edge se ejecutan con
  `--project=…` o en el job `navegadores` de CI.
