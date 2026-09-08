#!/bin/sh
# Copia de seguridad diaria de PostgreSQL (RNF-11). Conserva BACKUP_KEEP_DAYS días.
# Solo se conserva un archivo si pg_dump terminó correctamente.
set -eu
KEEP="${BACKUP_KEEP_DAYS:-14}"
mkdir -p /backups
while true; do
  FECHA="$(date +%Y%m%d-%H%M%S)"
  ARCHIVO="/backups/lh_rutas-$FECHA.sql.gz"
  TMP="/backups/.parcial-$FECHA.sql"
  if pg_dump --no-owner --format=plain > "$TMP"; then
    gzip -c "$TMP" > "$ARCHIVO" && rm -f "$TMP"
    echo "[backup] creado $ARCHIVO ($(du -h "$ARCHIVO" | cut -f1))"
    find /backups -name 'lh_rutas-*.sql.gz' -mtime +"$KEEP" -delete
  else
    echo "[backup] ERROR: pg_dump falló; no se creó copia ni se rotaron las anteriores" >&2
    rm -f "$TMP"
  fi
  sleep 86400
done
