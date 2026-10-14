#!/bin/sh
# Primer certificado TLS (una sola vez por servidor). Requiere que DOMINIO apunte ya a este servidor y que
# los puertos 80 y 443 estén abiertos.   Uso: infra/deploy/iniciar-tls.sh <dominio> <correo>
# Nginx no arranca sin certificado, así que se usa uno autofirmado temporal para levantarlo, se piden los
# reales por HTTP-01 y se reemplazan.
set -eu
DOMINIO="${1:?Uso: iniciar-tls.sh <dominio> <correo>}"
CORREO="${2:?Uso: iniciar-tls.sh <dominio> <correo>}"
cd "$(dirname "$0")/../.."
export DOMINIO
C="docker compose -f docker-compose.yml -f docker-compose.prod.yml"
VOL="$($C config --format json | python3 -c 'import json,sys; print(json.load(sys.stdin)["name"])')_letsencrypt"

echo "[tls] certificado temporal para $DOMINIO"
docker run --rm -v "$VOL:/etc/letsencrypt" --entrypoint sh alpine/openssl -c "
  mkdir -p /etc/letsencrypt/live/$DOMINIO &&
  openssl req -x509 -nodes -newkey rsa:2048 -days 1 -subj /CN=localhost \
    -keyout /etc/letsencrypt/live/$DOMINIO/privkey.pem -out /etc/letsencrypt/live/$DOMINIO/fullchain.pem"
$C up -d db api web

echo "[tls] solicitando el certificado real a Let's Encrypt"
docker run --rm -v "$VOL:/etc/letsencrypt" --entrypoint sh alpine -c \
  "rm -rf /etc/letsencrypt/live/$DOMINIO /etc/letsencrypt/archive/$DOMINIO /etc/letsencrypt/renewal/$DOMINIO.conf"
$C run --rm --entrypoint certbot certbot certonly --webroot -w /var/www/certbot \
  -d "$DOMINIO" --email "$CORREO" --agree-tos --no-eff-email

$C exec web nginx -s reload
$C up -d certbot
echo "[tls] listo: https://$DOMINIO (renovación automática cada 12 h)"
