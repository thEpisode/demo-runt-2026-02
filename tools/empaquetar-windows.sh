#!/usr/bin/env bash
# Builds the self-contained folder for the Windows demo machine: no Node, no
# npm, no internet and no administrator rights needed there.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="${1:-$ROOT/dist-demo-windows}"
NODE_ZIP="${NODE_ZIP:-}"

if [ -z "$NODE_ZIP" ] || [ ! -f "$NODE_ZIP" ]; then
  echo "Falta el Node de Windows. Uso:" >&2
  echo "  NODE_ZIP=/ruta/node-v20-win-x64.zip tools/empaquetar-windows.sh" >&2
  exit 1
fi

echo "==> Compilando el cliente web"
( cd "$ROOT/frontend" && VITE_API_URL= npm run build >/dev/null )

echo "==> Preparando $OUT"
rm -rf "$OUT"
mkdir -p "$OUT/runtime" "$OUT/backend" "$OUT/web" "$OUT/herramientas"

echo "==> Node portable para Windows"
TMP_UNZIP="$(mktemp -d)"
unzip -q "$NODE_ZIP" -d "$TMP_UNZIP"
cp -R "$TMP_UNZIP"/node-*/. "$OUT/runtime/"
rm -rf "$TMP_UNZIP"

echo "==> Backend"
# dev/ is the local Oracle for development and never ships.
for item in app.js package.json config src node_modules; do
  cp -R "$ROOT/backend/$item" "$OUT/backend/"
done
rm -f "$OUT/backend/src/static/sse-test.html"

# Ships with the development connection so the package runs as soon as it is
# unzipped; INICIAR.bat warns when the values are still placeholders.
if [ -f "$ROOT/backend/config/default.json" ]; then
  cp "$ROOT/backend/config/default.json" "$OUT/backend/config/default.json"
else
  cp "$ROOT/backend/config/template.json" "$OUT/backend/config/default.json"
fi

echo "==> Cliente web"
cp -R "$ROOT/frontend/dist/." "$OUT/web/"

echo "==> Scripts"
cp "$ROOT/tools/windows/INICIAR.ps1" "$OUT/INICIAR.ps1"
cp "$ROOT/tools/windows/INICIAR.cmd" "$OUT/INICIAR.cmd"
cp "$ROOT/tools/windows/LEEME.txt" "$OUT/LEEME.txt"
cp "$ROOT/tools/windows/capturar-ca.js" "$OUT/herramientas/capturar-ca.js"

echo
echo "Listo: $OUT"
du -sh "$OUT"
