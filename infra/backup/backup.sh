#!/bin/sh
# Copia de seguridad nocturna de PostgreSQL (RNF-11).
#  - Corre todos los días a BACKUP_HORA (hora de TZ, por defecto 02:00) y una vez al arrancar.
#  - Verifica el archivo (gzip -t) antes de conservarlo; si pg_dump falla no se rota nada.
#  - Si BACKUP_REMOTE está definido ("remoto:bucket/ruta") copia cada respaldo fuera del servidor con
#    rclone. El remoto se configura por variables RCLONE_CONFIG_<REMOTO>_* (ver docs/runbook.md).
set -eu
KEEP="${BACKUP_KEEP_DAYS:-14}"
HORA="${BACKUP_HORA:-02:00}"
REMOTE="${BACKUP_REMOTE:-}"
KEEP_REMOTE="${BACKUP_REMOTE_KEEP_DAYS:-60}"
mkdir -p /backups

respaldar() {
  FECHA="$(date +%Y%m%d-%H%M%S)"
  ARCHIVO="/backups/lh_rutas-$FECHA.sql.gz"
  TMP="/backups/.parcial-$FECHA.sql"
  if pg_dump --no-owner --format=plain > "$TMP" && gzip -c "$TMP" > "$ARCHIVO" && gzip -t "$ARCHIVO"; then
    rm -f "$TMP"
    echo "[backup] creado $ARCHIVO ($(du -h "$ARCHIVO" | cut -f1))"
    find /backups -name 'lh_rutas-*.sql.gz' -mtime +"$KEEP" -delete
    copiar_fuera "$ARCHIVO"
  else
    echo "[backup] ERROR: pg_dump o la verificación falló; no se rotaron las copias anteriores" >&2
    rm -f "$TMP" "$ARCHIVO"
  fi
}

copiar_fuera() {
  [ -n "$REMOTE" ] || return 0
  if rclone copy "$1" "$REMOTE" --retries 3 \
    && rclone delete "$REMOTE" --min-age "${KEEP_REMOTE}d" --include 'lh_rutas-*.sql.gz'; then
    echo "[backup] copiado fuera del servidor: $REMOTE/$(basename "$1")"
  else
    # La copia local existe; el fallo queda en el log para que el monitoreo lo detecte.
    echo "[backup] ERROR: no se pudo copiar a $REMOTE" >&2
  fi
}

# Segundos hasta la próxima ocurrencia de HORA (HH:MM) en la zona horaria del contenedor.
segundos_hasta() {
  objetivo=$(( $(echo "$HORA" | cut -d: -f1 | sed 's/^0//') * 3600 + $(echo "$HORA" | cut -d: -f2 | sed 's/^0//') * 60 ))
  h=$(date +%H | sed 's/^0//'); m=$(date +%M | sed 's/^0//'); s=$(date +%S | sed 's/^0//')
  ahora=$(( ${h:-0} * 3600 + ${m:-0} * 60 + ${s:-0} ))
  espera=$(( objetivo - ahora ))
  [ "$espera" -gt 0 ] || espera=$(( espera + 86400 ))
  echo "$espera"
}

[ "${BACKUP_AL_ARRANCAR:-true}" = "true" ] && respaldar
while true; do
  ESPERA="$(segundos_hasta)"
  echo "[backup] próxima copia a las $HORA (en ${ESPERA}s)"
  sleep "$ESPERA"
  respaldar
done
