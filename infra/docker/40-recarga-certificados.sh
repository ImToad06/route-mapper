#!/bin/sh
# Solo con TLS (DOMINIO definido): recarga nginx cada 6 h para tomar los certificados que renueva certbot.
# Los scripts de /docker-entrypoint.d/ solo corren si el comando es "nginx", por eso no se usa `command:`.
[ -n "${DOMINIO:-}" ] || exit 0
( while :; do sleep 6h; nginx -s reload; done ) &
