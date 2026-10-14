# Runbook de operación — Rutas L&H

Guía para quien administra el servidor. Todo lo que sigue se ejecuta desde la carpeta del proyecto en el
servidor (por defecto `/opt/lh-rutas`). Los comandos `docker compose` usan estos archivos:

```bash
export C="docker compose -f docker-compose.yml -f docker-compose.prod.yml --profile mapas"
```

## 1. Servicios

| Servicio | Qué hace | Datos que guarda |
|---|---|---|
| `web` | Nginx: sirve la interfaz, termina TLS (80/443) y reenvía `/api` | certificados (volumen `letsencrypt`) |
| `api` | API Elysia; aplica las migraciones al arrancar | ninguno |
| `db` | PostgreSQL 17 | volumen `db_data` |
| `backup` | `pg_dump` nocturno, verificación y copia fuera del servidor | volumen `backup_data` |
| `certbot` | renueva el certificado Let's Encrypt cada 12 h | volumen `letsencrypt` |
| `osrm`, `vroom` | cálculo y optimización de rutas (perfil `mapas`) | `infra/osrm/data` (~1.3 GB) |

Requisitos del servidor: Linux con Docker y Compose v2, 2 vCPU, 4 GB de RAM (OSRM de Colombia ocupa ~1.5 GB),
20 GB de disco, puertos 80 y 443 abiertos y un dominio apuntando a la IP.

## 2. Primera instalación

```bash
git clone git@github.com:ImToad06/route-mapper.git /opt/lh-rutas && cd /opt/lh-rutas
git checkout main

# 1) Secretos aleatorios y dominio (crea .env con permisos 600; no sobrescribe uno existente)
infra/deploy/generar-env.sh rutas.ejemplo.com contacto@ejemplo.com
#    Guarde POSTGRES_PASSWORD y JWT_SECRET en el gestor de contraseñas de la empresa.

# 2) Mapa de Colombia para OSRM (una vez; ~15 min y 4 GB de RAM libres)
bash infra/osrm/prepare.sh

# 3) Certificado TLS y arranque de todo el sistema
infra/deploy/iniciar-tls.sh rutas.ejemplo.com contacto@ejemplo.com
$C up -d --build

# 4) Administrador inicial, sin datos de ejemplo. Elija una contraseña temporal propia.
$C exec -e SEED_SOLO_BASE=true -e SEED_ADMIN_CORREO=admin@empresa.com \
       -e SEED_ADMIN_CONTRASENA='Temporal-Cambiar-Ya-1' api bun src/db/seed.ts

# 5) Comprobación
infra/deploy/verificar.sh https://rutas.ejemplo.com
```

El administrador debe cambiar la contraseña en su primer ingreso (el sistema lo exige). Después configure
la dirección de la bodega, zonas, vehículos, conductores, productos y destinos desde el panel.

## 3. Despliegues

**Automático:** al integrar en `main`, el job `desplegar` de GitHub Actions entra por SSH y ejecuta
`infra/deploy/desplegar.sh`. Se activa con la variable de repositorio `DEPLOY_HABILITADO=true` y estos
valores en el entorno `produccion` de GitHub: secretos `DEPLOY_SSH_KEY`, `DEPLOY_KNOWN_HOSTS`,
`DEPLOY_USER`, `DEPLOY_HOST` y, si no es `/opt/lh-rutas`, la variable `DEPLOY_DIR`.
Use una clave SSH creada solo para esto, con acceso únicamente a ese usuario del servidor.

**Manual:** `infra/deploy/desplegar.sh` (hace `git pull --ff-only` de `main`, reconstruye, espera a que la API
esté sana y corre `verificar.sh`).

**Volver a la versión anterior:** si la verificación falla, el script imprime el comando exacto:

```bash
git checkout <sha-anterior> && infra/deploy/desplegar.sh --sin-git
```

Las migraciones solo avanzan. Antes de un despliegue con migraciones destructivas haga un respaldo manual
(sección 5) y, si hay que volver atrás, restaure ese respaldo (sección 6).

## 4. Secretos y variables

Todo vive en `.env` (permisos 600, fuera de Git). Para rotar:

- `JWT_SECRET`: cambie el valor y `$C up -d api`. Cierra todas las sesiones (los usuarios vuelven a ingresar).
- `POSTGRES_PASSWORD`: primero `$C exec db psql -U lh -c "ALTER USER lh PASSWORD 'nueva'"`, luego edite `.env`
  y `$C up -d api backup`.
- Contraseña de un usuario olvidada: lo hace el administrador desde el panel. Si se pierde la del único
  administrador: `$C exec -e SEED_ADMIN_CORREO=admin@empresa.com -e SEED_ADMIN_CONTRASENA='Temporal-1' api bun src/test/reset-admin.ts`.

## 5. Respaldos

- Cada noche a las `BACKUP_HORA` (02:00, hora de `TZ`) y una vez al arrancar el servicio, el contenedor `backup`
  hace `pg_dump`, verifica el archivo (`gzip -t`) y lo guarda en el volumen `backup_data` como
  `lh_rutas-AAAAMMDD-HHMMSS.sql.gz`. Conserva `BACKUP_KEEP_DAYS` (14) días.
