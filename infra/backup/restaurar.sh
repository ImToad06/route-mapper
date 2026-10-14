#!/bin/sh
# Restaura un respaldo en UNA BASE NUEVA (nunca sobre la que está en uso).
# Uso (dentro del contenedor backup):
#   docker compose exec backup restaurar.sh [archivo.sql.gz | ultimo] [base_destino]
# Sin argumentos usa el respaldo más reciente y la base "lh_rutas_restaurada".
# Para reemplazar la base de producción siga el procedimiento de docs/runbook.md.
set -eu
ORIGEN="${1:-ultimo}"
DESTINO="${2:-lh_rutas_restaurada}"
if [ "$ORIGEN" = "ultimo" ]; then
  ORIGEN="$(ls -1t /backups/lh_rutas-*.sql.gz 2>/dev/null | head -n1 || true)"
fi
[ -n "$ORIGEN" ] && [ -f "$ORIGEN" ] || { echo "No hay respaldo para restaurar" >&2; exit 1; }
[ "$DESTINO" != "$PGDATABASE" ] || { echo "Se niega a restaurar sobre la base en uso ($PGDATABASE)" >&2; exit 1; }

gzip -t "$ORIGEN"
if psql -d postgres -Atc "SELECT 1 FROM pg_database WHERE datname = '$DESTINO'" | grep -q 1; then
  echo "La base $DESTINO ya existe; elimínela primero (DROP DATABASE $DESTINO) o elija otro nombre" >&2
  exit 1
fi
createdb "$DESTINO"
echo "[restaurar] $ORIGEN → $DESTINO"
gunzip -c "$ORIGEN" | psql -d "$DESTINO" -v ON_ERROR_STOP=1 -q -o /dev/null
echo "[restaurar] listo. Base $DESTINO restaurada."
