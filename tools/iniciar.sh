#!/usr/bin/env bash
# Single entry point for the demo machine.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"
HERE="$PWD"
CONFIG="$HERE/backend/config/default.json"

echo
echo "  Iniciando la demo del RUNT..."
echo

# The bundled runtime is built for Linux x86_64, which is the demo machine.
# Anywhere else, fall back to the system Node instead of failing with
# "cannot execute binary file".
BUNDLED_NODE="$HERE/runtime/bin/node"
NODE_BIN=""

if "$BUNDLED_NODE" --version >/dev/null 2>&1; then
  NODE_BIN="$BUNDLED_NODE"
elif command -v node >/dev/null 2>&1; then
  NODE_BIN="$(command -v node)"
  echo "  Nota: el Node incluido es para Linux x86_64 y esta máquina es $(uname -s) $(uname -m)."
  echo "        Se usará el Node del sistema ($("$NODE_BIN" --version))."
  echo
else
  echo "  No se puede ejecutar." >&2
  echo "  El Node incluido es para Linux x86_64 y esta máquina es $(uname -s) $(uname -m)," >&2
  echo "  y no hay Node instalado. Ejecuta este paquete en la máquina de la demo." >&2
  exit 1
fi

# The package ships with the development connection so it runs out of the box.
# That is a convenience, not a default anyone should present with.
CONNECTION="$(grep -o '"connectString"[[:space:]]*:[[:space:]]*"[^"]*"' "$CONFIG" | sed 's/.*"\([^"]*\)"$/\1/')"

case "$CONNECTION" in
  *xxxx__your_*)
    echo "  AVISO: falta la conexión a la base de datos."
    echo "         Edita backend/config/default.json antes de presentar."
    ;;
  *localhost*|*127.0.0.1*|*host.docker.internal*|*FREEPDB1*)
    echo "  AVISO: estás usando la base de DESARROLLO ($CONNECTION),"
    echo "         no los datos reales del cliente."
    echo "         Para la presentación, edita backend/config/default.json."
    ;;
esac

if grep -q '"apiKey"[[:space:]]*:[[:space:]]*"xxxx__' "$CONFIG"; then
  echo "  AVISO: faltan las credenciales del modelo en backend/config/default.json."
  echo "         El Buscador y el Asistente no podrán interpretar preguntas;"
  echo "         el Constructor sí funciona, porque no usa el modelo."
fi
echo

# Corporate networks often intercept TLS and present their own certificate,
# which Node rejects. Rather than asking the operator to diagnose that, probe
# the endpoint and capture the chain automatically when it happens.
# Everything the demo needs lives in one file: Link Loom injects it as config.
LLM_HOST="$(grep -o '"endpoint"[[:space:]]*:[[:space:]]*"[^"]*"' "$CONFIG" | sed 's|.*//||; s|/\?"$||' | head -1)"

probe_tls() {
  [ -n "$LLM_HOST" ] || return 0
  NODE_EXTRA_CA_CERTS="${1:-}" "$NODE_BIN" -e '
    require("https").get({host: process.argv[1], path: "/", timeout: 12000}, () => process.exit(0))
      .on("timeout", () => process.exit(1))
      .on("error", (error) => {
        const intercepted = ["UNABLE_TO_VERIFY_LEAF_SIGNATURE", "SELF_SIGNED_CERT_IN_CHAIN",
                             "DEPTH_ZERO_SELF_SIGNED_CERT"].includes(error.code);
        process.exit(intercepted ? 2 : 1);
      });
  ' "$LLM_HOST" >/dev/null 2>&1
}

# -s, not -f: an empty file here would mean trusting nothing.
if [ -s "$HERE/ca.pem" ]; then
  export NODE_EXTRA_CA_CERTS="$HERE/ca.pem"
  echo "  Usando la cadena de certificados de esta red (ca.pem)."
  echo
elif [ -n "$LLM_HOST" ]; then
  probe_tls || TLS_STATUS=$?
  if [ "${TLS_STATUS:-0}" = "2" ]; then
    echo "  Esta red intercepta el tráfico seguro. Obteniendo su certificado..."
    if "$HERE/capturar-ca.sh" >/dev/null 2>&1 && [ -f "$HERE/ca.pem" ]; then
      export NODE_EXTRA_CA_CERTS="$HERE/ca.pem"
      echo "  Listo, resuelto automáticamente."
    else
      echo "  No se pudo obtener. El Constructor funcionará; el Buscador no."
    fi
    echo
  elif [ "${TLS_STATUS:-0}" = "1" ]; then
    echo "  AVISO: no hay salida hacia el servicio del modelo."
    echo "         El Constructor funcionará; el Buscador y el Asistente no."
    echo
  fi
fi

PORT="$(grep -o '"port"[[:space:]]*:[[:space:]]*"[0-9]*"' "$CONFIG" | grep -o '[0-9]*' | head -1)"
PORT="${PORT:-3610}"

# Without this the service dies on bind and the browser quietly talks to
# whatever was already there.
if command -v lsof >/dev/null 2>&1 && lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "  El puerto $PORT ya está ocupado por otro programa." >&2
  echo "  Puede ser esta misma demo ya abierta en otra terminal." >&2
  echo "  Ciérrala con Ctrl+C antes de volver a iniciar." >&2
  exit 1
fi

echo "  Abre el navegador en:  http://localhost:$PORT"
echo

cd "$HERE/backend"
SUPPRESS_NO_CONFIG_WARNING=true exec "$NODE_BIN" app.js
