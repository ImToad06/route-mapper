#!/bin/sh
# Despliegue en el servidor: actualiza el código de main, reconstruye, migra (la API migra al arrancar) y
# verifica. Lo ejecuta el job "desplegar" de GitHub Actions por SSH, o a mano.
# Si falla, el mensaje indica la versión anterior para volver con:
#   git checkout <sha> && infra/deploy/desplegar.sh --sin-git
set -eu
cd "$(dirname "$0")/../.."
[ -f .env ] || { echo "Falta .env (ver infra/deploy/generar-env.sh)" >&2; exit 1; }
set -a; . ./.env; set +a
ANTERIOR="$(git rev-parse --short HEAD)"
if [ "${1:-}" != "--sin-git" ]; then
  git fetch origin main
  git checkout main
  git merge --ff-only origin/main
fi
NUEVA="$(git rev-parse --short HEAD)"
echo "[desplegar] $ANTERIOR → $NUEVA"

C="docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile mapas"
$C up -d --build --remove-orphans
echo "[desplegar] esperando a la API…"
for _ in $(seq 1 30); do
  [ "$($C ps --format '{{.Health}}' api)" = "healthy" ] && break
  sleep 5
done
if sh infra/deploy/verificar.sh "https://$DOMINIO"; then
  docker image prune -f >/dev/null
  echo "[desplegar] listo ($NUEVA)"
else
  echo "[desplegar] FALLÓ la verificación. Para volver: git checkout $ANTERIOR && infra/deploy/desplegar.sh --sin-git" >&2
  exit 1
fi
