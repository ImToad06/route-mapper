#!/bin/sh
# Prueba de restauración (RNF-11): restaura el respaldo más reciente en una base temporal, comprueba
# que cargue sin errores y que las tablas clave tengan datos coherentes con la base viva; luego la borra.
# Uso: docker compose exec backup probar-restauracion.sh        (sale con código 1 si algo falla)
set -eu
TEMP="lh_rutas_prueba_restauracion"
psql -d postgres -qc "DROP DATABASE IF EXISTS $TEMP"
trap 'psql -d postgres -qc "DROP DATABASE IF EXISTS $TEMP" >/dev/null 2>&1 || true' EXIT

sh /usr/local/bin/restaurar.sh ultimo "$TEMP"
ARCHIVO="$(ls -1t /backups/lh_rutas-*.sql.gz | head -n1)"
echo "[prueba] respaldo: $ARCHIVO ($(stat -c %y "$ARCHIVO" | cut -d. -f1))"

FALLOS=0
printf '%-24s %10s %10s\n' tabla restaurada viva
for t in usuario conductor vehiculo zona destino producto ruta ruta_parada ruta_historial_estado bitacora; do
  r="$(psql -d "$TEMP" -Atc "SELECT count(*) FROM $t" 2>/dev/null || echo ERROR)"
  v="$(psql -d "$PGDATABASE" -Atc "SELECT count(*) FROM $t")"
  marca=""
  if [ "$r" = "ERROR" ]; then marca="  ← falta la tabla"; FALLOS=$((FALLOS + 1))
  elif [ "$r" -eq 0 ] && [ "$v" -gt 0 ]; then marca="  ← vacía en el respaldo"; FALLOS=$((FALLOS + 1))
  elif [ "$r" -gt "$v" ]; then marca="  (aviso: hay más filas en el respaldo que en la base viva)"
  fi
  printf '%-24s %10s %10s%s\n' "$t" "$r" "$v" "$marca"
done
M="$(psql -d "$TEMP" -Atc "SELECT count(*) FROM drizzle.__drizzle_migrations" 2>/dev/null || echo 0)"
[ "$M" -gt 0 ] || { echo "← no hay historial de migraciones en el respaldo"; FALLOS=$((FALLOS + 1)); }
if [ "$FALLOS" -eq 0 ]; then echo "[prueba] OK: el respaldo se restauró y los datos son coherentes."; else echo "[prueba] FALLA ($FALLOS problemas)" >&2; exit 1; fi
