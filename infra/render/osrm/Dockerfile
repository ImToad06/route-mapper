# OSRM solo con el área metropolitana de Barranquilla (Atlántico), para la demo en Render.
# Descarga el extracto de Colombia, recorta el cuadro delimitador y lo preprocesa durante el build:
# la imagen final pesa ~150 MB y el servicio cabe en 512 MB de RAM (Colombia completa necesita ~4 GB).
FROM ghcr.io/project-osrm/osrm-backend:latest AS build
RUN apt-get update && apt-get install -y --no-install-recommends osmium-tool curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /data
RUN curl -fL --retry 3 -o colombia.osm.pbf https://download.geofabrik.de/south-america/colombia-latest.osm.pbf
# Oeste, sur, este, norte: Puerto Colombia, Barranquilla, Soledad y Malambo con margen.
RUN osmium extract -b -75.05,10.75,-74.60,11.12 colombia.osm.pbf -o area.osm.pbf \
    && rm colombia.osm.pbf
RUN osrm-extract -p /opt/car.lua area.osm.pbf \
    && osrm-partition area.osrm && osrm-customize area.osrm \
    && rm area.osm.pbf

FROM ghcr.io/project-osrm/osrm-backend:latest
COPY --from=build /data /data
EXPOSE 5000
CMD ["osrm-routed", "--algorithm", "mld", "--max-trip-size", "200", "--max-table-size", "500", "-p", "5000", "/data/area.osrm"]
