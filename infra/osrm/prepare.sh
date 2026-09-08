#!/usr/bin/env bash
# Descarga el extracto de Colombia de OpenStreetMap y lo preprocesa para OSRM (algoritmo MLD).
# Ejecutar en una máquina con al menos 4 GB de RAM libres. Resultado en infra/osrm/data/.
# Repetir mensualmente para refrescar el mapa. Uso: bash infra/osrm/prepare.sh
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)/data"
IMG="ghcr.io/project-osrm/osrm-backend:latest"
PBF="colombia-latest.osm.pbf"
mkdir -p "$DIR"
if [ ! -f "$DIR/$PBF" ]; then
  echo "Descargando $PBF desde Geofabrik…"
  curl -L --progress-bar -o "$DIR/$PBF" "https://download.geofabrik.de/south-america/colombia-latest.osm.pbf"
fi
run() { docker run --rm -t -v "$DIR:/data" "$IMG" "$@"; }
run osrm-extract -p /opt/car.lua "/data/$PBF"
run osrm-partition "/data/${PBF%.osm.pbf}.osrm"
run osrm-customize "/data/${PBF%.osm.pbf}.osrm"
echo "Listo. Levante los servicios con: docker compose --profile mapas up -d osrm vroom"
