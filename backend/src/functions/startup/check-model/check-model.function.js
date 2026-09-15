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

    // Link Loom injects the environment as config, so the settings come from
    // there and not from process.env.
    const llm = this._dependencies?.config?.modules?.llm || {};
    this._settings = llm?.providers?.[llm?.settings?.default]?.settings || {};

    /* Assigments */
    this._namespace = '[Function]::[Startup]::[Check]::[Model]';
  }

  /**
   * Calls the deployment the demo actually uses, so the log says whether the
   * whole path works — network, certificate, key and deployment name — instead
   * of only whether the host answers.
   */
  async run() {
    const { endpoint, apiKey, apiVersion, deployment } = this._settings;
    const missing = Object.entries({ endpoint, apiKey, apiVersion, deployment })
      .filter(([, value]) => !value || String(value).startsWith('xxxx__'))
      .map(([name]) => name);

    if (missing.length) {
      this._console.error(`FALLA · faltan en modules.llm: ${missing.join(', ')}`, {
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

    const host = String(endpoint).replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    const usingCustomCa = Boolean(process.env.NODE_EXTRA_CA_CERTS);
    const startedAt = Date.now();

    try {
      const { AzureOpenAI } = this._openai;
      const client = new AzureOpenAI({ endpoint, apiKey, apiVersion, deployment, maxRetries: 0 });

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

    if (error?.status === 401) {
      return `CREDENCIAL RECHAZADA · ${host} · HTTP 401 · apiKey inválida en modules.llm`;
    }

    // A block page arrives as HTML, never as the API's JSON. That difference
    // is what separates "the network refused us" from "Azure refused us", and
    // they are fixed by completely different people.
    const block = this.#blockPage(error);

    if (block) {
      return (
        `BLOQUEADO POR LA RED · ${host} · no llegó a Azure: lo cortó ${block.vendor}` +
        `${block.category ? ` (categoría "${block.category}")` : ''}. ` +
        `Hay que pedir a la red del cliente que permita este dominio.`
      );
    }

    // 403 is not a bad key — that answers 401. It means the request arrived and
    // was refused after being authenticated.
    if (error?.status === 403) {
      return (
        `ACCESO DENEGADO · ${host} · HTTP 403 · la credencial se aceptó pero la ` +
        `petición fue rechazada, probablemente por restricción de red del recurso ` +
        `Azure. Detalle: ${this.#snippet(error)}`
      );
    }

    if (error?.status === 404) {
      return `DEPLOYMENT NO ENCONTRADO · "${deployment}" en ${host} · revisar LLM_DEPLOYMENT`;
    }

    if (error?.status === 429) {
      return `LÍMITE DE CUOTA · ${host} · HTTP 429 · el modelo responde pero está saturado`;
    }

    if (error?.status) {
      return `ERROR DEL SERVICIO · ${host} · HTTP ${error.status} · ${this.#snippet(error)}`;
    }

    return `SIN SALIDA · ${host} · ${cause || error?.message}`;
  }

  /**
   * Recognises a firewall or proxy block page. Those answer HTML where the API
   * would answer JSON, so the content type of the refusal is the tell.
   */
  #blockPage(error) {
    const body = error?.error || error?.response?.data || error?.message || '';
    const text = typeof body === 'string' ? body : JSON.stringify(body);

    if (!/<html|<!DOCTYPE html/i.test(text)) {
      return null;
    }

    const vendors = [
      [/fortiguard|fortinet|fortigate/i, 'el firewall (FortiGuard)'],
      [/zscaler/i, 'el proxy (Zscaler)'],
      [/bluecoat|blue coat|symantec web/i, 'el proxy (Blue Coat)'],
      [/squid|access denied.*proxy/i, 'el proxy corporativo'],
      [/websense|forcepoint/i, 'el filtro (Forcepoint)'],
      [/palo ?alto/i, 'el firewall (Palo Alto)'],
    ];

    const matched = vendors.find(([pattern]) => pattern.test(text));
    const category = text.match(/<td>\s*Category\s*<\/td>\s*<td>\s*([^<]+?)\s*<\/td>/i);

    return {
      vendor: matched ? matched[1] : 'un filtro de red',
      category: category ? category[1] : null,
    };
  }

  /** Whatever the other end actually answered, trimmed to one readable line. */
  #snippet(error) {
    const body = error?.error || error?.response?.data;
    const text = typeof body === 'string' ? body : JSON.stringify(body || error?.message || '');

    return text.replace(/\s+/g, ' ').slice(0, 220);
  }
}

module.exports = Function;
