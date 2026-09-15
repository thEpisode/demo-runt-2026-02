#!/usr/bin/env bash
# Single entry point for the demo machine.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

PORT="$(grep -o '"port"[[:space:]]*:[[:space:]]*"[0-9]*"' backend/config/default.json | grep -o '[0-9]*' | head -1)"
PORT="${PORT:-3610}"

echo
echo "  Iniciando la demo del RUNT..."
echo

if grep -q 'xxxx__your_config' backend/config/default.json; then
  echo "  ATENCIÓN: falta la conexión a la base de datos." >&2
  echo "  Edita backend/config/default.json y reemplaza los xxxx__your_config" >&2
  echo
fi

export PATH="$PWD/runtime/bin:$PATH"

cd backend
exec ../runtime/bin/node -r dotenv/config app.js
