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
echo

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
exec "$NODE_BIN" -r dotenv/config app.js
