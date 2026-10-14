#!/usr/bin/env bash
# Genera la base de demostración en LOCAL (necesita el stack con --profile mapas: db, osrm, vroom) y la
# vuelca a infra/demo/demo.dump, lista para cargar en Render con cargar-en-render.sh.
#   infra/demo/generar-demo.sh [ruta/del/archivo-de-credenciales.md]
# Las fechas son relativas al día de ejecución: vuelva a correrlo el día anterior o el mismo día de la demo.
set -euo pipefail
cd "$(dirname "$0")/../.."
CRED="$(realpath -m "${1:-../demo-credenciales.md}")"
DB=lh_rutas_demo
PUERTO=3902
CONT=$(docker ps --format '{{.Names}}' | grep -m1 -E 'db-1$') || { echo "No hay contenedor de base de datos corriendo"; exit 1; }

docker exec "$CONT" psql -U lh -d postgres -c "DROP DATABASE IF EXISTS $DB" -c "CREATE DATABASE $DB" >/dev/null
export DATABASE_URL="postgres://lh:lh@localhost:5432/$DB"
export TZ=America/Bogota

( cd apps/api && bun --env-file=../../.env src/db/migrate.ts && SEED_SOLO_BASE=true bun --env-file=../../.env src/db/seed.ts )

API_PORT=$PUERTO JWT_SECRET=demo-secreto-local-de-al-menos-32-caracteres \
  OSRM_URL=http://localhost:5000 VROOM_URL=http://localhost:3300 \
  bun apps/api/src/index.ts >/tmp/lh-demo-api.log 2>&1 &
API_PID=$!
trap 'kill $API_PID 2>/dev/null || true' EXIT
for i in $(seq 1 30); do curl -sf "http://localhost:$PUERTO/api/salud" >/dev/null && break; sleep 1; done

( cd apps/api && bun --env-file=../../.env src/db/seed-demo.ts "http://localhost:$PUERTO" "$CRED" ) 2>&1 | tail -40

docker exec "$CONT" pg_dump -U lh -d "$DB" -Fc --no-owner --no-privileges > infra/demo/demo.dump
echo "Volcado listo: infra/demo/demo.dump ($(du -h infra/demo/demo.dump | cut -f1))"
