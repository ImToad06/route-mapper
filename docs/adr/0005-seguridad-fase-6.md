# ADR 0005 — Endurecimiento de seguridad de la fase 6

Fecha: 2026-09-16 · Estado: aceptada

## Contexto
Revisión de seguridad antes de producción (RNF-05…RNF-13 del plan): dependencias, cabeceras, CSRF con
autenticación por cookie, límites de entrada y cobertura de permisos.

## Decisión
- **Cabeceras en Nginx:** CSP sin `unsafe-inline` en scripts (único host externo: `tiles.openfreemap.org`),
  Permissions-Policy, `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy; HSTS al activar TLS (ADR 0003).
- **CSRF:** la cookie de refresco ya es `httpOnly`, `SameSite=Lax` y limitada a `/api/auth`; además
  `/auth/refrescar` y `/auth/cerrar` comprueban el `Origin` (`origenPermitido`).
- **Tamaño de petición:** límite de 2 MiB (`maxRequestBodySize`); el valor por defecto de Bun era 128 MiB.
- **Prueba de cobertura de guardias** (`plugins/auth.test.ts`): recorre cada ruta registrada y falla si alguna
  queda sin `auth` o `roles` fuera de una lista explícita. Detecta en CI la clase de error de la fase 4
  (`.guard()` encadenado sin callback que no restringe las rutas siguientes).
- **Dependencias:** `bun audit` deja 2 avisos moderados transitivos (esbuild vía drizzle-kit, uuid vía exceljs)
  sin corrección compatible; se aceptan como riesgo bajo (herramienta de desarrollo y generación local de Excel).

## Consecuencias
- Cada ruta nueva debe declarar su guardia o añadirse a la lista de excepciones con justificación.
- Revisar `bun audit` en cada fase y al actualizar dependencias.
