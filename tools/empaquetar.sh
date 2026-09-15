#!/usr/bin/env bash
# Builds the self-contained folder that runs the demo on the client's Linux
# machine: no Node, no npm, no internet and no root needed there.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="${1:-$ROOT/dist-demo}"
NODE_TARBALL="${NODE_TARBALL:-}"

if [ -z "$NODE_TARBALL" ] || [ ! -f "$NODE_TARBALL" ]; then
  echo "Falta el Node portable. Uso:" >&2
  echo "  NODE_TARBALL=/ruta/node-v20-linux-x64.tar.xz tools/empaquetar.sh" >&2
  exit 1
fi

echo "==> Compilando el cliente web"
( cd "$ROOT/frontend" && VITE_API_URL= npm run build >/dev/null )

echo "==> Preparando $OUT"
rm -rf "$OUT"
mkdir -p "$OUT/runtime" "$OUT/backend" "$OUT/web"

echo "==> Node portable"
case "$NODE_TARBALL" in
  *.tar.gz) tar -xzf "$NODE_TARBALL" -C "$OUT/runtime" --strip-components=1 ;;
  *.tar.xz) case "$NODE_TARBALL" in
  *.tar.gz) tar -xzf "$NODE_TARBALL" -C "$OUT/runtime" --strip-components=1 ;;
  *.tar.xz) tar -xJf "$NODE_TARBALL" -C "$OUT/runtime" --strip-components=1 ;;
  *) echo "Formato no soportado: $NODE_TARBALL" >&2; exit 1 ;;
esac ;;
  *) echo "Formato no soportado: $NODE_TARBALL" >&2; exit 1 ;;
esac

echo "==> Backend"
# dev/ is the local Oracle for development and never ships.
for item in app.js package.json config src node_modules; do
  cp -R "$ROOT/backend/$item" "$OUT/backend/"
done
rm -rf "$OUT/backend/src/static/sse-test.html"
# Ships with the development connection so the package runs as soon as it is
# extracted; iniciar.sh warns that those are not the client's data.
if [ -f "$ROOT/backend/config/default.json" ]; then
  cp "$ROOT/backend/config/default.json" "$OUT/backend/config/default.json"
else
  cp "$ROOT/backend/config/template.json" "$OUT/backend/config/default.json"
fi

echo "==> Cliente web"
cp -R "$ROOT/frontend/dist/." "$OUT/web/"

echo "==> Scripts"
cp "$ROOT/tools/iniciar.sh" "$OUT/iniciar.sh"
cp "$ROOT/tools/capturar-ca.sh" "$OUT/capturar-ca.sh"
cp "$ROOT/tools/LEEME.txt" "$OUT/LEEME.txt"
chmod +x "$OUT/iniciar.sh" "$OUT/capturar-ca.sh"

echo
echo "Listo: $OUT"
du -sh "$OUT"
