const REQUIRED = ['LLM_ENDPOINT', 'LLM_APIKEY', 'LLM_APIVERSION', 'LLM_DEPLOYMENT'];

// A corporate proxy that terminates TLS surfaces as one of these underneath the
// SDK error, and it needs a different fix than having no route out.
const INTERCEPTION_CODES = [
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'CERT_SIGNATURE_FAILURE',
  'ERR_TLS_CERT_ALTNAME_INVALID',
];

class Function {
  constructor(dependencies) {
    /* Base Properties */
    this._dependencies = dependencies;
    this._utilities = this._dependencies.utilities;
    this._console = this._dependencies.console;

    /* Custom Properties */
    this._openai = this._dependencies.openai;

    /* Assigments */
    this._namespace = '[Function]::[Startup]::[Check]::[Model]';
  }

  /**
   * Calls the deployment the demo actually uses, so the log says whether the
   * whole path works — network, certificate, key and deployment name — instead
   * of only whether the host answers.
   */
  async run() {
    const missing = REQUIRED.filter((name) => !process.env[name]);

    if (missing.length) {
      this._console.error(`FALLA · faltan credenciales: ${missing.join(', ')}`, {
        namespace: this._namespace,
      });
      return;
    }

    if (!this._openai?.AzureOpenAI) {
      this._console.error('FALLA · el paquete openai no está inyectado por customDependencies', {
        namespace: this._namespace,
      });
      return;
    }

    const deployment = process.env.LLM_DEPLOYMENT;
    const host = String(process.env.LLM_ENDPOINT).replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const usingCustomCa = Boolean(process.env.NODE_EXTRA_CA_CERTS);
    const startedAt = Date.now();

    try {
      const { AzureOpenAI } = this._openai;
      const client = new AzureOpenAI({
        endpoint: process.env.LLM_ENDPOINT,
        apiKey: process.env.LLM_APIKEY,
        apiVersion: process.env.LLM_APIVERSION,
        deployment,
        maxRetries: 0,
      });

      // One token is enough to exercise credentials and deployment name.
      await client.chat.completions.create({
        model: deployment,
        messages: [{ role: 'user', content: 'ping' }],
        max_tokens: 1,
        temperature: 0,
      });

      this._console.success(
        `OK · ${deployment} en ${host} · ${Date.now() - startedAt} ms · ca.pem: ${usingCustomCa ? 'sí' : 'no'}`,
        { namespace: this._namespace },
      );
    } catch (error) {
      this._console.error(`${this.#describe({ error, host, deployment })}`, {
        namespace: this._namespace,
      });
    }
  }

  #describe({ error, host, deployment }) {
    const cause = error?.cause?.code || error?.code;

    if (INTERCEPTION_CODES.includes(cause)) {
      const remedy = process.env.NODE_EXTRA_CA_CERTS
        ? 'el ca.pem presente no cubre esta cadena'
        : 'hace falta ca.pem (./capturar-ca.sh)';

      return `TLS INTERCEPTADO · ${host} · ${cause} · ${remedy}`;
    }

    if (error?.status === 401 || error?.status === 403) {
      return `CREDENCIAL RECHAZADA · ${host} · HTTP ${error.status} · revisar LLM_APIKEY`;
    }

    if (error?.status === 404) {
      return `DEPLOYMENT NO ENCONTRADO · "${deployment}" en ${host} · revisar LLM_DEPLOYMENT`;
    }

    if (error?.status === 429) {
      return `LÍMITE DE CUOTA · ${host} · HTTP 429 · el modelo responde pero está saturado`;
    }

    if (error?.status) {
      return `ERROR DEL SERVICIO · ${host} · HTTP ${error.status} · ${error.message}`;
    }

    return `SIN SALIDA · ${host} · ${cause || error?.message}`;
  }
}

module.exports = Function;
