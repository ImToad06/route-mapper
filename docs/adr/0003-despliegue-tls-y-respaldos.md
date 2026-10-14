# ADR 0003 — Despliegue con TLS propio, respaldos verificados y copia externa

Fecha: 2026-10-14 · Estado: aceptada

## Contexto
La fase 6 exige producción con HTTPS (RNF-03/07), respaldos con restauración probada (RNF-11) y despliegue
repetible. El sistema corre en un solo servidor con Docker Compose; los costos externos deben ser mínimos.

## Decisión
- **TLS en el mismo Nginx** que sirve la interfaz, con certificados Let's Encrypt (certbot en un contenedor que
  renueva cada 12 h). El primer certificado se obtiene con `infra/deploy/iniciar-tls.sh` (certificado temporal →
  HTTP-01 → recarga). HSTS solo sale por HTTPS (`map $scheme $hsts`).
- **Una sola fuente para la configuración de Nginx:** `ubicaciones.conf` y `seguridad.conf` los incluyen tanto
  `nginx.conf` (HTTP, desarrollo y pruebas) como la plantilla `nginx.tls.conf.template` (producción). Antes la
  CSP estaba repetida en tres `location`.
- **`docker-compose.prod.yml`** como override: puertos 80/443, `COOKIE_SEGURA=true`, certbot. El archivo base
  sigue sirviendo para desarrollo.
- **Respaldos:** imagen propia (`pg_dump` + `rclone`), horario fijo, verificación `gzip -t` antes de rotar,
  copia a cualquier almacenamiento S3 por variables de entorno (`RCLONE_CONFIG_*`, sin archivo de configuración
  en disco), retención distinta en el servidor (14 días) y fuera (60). `restaurar.sh` solo restaura en una base
  nueva; `probar-restauracion.sh` es la prueba mensual.
- **Despliegue:** `desplegar.sh` (fast-forward de `main`, build, espera de salud, `verificar.sh`, ruta de vuelta
  atrás impresa). GitHub Actions lo dispara por SSH en `main` solo si `DEPLOY_HABILITADO=true`.
- **Secretos:** `.env` con permisos 600 generado con aleatorios; los secretos del despliegue viven en el entorno
  `produccion` de GitHub. No se usa un gestor de secretos dedicado: es un servidor, una persona administradora.

## Alternativas descartadas
- Caddy o Traefik con TLS automático: más simple, pero añade otro proxy delante del Nginx ya probado y reparte
  las cabeceras de seguridad en dos sitios.
- Respaldo con `pg_basebackup`/WAL continuo: recuperación a un punto en el tiempo, pero el volumen de datos
  (decenas de rutas al día) no lo justifica; una copia lógica nocturna pierde como máximo un día de trabajo.
- Kubernetes/Swarm: sin necesidad de alta disponibilidad en el alcance del piloto.

## Consecuencias
- Un día de datos es el máximo que se puede perder (RPO ≈ 24 h); si el piloto muestra que es mucho, se sube la
  frecuencia cambiando el bucle de `backup.sh` o se añade WAL archiving.
- El primer certificado exige que el dominio ya apunte al servidor y que 80/443 estén abiertos.
- Una caída del servidor es una caída del sistema (sin réplica); el monitoreo externo avisa y el runbook
  describe la restauración en otra máquina a partir de la copia externa.
