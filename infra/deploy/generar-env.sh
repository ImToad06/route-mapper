#!/bin/sh
# Crea .env de producción con secretos aleatorios. No sobrescribe un .env existente.
# Uso: infra/deploy/generar-env.sh <dominio> <correo-para-certificados>
set -eu
DOMINIO="${1:?Uso: generar-env.sh <dominio> <correo>}"
CORREO="${2:?Uso: generar-env.sh <dominio> <correo>}"
cd "$(dirname "$0")/../.."
[ ! -e .env ] || { echo ".env ya existe; edítelo a mano" >&2; exit 1; }
aleatorio() { head -c 96 /dev/urandom | base64 | tr -d '/+=\n' | head -c "$1"; }
umask 077
sed -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$(aleatorio 32)|" \
    -e "s|^JWT_SECRET=.*|JWT_SECRET=$(aleatorio 64)|" \
    -e "s|^CORS_ORIGIN=.*|CORS_ORIGIN=https://$DOMINIO|" \
    -e "/^DATABASE_URL=/d" \
    -e "s|^NOMINATIM_USER_AGENT=.*|NOMINATIM_USER_AGENT=lh-rutas/1.0 ($CORREO)|" \
    .env.example > .env
printf '\nDOMINIO=%s\nCORREO_TLS=%s\n' "$DOMINIO" "$CORREO" >> .env
echo ".env creado (permisos 600). Guarde una copia de POSTGRES_PASSWORD y JWT_SECRET en su gestor de secretos."
