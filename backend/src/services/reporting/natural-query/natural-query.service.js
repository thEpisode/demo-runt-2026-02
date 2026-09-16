const prompt = require('./natural-query.prompt.json');
const { PRESET_LABELS } = require('../query-catalog/date-range');

const JSON_FENCE = /^```(?:json)?\s*([\s\S]*?)\s*```$/;

class ReportingNaturalQueryService {
  constructor(dependencies) {
    /* Base Properties */
    this._dependencies = dependencies;
    this._utilities = this._dependencies.utilities;
    this._console = this._dependencies.console;

    /* Custom Properties */
    this._catalogService = new this._dependencies.services.ReportingQueryCatalogService(dependencies);
    this._compilerService = new this._dependencies.services.ReportingQueryCompilerService(dependencies);
    this._database = this._dependencies?.database?.default?.adapter;

    // Link Loom injects the environment as config: locally from
    // config/default.json, and replaced wholesale when it runs under Link Loom
    // Cloud. Reading process.env would bypass that contract.
    const llm = this._dependencies?.config?.modules?.llm || {};
    this._llmSettings = llm?.providers?.[llm?.settings?.default]?.settings || {};

    this._namespace = '[Service]::[Reporting]::[NaturalQuery]';
  }

  async getCatalog() {
    const catalog = await this._catalogService.getPublicCatalog();

    return this._utilities.io.response.success(catalog);
  }

  restate({ data } = {}) {
    const validated = this._catalogService.validateSpec({ spec: data?.spec });

    if (!this._utilities.validator.response(validated)) {
      return validated;
    }

    return this._utilities.io.response.success({
      spec: validated.result,
      restatement: this._catalogService.restate({ spec: validated.result }),
    });
  }

