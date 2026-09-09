# ADR 0002 — Mapas, teselas, geocodificación y versión de MapLibre

Fecha: 2026-09-09 · Estado: aceptada

## Contexto
La Fase 2 necesita un mapa para ubicar destinos y, en la Fase 3, dibujar rutas. El presupuesto es cero y
las direcciones de Barranquilla ("Calle 72 # 45-23") se geocodifican con poca precisión.

## Decisión
- **MapLibre GL JS 6** con `react-map-gl/maplibre`. MapLibre 6 es solo ESM y crea su web worker a partir
  de `import.meta.url`; si Vite lo pre-empaqueta en desarrollo esa URL no existe, el worker no arranca y
  el mapa carga estilo y sprites pero nunca pide teselas; en el build de producción ocurre lo mismo porque
  la ruta relativa al bundle tampoco existe. Por eso `components/mapa/mapa.tsx` importa el worker con
  `?worker&url` (Vite lo empaqueta y lo emite como asset) y lo registra con `setWorkerUrl()`.
  Se mantiene en 6.4.1 o superior por el aviso GHSA-jrc7-96c5-q579.
- **OpenFreeMap** (estilo `liberty`) como proveedor de teselas vectoriales: gratuito, sin clave, datos OSM.
- **Nominatim** público para geocodificar, detrás de la interfaz `ProveedorGeocodificacion`, con caché en
  `geocodificacion_cache` y un máximo de 1 petición por segundo (política de uso). `NOMINATIM_USER_AGENT`
  identifica a la aplicación.
- La ubicación de un destino solo se considera válida cuando el coordinador la **confirma o mueve** en el
  mapa (`ubicacion_verificada`). Las importaciones automáticas quedan "por verificar".

## Consecuencias
- Cambiar a Google Maps o MapTiler implica reemplazar `ESTILO_MAPA` y una implementación de proveedor.
- Las pruebas de Playwright lanzan Chromium con WebGL por software para que el mapa dibuje.
