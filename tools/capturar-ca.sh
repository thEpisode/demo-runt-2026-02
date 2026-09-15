#!/usr/bin/env bash
# Run this ON the demo machine when TLS is intercepted by a corporate proxy.
# It captures the certificate chain the proxy actually presents and writes it
# next to iniciar.sh, which picks it up automatically.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"

HOST="${1:-}"
if [ -z "$HOST" ]; then
  HOST="$(grep -o 'LLM_ENDPOINT="[^"]*"' backend/.env 2>/dev/null | sed 's|.*//||; s|/.*||')"
fi

if [ -z "$HOST" ]; then
  echo "Uso: ./capturar-ca.sh <host>" >&2
  exit 1
fi

echo
echo "  Capturando la cadena de certificados de $HOST ..."
echo

openssl s_client -showcerts -servername "$HOST" -connect "$HOST:443" </dev/null 2>/dev/null \
  | awk '/-----BEGIN CERTIFICATE-----/,/-----END CERTIFICATE-----/' > ca.pem

COUNT="$(grep -c 'BEGIN CERTIFICATE' ca.pem || true)"

if [ "${COUNT:-0}" -eq 0 ]; then
  rm -f ca.pem
  echo "  No se pudo obtener la cadena. Revisa que haya salida hacia $HOST:443." >&2
  exit 1
fi

echo "  Listo: ca.pem con $COUNT certificado(s)."
echo "  Al ejecutar ./iniciar.sh se usará automáticamente."
echo
echo "  Nota: esto hace que la demo confíe en el proxy que intercepta el"
echo "        tráfico, que es lo mismo que ya hacen los navegadores de la"
echo "        organización."
echo