  /**
   * Natural language in, answer out. The model only produces the spec; the
   * compiler and the database do the rest, so the same question always
   * produces the same SQL.
   */
  async ask({ data } = {}) {
    if (!data || !data.question) {
      return this._utilities.io.response.error('Escribe una pregunta');
    }

    const interpreted = await this.#interpret({
      question: data.question,
      previousSpec: data.spec || null,
    });

    if (!this._utilities.validator.response(interpreted)) {
      return interpreted;
    }

    const validated = this._catalogService.validateSpec({ spec: interpreted.result.spec });

    if (!this._utilities.validator.response(validated)) {
      return validated;
    }

    const spec = validated.result;

    if (spec.needs_clarification) {
      return this._utilities.io.response.success({
        spec,
        restatement: null,
        sql: null,
        binds: null,
        answer: null,
        rows: [],
        total: null,
        needs_clarification: true,
        clarification: spec.clarification,
        question: data.question,
        interpretation_ms: interpreted.result.timing_ms,
      });
    }

    const executed = await this.execute({
      data: { spec, dry_run: data.dry_run, page: data.page, page_size: data.page_size },
    });

    if (!this._utilities.validator.response(executed)) {
      return executed;
    }

    return this._utilities.io.response.success({
      ...executed.result,
      question: data.question,
      interpretation_ms: interpreted.result.timing_ms,
    });
  }

  /**
   * Runs a spec that may have been edited by hand in the filter panel. Never
   * touches the model, which is what keeps the demo operable without inference.
   */
  async execute({ data } = {}) {
    const validated = this._catalogService.validateSpec({ spec: data?.spec });

    if (!this._utilities.validator.response(validated)) {
      return validated;
    }

    const resolved = await this._catalogService.resolveSpec({ spec: validated.result });

    if (!this._utilities.validator.response(resolved)) {
      return resolved;
    }

    const spec = resolved.result;

    if (spec.needs_clarification) {
      return this._utilities.io.response.success({
        spec,
        restatement: null,
        sql: null,
        binds: null,
        answer: null,
        rows: [],
        total: null,
        needs_clarification: true,
        clarification: spec.clarification,
      });
    }

    const compiled = this._compilerService.compile({ spec });

    if (!this._utilities.validator.response(compiled)) {
      return compiled;
    }

    const restatement = this._catalogService.restate({ spec });
    const base = {
      spec,
      restatement,
      sql: compiled.result.count_sql,
      rows_sql: compiled.result.rows_sql,
      group_sql: compiled.result.group_sql,
      binds: compiled.result.binds,
      uses_index: compiled.result.uses_index,
      source: this._catalogService.getEntity(spec.entity).table,
    };

    if (data.dry_run) {
      return this._utilities.io.response.success({
        ...base,
        answer: null,
        rows: [],
        total: null,
        groups: null,
        dry_run: true,
      });
    }

    if (!this._database) {
      return this._utilities.io.response.error('No hay conexión con la base de datos');
    }

    const startedAt = Date.now();
    const queries = [];
    let total = null;

    // Paging through results reuses the total the caller already has. On the
    // real table a colour-only COUNT is a full scan, so re-running it on every
    // page turn would make pagination the slowest part of the demo.
    if (!data.skip_count) {
      const countResponse = await this._database.query({
        sql: compiled.result.count_sql,
        binds: compiled.result.binds,
        maxRows: 1,
      });

      if (!this._utilities.validator.response(countResponse)) {
        return countResponse;
      }

      queries.push(countResponse.result.timing_ms);
      total = countResponse.result.rows?.[0]?.TOTAL ?? 0;
    }

    const pageSize = Number(data.page_size) || spec.limit || 24;
    const rowsResponse = await this._database.query({
      sql: compiled.result.rows_sql,
      binds: compiled.result.binds,
      page: data.page,
      pageSize,
    });

    if (!this._utilities.validator.response(rowsResponse)) {
      return rowsResponse;
    }

    queries.push(rowsResponse.result.timing_ms);

    let groups = null;

    if (compiled.result.group_sql) {
      const groupResponse = await this._database.query({
        sql: compiled.result.group_sql,
        binds: compiled.result.binds,
        maxRows: 50,
      });

      if (this._utilities.validator.response(groupResponse)) {
        queries.push(groupResponse.result.timing_ms);
        groups = await this.#disambiguateRows({ spec, rows: groupResponse.result.rows });
      }
    }

    return this._utilities.io.response.success({
      ...base,
      rows_sql: rowsResponse.result.sql,
      // A page turn knows no total, so it carries no answer either: the caller
      // keeps the one the counted query produced.
      answer: total === null ? null : this.#buildAnswer({ spec, total }),
      rows: await this.#disambiguateRows({ spec, rows: rowsResponse.result.rows }),
      page: Number(data.page) || 1,
      page_size: pageSize,
      total,
      groups,
      query_count: queries.length,
      timing_ms: Date.now() - startedAt,
      dry_run: false,
    });
  }

  /**
   * The compiler returns <DIMENSION>__KEY next to the name for dimensions whose
   * names repeat. Here the name becomes the disambiguated label and the key
   * column is dropped, so the client never sees two identical LA UNION rows.
   */
  async #disambiguateRows({ spec, rows }) {
    const entity = this._catalogService.getEntity(spec.entity);
    const ambiguous = Object.entries(entity.dimensions).filter(([, dimension]) => dimension.disambiguate_by);

    if (!ambiguous.length || !rows?.length) {
      return rows;
    }

    const domainValues = await this._catalogService.loadDomainValues();

    return rows.map((row) => {
      const next = { ...row };

      for (const [name] of ambiguous) {
        const column = name.toUpperCase();
        const keyColumn = `${column}__KEY`;

        if (!(keyColumn in next)) {
          continue;
        }

        const match = (domainValues[`${spec.entity}.${name}`] || []).find(
          (value) => String(value.id) === String(next[keyColumn]),
        );

        if (match) {
          next[column] = match.label;
        }

        delete next[keyColumn];
      }

      return next;
    });
  }

  #buildAnswer({ spec, total }) {
    const entity = this._catalogService.getEntity(spec.entity);
    const description = this._catalogService
      .restate({ spec: { ...spec, intent: 'list', group_by: [] } })
      .replace(/\.$/, '');

    return {
      value: total,
      unit: entity.label_plural,
      sentence: `${description.charAt(0).toLowerCase()}${description.slice(1)} en el RUNT.`,
    };
  }

  async #interpret({ question, previousSpec }) {
    const { endpoint, apiKey, apiVersion, deployment } = this._llmSettings;
    const missing = Object.entries({ endpoint, apiKey, apiVersion, deployment })
      .filter(([, value]) => !value || String(value).startsWith('xxxx__'))
      .map(([name]) => name);

    if (missing.length) {
      return this._utilities.io.response.error(
        `El modelo no está configurado. Faltan en modules.llm: ${missing.join(', ')}`,
      );
    }

    const startedAt = Date.now();

    try {
      const { AzureOpenAI } = this._dependencies.openai;
      const client = new AzureOpenAI({ endpoint, apiKey, apiVersion, deployment });

      const messages = await this.#buildMessages({ question, previousSpec });

      const completion = await client.chat.completions.create({
        messages,
        model: deployment,
        temperature: 0,
        response_format: { type: 'json_object' },
      });

      const content = completion.choices?.[0]?.message?.content?.trim();

      if (!content) {
        return this._utilities.io.response.error('El modelo no devolvió respuesta');
      }

      const spec = this.#parseSpec(content);

      if (!spec) {
        this._console.error(`Unparseable model output: ${content}`, { namespace: this._namespace });

        return this._utilities.io.response.error('El modelo devolvió una respuesta que no se pudo interpretar');
      }

      return this._utilities.io.response.success({ spec, timing_ms: Date.now() - startedAt });
    } catch (error) {
      this._console.error(error, { namespace: this._namespace });

      return this._utilities.io.response.error(`Falló la llamada al modelo: ${error.message}`);
    }
  }

  #parseSpec(content) {
    const fenced = content.match(JSON_FENCE);
    const payload = fenced ? fenced[1] : content;

    try {
      return JSON.parse(payload);
    } catch (error) {
      return null;
    }
  }

  async #buildMessages({ question, previousSpec }) {
    const system = await this.#renderSystemPrompt();
    const messages = [{ role: 'system', content: system }];

    for (const shot of prompt.few_shots) {
      messages.push({ role: 'user', content: shot.user });
      messages.push({ role: 'assistant', content: JSON.stringify(shot.assistant) });
    }

    if (previousSpec) {
      messages.push({
        role: 'user',
        content:
          'La consulta actual es esta. La siguiente pregunta la refina: ' +
          `mantén los filtros que sigan aplicando.\n${JSON.stringify(previousSpec)}`,
      });
      messages.push({ role: 'assistant', content: JSON.stringify(previousSpec) });
    }

    messages.push({ role: 'user', content: question });

    return messages;
  }

  /**
   * Renders the catalog into the prompt. Because both come from the same
   * source, a schema change updates the prompt, the compiler and the frontend
   * selects at once.
   */
  async #renderSystemPrompt() {
    if (this._renderedPrompt) {
      return this._renderedPrompt;
    }

    const catalog = this._catalogService.catalog;
    const domainValues = await this._catalogService.loadDomainValues();
    const entity = catalog.entities.vehiculo;

    const dimensions = Object.entries(entity.dimensions)
      .map(([name, dimension]) => {
        const values = domainValues[`vehiculo.${name}`];
        let listing = '';

        if (values && dimension.prompt_values === false) {
          listing = ' (free text: write the name as the user said it, it is matched against the registry)';
        } else if (values) {
          listing = ' (closed list)';
        }

        return `- ${name} — ${dimension.label} — ${dimension.kind}${listing} — operators: ${dimension.operators.join(', ')}`;
      })
      .join('\n');

    // Around 1,100 municipalities would bloat every request and dilute the
    // short lists that do need exact spelling, so those stay out of the prompt.
    const valueLists = Object.entries(domainValues)
      .filter(([key]) => entity.dimensions[key.split('.')[1]]?.prompt_values !== false)
      .map(([key, values]) => {
        const name = key.split('.')[1];

        return `${name}: ${values.map((value) => value.label).join(' | ')}`;
      })
      .join('\n');

    const presets = catalog.date_presets
      .map((preset) => `- ${preset.name} — ${PRESET_LABELS[preset.name] || preset.label}`)
      .join('\n');

    const today = new Date().toISOString().slice(0, 10);

    this._renderedPrompt = prompt.system
      .replace('{{OUT_OF_SCOPE}}', Object.values(catalog.out_of_scope).join(', '))
      .replace('{{DIMENSIONS}}', dimensions)
      .replace('{{DOMAIN_VALUES}}', valueLists || '(not loaded)')
      .replace('{{DATE_PRESETS}}', presets)
      .replace('{{TODAY}}', today)
      .replace('{{TIMEZONE}}', catalog.timezone);

    return this._renderedPrompt;
  }
}

module.exports = ReportingNaturalQueryService;