- Si una copia falla no se borra ninguna anterior y el error queda en el log (`$C logs backup`).
- **Copia fuera del servidor (RNF-11).** Con `BACKUP_REMOTE` definido cada respaldo se sube con `rclone` y se
  conservan `BACKUP_REMOTE_KEEP_DAYS` (60) días. Funciona con cualquier almacenamiento compatible con S3
  (Backblaze B2, Cloudflare R2, Wasabi, AWS). Ejemplo en `.env`:

  ```
  BACKUP_REMOTE=offsite:lh-rutas-respaldos/produccion
  RCLONE_OFFSITE_PROVIDER=Other
  RCLONE_OFFSITE_ENDPOINT=https://s3.us-west-004.backblazeb2.com
  RCLONE_OFFSITE_ACCESS_KEY_ID=…
  RCLONE_OFFSITE_SECRET_ACCESS_KEY=…
  ```

  Cree la llave con permiso solo de escritura/lectura sobre ese bucket. Aplique con `$C up -d backup` y
  confirme en `$C logs backup` la línea `copiado fuera del servidor`.
- Respaldo manual inmediato: `$C restart backup` (hace uno al arrancar).
- Listar copias: `$C exec backup ls -lh /backups`.

## 6. Restauración

**Prueba de restauración (hacerla cada mes y tras cambiar la configuración de respaldos):**

```bash
$C exec backup probar-restauracion.sh
```

Restaura el respaldo más reciente en una base temporal, compara el número de filas de las tablas clave con la
base viva y borra la temporal. Debe terminar en `OK`. Guarde la fecha y el resultado en `docs/restauraciones.md`.

**Restaurar producción (pérdida de datos o vuelta atrás tras una migración):**

```bash
# 0) Elija el respaldo (de $C exec backup ls /backups, o bájelo del almacenamiento externo al volumen)
ARCHIVO=lh_rutas-20261014-020000.sql.gz

# 1) Detenga la API para que nadie escriba, y haga una copia de lo que hay por si acaso
$C stop api
$C restart backup && sleep 15          # respaldo "de seguridad" del estado actual

# 2) Restaure en una base nueva y compruebe
$C exec backup restaurar.sh /backups/$ARCHIVO lh_rutas_restaurada
$C exec db psql -U lh -d lh_rutas_restaurada -c "SELECT count(*) FROM ruta"

# 3) Cambie la base: la restaurada pasa a ser la oficial
$C exec db psql -U lh -d postgres -c "ALTER DATABASE lh_rutas RENAME TO lh_rutas_anterior" \
                                  -c "ALTER DATABASE lh_rutas_restaurada RENAME TO lh_rutas"
$C start api && infra/deploy/verificar.sh https://rutas.ejemplo.com

# 4) Cuando todo esté bien (días después), elimine la anterior
$C exec db psql -U lh -d postgres -c "DROP DATABASE lh_rutas_anterior"
```

Si PostgreSQL no deja renombrar porque hay conexiones abiertas, `$C stop api backup` y repita (las conexiones de
la propia consola `psql` a esa base no cuentan si se conecta a `postgres`).

## 7. Actualizar el mapa (OSRM)

Una vez al mes, o cuando se abran vías nuevas importantes:

```bash
rm infra/osrm/data/colombia-latest.osm.pbf    # fuerza la descarga nueva
bash infra/osrm/prepare.sh                    # puede hacerse en otra máquina y copiar infra/osrm/data
$C restart osrm vroom
```

Mientras se reprocesa, el cálculo y la optimización de rutas fallan con un mensaje claro; el resto del sistema sigue.

## 8. Monitoreo (RNF-07)

- **Disponibilidad externa:** monitor HTTP (UptimeRobot u otro) a `https://rutas.ejemplo.com/api/salud` cada
  5 minutos, con palabra clave `"estado":"ok"`; alerta por correo al administrador y al responsable técnico.
  El endpoint verifica también la conexión con la base de datos.
- **Revisión programada en el servidor** (opcional): `crontab -e` →
  `0 * * * * /opt/lh-rutas/infra/deploy/verificar.sh https://rutas.ejemplo.com || echo "Rutas L&H falló" | mail -s alerta admin@empresa.com`
  (comprueba API, HTTPS, cabeceras y que el certificado tenga más de 14 días).
- **Registros:** `$C logs -f --since 1h api` (JSON, un renglón por petición con método, ruta, estado y ms).
- **Espacio en disco:** `docker system df` y `df -h`; las imágenes viejas se limpian en cada despliegue.

## 9. Problemas frecuentes

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| El sitio no abre y `web` se reinicia | falta el certificado | `$C logs web`; si dice que no encuentra `fullchain.pem`, repita `infra/deploy/iniciar-tls.sh` |
| Certificado vencido | falló la renovación (puerto 80 cerrado, DNS) | `$C logs certbot`; `$C exec certbot certbot renew --webroot -w /var/www/certbot`; recargue con `$C exec web nginx -s reload` |
| Los usuarios "se salen" solos | cambió `JWT_SECRET` o la hora del servidor está mal | revise `date` y la sección 4 |
| "No se pudo calcular la ruta" | `osrm`/`vroom` detenidos o mapa en reproceso | `$C ps`; `$C up -d osrm vroom` |
| Nominatim no encuentra una dirección | normal en Barranquilla | el coordinador ubica el punto a mano en el mapa (es obligatorio) |
| Muchos intentos de ingreso bloqueados | 10 fallos por IP en 15 min (RNF-04) | esperar 15 minutos; revisar la bitácora por intentos sospechosos |
| El respaldo no sube | credenciales o endpoint de `rclone` | `$C logs backup`; pruebe `$C exec backup rclone lsd offsite:` |
