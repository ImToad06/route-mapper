# Demostración en Render

Panel + API + base de datos en Render, con datos de demostración realistas (10 conductores, 30 vehículos,
3 administradores y 5 coordinadores, 66 destinos, 41 productos y ~85 rutas desde hace una semana hasta tres días
adelante). Incluye el motor de rutas: `lh-osrm` (mapa solo del área de Barranquilla, se arma durante el build) y
`lh-vroom`, ambos servicios privados, para que Calcular y Optimizar funcionen en vivo.

## Orden: primero se despliega, después se cargan los datos

La API crea las tablas al arrancar (migraciones); los datos se cargan encima. Al revés no funciona.

1. **Desplegar** (Render → New → Blueprint → este repositorio, rama `dev` (o `main` cuando se fusione)). Crea `lh-db`, `lh-osrm`, `lh-vroom`, `lh-rutas-api` y `lh-rutas-web`. El primer build de `lh-osrm` descarga
   Colombia de Geofabrik y tarda unos minutos.
2. **Revisar las URL** que Render asignó. Deben ser `https://lh-rutas-web.onrender.com` y `https://lh-rutas-api.onrender.com`.
   Si alguna es distinta: corrija `CORS_ORIGIN` (variable de la API = URL del panel) y el `destination` de la regla
   `/api/*` del panel (Redirects/Rewrites = URL de la API).
3. **Generar los datos** en su máquina (con `docker compose --profile mapas up -d` corriendo):
   `infra/demo/generar-demo.sh` → crea `infra/demo/demo.dump` y `../demo-credenciales.md`.
4. **Permitir su IP** en la base: Render → `lh-db` → Access Control → agregue su IP pública `/32`.
5. **Cargar:** `infra/demo/cargar-en-render.sh '<External Database URL>'` (el botón "External" de la base).
6. **Quitar su IP** de Access Control. Entre al panel con una cuenta de `demo-credenciales.md`.

## Antes de cada presentación

Las fechas son relativas al día en que se genera el volcado ("hoy", "ayer", "mañana"). Repita los pasos 3–5 el día
de la demo (o la noche anterior) para que la jornada de hoy y las rutas programadas estén al día.

## Limitaciones de esta demo

- El mapa del motor de rutas cubre solo Barranquilla, Soledad, Malambo y Puerto Colombia: destinos fuera de ese
  cuadro no se pueden calcular.
- Con el plan gratuito de la API el servicio duerme tras 15 min sin uso; `starter` no.
- Los nombres de clientes, direcciones y personas son ficticios.
