# Contenedor de respaldos: pg_dump + rclone para la copia fuera del servidor (RNF-11).
FROM postgres:17-alpine
RUN apk add --no-cache rclone tzdata
COPY backup.sh restaurar.sh probar-restauracion.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/*.sh
ENTRYPOINT ["sh", "/usr/local/bin/backup.sh"]
