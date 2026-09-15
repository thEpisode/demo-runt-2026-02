/**
 * Captures the certificate chain the network presents, so Node can trust a
 * TLS-intercepting corporate proxy. Written in Node rather than as a shell
 * script so the same file works on Windows and on Linux.
 */
const fs = require('fs');
const path = require('path');
const tls = require('tls');

const root = path.resolve(__dirname, '..');
const configFile = path.join(root, 'backend', 'config', 'default.json');
const output = path.join(root, 'ca.pem');

const readHost = () => {
  if (!fs.existsSync(configFile)) {
    return null;
  }

  const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
  const llm = config?.modules?.llm || {};
  const endpoint = llm?.providers?.[llm?.settings?.default]?.settings?.endpoint;

  if (!endpoint || endpoint.startsWith('xxxx__')) {
    return null;
  }

  return String(endpoint).replace(/^https?:\/\//, '').replace(/\/.*$/, '');
};

/**
 * Whether the chain this network presents already verifies. If it does there is
 * nothing to capture, and writing a ca.pem anyway would claim an interception
 * that is not happening.
 */
const isTrusted = (host) =>
  new Promise((resolve) => {
    const socket = tls.connect(
      { host, port: 443, servername: host, rejectUnauthorized: true, timeout: 15000 },
      () => {
        socket.end();
        resolve(true);
      },
    );

    socket.on('timeout', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
  });

const capture = (host) =>
  new Promise((resolve) => {
    const socket = tls.connect(
      { host, port: 443, servername: host, rejectUnauthorized: false, timeout: 15000 },
      () => {
        const chain = [];
        const seen = new Set();
        let certificate = socket.getPeerCertificate(true);

        while (certificate && certificate.raw && !seen.has(certificate.fingerprint256)) {
          seen.add(certificate.fingerprint256);
          const body = certificate.raw.toString('base64').match(/.{1,64}/g).join('\n');
          chain.push(`-----BEGIN CERTIFICATE-----\n${body}\n-----END CERTIFICATE-----`);
          certificate = certificate.issuerCertificate;
        }

        socket.end();
        resolve(chain);
      },
    );

    socket.on('timeout', () => {
      socket.destroy();
      resolve([]);
    });
    socket.on('error', () => resolve([]));
  });

const main = async () => {
  const host = readHost();

  if (!host) {
    process.exit(1);
  }

  if (await isTrusted(host)) {
    process.exit(1);
  }

  const chain = await capture(host);

  if (chain.length < 2) {
    // A single certificate is the site's own leaf: nothing to add as a trust
    // anchor, and writing it would leave Node trusting something useless.
    process.exit(1);
  }

  fs.writeFileSync(output, `${chain.join('\n')}\n`);
  console.log(chain.length);
};

main().catch(() => process.exit(1));
