#!/bin/sh
# Prueba de humo de producción: API sana, HTTPS con redirección, cabeceras y días restantes del certificado.
# Uso: infra/deploy/verificar.sh https://rutas.ejemplo.com   (código 1 si algo falla; apto para cron)
set -u
URL="${1:?Uso: verificar.sh https://dominio}"
HOST="${URL#*://}"; HOST="${HOST%%/*}"
CURL="curl -sS --max-time 15 ${VERIFICAR_CURL_OPCIONES:-}"
FALLOS=0
ok()   { echo "  ok    $1"; }
falla(){ echo "  FALLA $1" >&2; FALLOS=$((FALLOS + 1)); }

$CURL "$URL/api/salud" | grep -q '"estado":"ok"' && ok "API y base de datos responden" || falla "GET /api/salud"
case "$URL" in
  https://*)
    CODIGO="$($CURL -o /dev/null -w '%{http_code} %{redirect_url}' "http://$HOST/")"
    case "$CODIGO" in "301 https://"*) ok "HTTP redirige a HTTPS";; *) falla "redirección HTTP→HTTPS ($CODIGO)";; esac
    CAB="$($CURL -I "$URL/")"
    for h in strict-transport-security content-security-policy x-content-type-options x-frame-options; do
      echo "$CAB" | grep -qi "^$h:" && ok "cabecera $h" || falla "falta la cabecera $h"
    done
    FIN="$(echo | openssl s_client -servername "$HOST" -connect "$HOST:443" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)"
    if [ -n "$FIN" ]; then
      DIAS=$(( ($(date -d "$FIN" +%s) - $(date +%s)) / 86400 ))
      [ "$DIAS" -ge 14 ] && ok "certificado vence en $DIAS días" || falla "el certificado vence en $DIAS días"
    else falla "no se pudo leer el certificado"; fi;;
esac
[ "$FALLOS" -eq 0 ] && echo "verificación OK" || { echo "$FALLOS comprobaciones fallaron" >&2; exit 1; }
