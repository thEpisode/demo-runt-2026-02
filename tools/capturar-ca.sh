#!/usr/bin/env bash
# Captures the certificate chain the network actually presents, so Node can
# trust a TLS-intercepting corporate proxy. Uses the bundled Node rather than
# openssl, which is not guaranteed to be installed.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")"
HERE="$PWD"

NODE_BIN="$HERE/runtime/bin/node"
if ! "$NODE_BIN" --version >/dev/null 2>&1; then
  NODE_BIN="$(command -v node || true)"
fi

if [ -z "$NODE_BIN" ]; then
  echo "  No hay un Node utilizable para capturar el certificado." >&2
  exit 1
fi

HOST="${1:-}"
if [ -z "$HOST" ]; then
  HOST="$(grep -o 'LLM_ENDPOINT="[^"]*"' backend/.env 2>/dev/null | sed 's|.*//||; s|/.*||')"
fi

if [ -z "$HOST" ]; then
  echo "Uso: ./capturar-ca.sh <host>" >&2
  exit 1
fi

# Written to a temporary file and moved only on success: an empty ca.pem left
# behind would make the next run trust nothing at all.
TMP="$HERE/.ca.pem.tmp"
rm -f "$TMP"

"$NODE_BIN" -e '
const tls = require("tls");
const fs = require("fs");
const [host, out] = process.argv.slice(1);

const socket = tls.connect(
  { host, port: 443, servername: host, rejectUnauthorized: false, timeout: 15000 },
  () => {
    const chain = [];
    const seen = new Set();
    let certificate = socket.getPeerCertificate(true);

    while (certificate && certificate.raw && !seen.has(certificate.fingerprint256)) {
      seen.add(certificate.fingerprint256);
      const body = certificate.raw.toString("base64").match(/.{1,64}/g).join("\n");
      chain.push(`-----BEGIN CERTIFICATE-----\n${body}\n-----END CERTIFICATE-----`);
      certificate = certificate.issuerCertificate;
    }

    socket.end();

    if (!chain.length) {
      process.exit(1);
    }

    fs.writeFileSync(out, chain.join("\n") + "\n");
    console.log(chain.length);
  },
);

socket.on("timeout", () => { socket.destroy(); process.exit(1); });
socket.on("error", () => process.exit(1));
' "$HOST" "$TMP" > /dev/null 2>&1 || true

if [ ! -s "$TMP" ]; then
  rm -f "$TMP"
  echo "  No se pudo obtener la cadena de $HOST." >&2
  exit 1
fi

mv "$TMP" "$HERE/ca.pem"
COUNT="$(grep -c 'BEGIN CERTIFICATE' "$HERE/ca.pem")"
echo "  ca.pem listo con $COUNT certificado(s) de $HOST."
