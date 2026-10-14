#!/usr/bin/env bash
# Carga infra/demo/demo.dump en la base de Render (reemplaza todo su contenido).
#   infra/demo/cargar-en-render.sh 'postgresql://lh:CLAVE@dpg-xxxx.virginia-postgres.render.com/lh_rutas'
# Use la "External Database URL" del panel de Render (y tenga su IP en Access Control). El volcado se genera
# con generar-demo.sh.
set -euo pipefail
cd "$(dirname "$0")"
URL="${1:?Pase la External Database URL de Render como primer argumento}"
[ -f demo.dump ] || { echo "Falta demo.dump: corra primero ./generar-demo.sh"; exit 1; }
case "$URL" in *sslmode=*) ;; *) URL="${URL}$([[ $URL == *\?* ]] && echo '&' || echo '?')sslmode=require" ;; esac
CONT=$(docker ps --format '{{.Names}}' | grep -m1 -E 'db-1$') || { echo "No hay contenedor de Postgres local para usar pg_restore"; exit 1; }
echo "Restaurando en Render (se reemplaza lo que haya)…"
docker exec -i "$CONT" pg_restore --clean --if-exists --no-owner --no-privileges --exit-on-error -d "$URL" < demo.dump
echo "Listo. Abra el panel de Render y entre con una cuenta de demo-credenciales.md"
