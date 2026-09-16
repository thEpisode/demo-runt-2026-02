const catalog = require('../../../constants/runt-catalog.json');
const { resolvePreset } = require('./date-range');

const INTENTS = ['count', 'list', 'aggregate'];
const DIRECTIONS = ['asc', 'desc'];
const VALUELESS_OPERATORS = ['is_null', 'is_not_null'];
const MAX_LIMIT = 200;

const DIMENSION_PHRASES = {
  placa: { prefix: 'con placa' },
  color: { prefix: 'de color' },
  servicio: { prefix: 'de servicio' },
  municipio: { prefix: 'matriculados en', properNoun: true },
  estado: { prefix: 'con estado' },
  modelo: { prefix: 'modelo', numeric: true },
  ano_fabricacion: { prefix: 'año de fabricación', numeric: true },
  cilindraje: { prefix: 'de cilindraje', numeric: true },
  fecha_registro: { dateVerb: 'registrados' },
  fecha_cancelacion: { dateVerb: 'cancelados' },
};

class ReportingQueryCatalogService {
  constructor(dependencies) {
    /* Base Properties */
    this._dependencies = dependencies;
    this._utilities = this._dependencies.utilities;
    this._console = this._dependencies.console;

    /* Custom Properties */
    this._catalog = catalog;
    this._database = this._dependencies?.database?.default?.adapter;
  }

  get catalog() {
    return this._catalog;
  }

  get timezone() {
    return this._catalog.timezone;
  }

  getEntity(entityName) {
    return this._catalog.entities[entityName] || null;
  }

  getDimension(entityName, dimensionName) {
    return this.getEntity(entityName)?.dimensions?.[dimensionName] || null;
  }

  /**
   * Reads the parameter tables so the prompt can carry the values exactly as
   * the database spells them. Without this the model writes "Amarillo" where
   * the database says "AMARILLO" and every count comes back as zero.
   */
  async loadDomainValues() {
    if (this._domainValues) {
      return this._domainValues;
    }

    const values = {};

    for (const [entityName, entity] of Object.entries(this._catalog.entities)) {
      for (const [dimensionName, dimension] of Object.entries(entity.dimensions)) {
        const loaded = await this.#loadDimensionValues({ entity, dimension });

        if (loaded) {
          values[`${entityName}.${dimensionName}`] = loaded;
        }
      }
    }

    this._domainValues = values;

    return values;
  }

  async #loadDimensionValues({ entity, dimension }) {
    if (!this._database) {
      return null;
    }

    if (dimension.kind === 'lookup') {
      const { table, key, label_column: labelColumn, active } = dimension.lookup;
      const group = dimension.disambiguate_by;
      const where = active ? ` WHERE ${active.column} = '${active.value}'` : '';
      const groupColumn = group ? `, ${group.column} AS GROUP_CODE` : '';
      const response = await this._database.query({
        sql: `SELECT ${key} AS ID, ${labelColumn} AS LABEL${groupColumn} FROM ${table}${where} ORDER BY ${labelColumn}`,
        maxRows: 5000,
      });

      if (!this._utilities.validator.response(response)) {
        return null;
      }

      return this.#disambiguate({ rows: response.result.rows, group });
    }

    if (dimension.kind === 'text' && dimension.closed_list) {
      const response = await this._database.query({
        sql: `SELECT DISTINCT ${dimension.column} AS LABEL FROM ${entity.table} WHERE ${dimension.column} IS NOT NULL ORDER BY 1 FETCH FIRST 50 ROWS ONLY`,
        maxRows: 50,
      });

      if (!this._utilities.validator.response(response)) {
        return null;
      }

      return response.result.rows.map((row) => ({ id: row.LABEL, label: row.LABEL }));
    }

    return null;
  }

  /**
   * Names repeat across departments (there are several LA UNION), and two
   * identical labels are impossible to tell apart in a picker. Only the
   * repeated ones get the department appended; `name` keeps the raw value so a
   * question that just says "La Unión" can still be matched and flagged as
   * ambiguous.
   */
  #disambiguate({ rows, group }) {
    const occurrences = rows.reduce((counts, row) => {
      counts[row.LABEL] = (counts[row.LABEL] || 0) + 1;
      return counts;
    }, {});

    return rows.map((row) => {
      const repeated = occurrences[row.LABEL] > 1;
      const groupName = group?.names?.[String(row.GROUP_CODE)] || row.GROUP_CODE;

      return {
        id: row.ID,
        name: row.LABEL,
        label: repeated && group ? `${row.LABEL} (${groupName})` : row.LABEL,
      };
    });
  }

  async getPublicCatalog() {
    const domainValues = await this.loadDomainValues();
    const entities = {};

    for (const [entityName, entity] of Object.entries(this._catalog.entities)) {
      entities[entityName] = {
        name: entityName,
        label: entity.label,
        table: entity.table,
        display_dimensions: entity.display_dimensions,
        dimensions: Object.entries(entity.dimensions).map(([name, dimension]) => ({
          name,
          label: dimension.label,
          kind: dimension.kind,
          column: dimension.column,
          indexed: dimension.indexed,
          operators: dimension.operators,
          values: domainValues[`${entityName}.${name}`] || null,
        })),
      };
    }

    return {
      version: this._catalog.version,
      timezone: this._catalog.timezone,
      entities,
      date_presets: this._catalog.date_presets,
      out_of_scope: this._catalog.out_of_scope,
      example_questions: this._catalog.example_questions,
    };
  }

  /**
   * Rejects anything the compiler could not turn into safe SQL: unknown
   * entities, unknown dimensions, operators a dimension does not support.
   */
  validateSpec({ spec } = {}) {
    if (!spec || typeof spec !== 'object') {
      return this._utilities.io.response.error('Falta la definición de la consulta');
    }

    const entity = this.getEntity(spec.entity);

    if (!entity) {
      return this._utilities.io.response.error(
        `No reconozco la entidad "${spec.entity}". Disponibles: ${Object.keys(this._catalog.entities).join(', ')}`,
      );
    }

    const intent = spec.intent || 'count';

    if (!INTENTS.includes(intent)) {
      return this._utilities.io.response.error(`No reconozco el tipo de consulta "${intent}"`);
    }

    const filters = [];

    for (const filter of spec.filters || []) {
      const validated = this.#validateFilter({ entity, filter });

      if (!this._utilities.validator.response(validated)) {
        return validated;
      }

      filters.push(validated.result);
    }

    const dateRange = this.#validateDateRange({ entity, dateRange: spec.date_range });

    if (!this._utilities.validator.response(dateRange)) {
      return dateRange;
    }

    const groupBy = [];

    for (const dimensionName of spec.group_by || []) {
      if (!entity.dimensions[dimensionName]) {
        return this._utilities.io.response.error(`El campo "${dimensionName}" no existe para agrupar`);
      }

      groupBy.push(dimensionName);
    }

    const orderBy = this.#validateOrderBy({ entity, orderBy: spec.order_by });

    if (!this._utilities.validator.response(orderBy)) {
      return orderBy;
    }

    const limit = Math.min(Number(spec.limit) || 24, MAX_LIMIT);

    return this._utilities.io.response.success({
      entity: spec.entity,
      intent,
      filters,
      // io.response.success(null) hands back {} rather than null, so an absent
      // clause has to be detected by its key, not by truthiness.
      date_range: dateRange.result?.dimension ? dateRange.result : null,
      group_by: groupBy,
      order_by: orderBy.result?.dimension ? orderBy.result : null,
      limit,
      needs_clarification: Boolean(spec.needs_clarification),
      clarification: spec.clarification || null,
    });
  }

  #validateFilter({ entity, filter }) {
    if (!filter || !filter.dimension) {
      return this._utilities.io.response.error('Cada condición necesita un campo');
    }

    const dimension = entity.dimensions[filter.dimension];

    if (!dimension) {
      const available = Object.keys(entity.dimensions).join(', ');

      return this._utilities.io.response.error(
        `El campo "${filter.dimension}" no existe. Disponibles: ${available}`,
      );
    }

    const operator = filter.operator || 'eq';

    if (!dimension.operators.includes(operator)) {
      return this._utilities.io.response.error(
        `El operador "${operator}" no aplica sobre "${filter.dimension}"`,
      );
    }

    if (VALUELESS_OPERATORS.includes(operator)) {
      return this._utilities.io.response.success({ dimension: filter.dimension, operator, value: null });
    }

    // The model always emits value as an array; the panel emits scalars.
    // Both are accepted and normalised to what the operator expects.
    const values = Array.isArray(filter.value) ? filter.value : [filter.value];
    const isEmpty = values.length === 0 || values.some((value) => value === undefined || value === null || value === '');

    if (isEmpty) {
      return this._utilities.io.response.error(`La condición sobre "${dimension.label.toLowerCase()}" necesita un valor`);
    }

    if (operator === 'between' && values.length !== 2) {
      return this._utilities.io.response.error(
        `El rango sobre "${dimension.label.toLowerCase()}" necesita dos valores`,
      );
    }

    const isMultiValue = ['in', 'not_in', 'between'].includes(operator);

    return this._utilities.io.response.success({
      dimension: filter.dimension,
      operator,
      value: isMultiValue ? values : values[0],
    });
  }

  #validateDateRange({ entity, dateRange }) {
    if (!dateRange || !dateRange.dimension) {
      return this._utilities.io.response.success(null);
    }

    const dimension = entity.dimensions[dateRange.dimension];

    if (!dimension) {
      return this._utilities.io.response.error(
        `El campo de fecha "${dateRange.dimension}" no existe`,
      );
    }

    if (dimension.kind !== 'date') {
      return this._utilities.io.response.error(`"${dateRange.dimension}" no es un campo de fecha`);
    }

    const resolved = resolvePreset({
      preset: dateRange.preset,
      from: dateRange.from,
      to: dateRange.to,
      timezone: this.timezone,
    });

    if (!resolved) {
      return this._utilities.io.response.error(`No reconozco el rango de fechas "${dateRange.preset}"`);
    }

    return this._utilities.io.response.success({
      dimension: dateRange.dimension,
      preset: dateRange.preset,
      from: resolved.from,
      to: resolved.to,
      label: resolved.label,
    });
  }

  #validateOrderBy({ entity, orderBy }) {
    if (!orderBy || !orderBy.dimension) {
      return this._utilities.io.response.success(null);
    }

    if (!entity.dimensions[orderBy.dimension]) {
      return this._utilities.io.response.error(
        `El campo "${orderBy.dimension}" no existe para ordenar`,
      );
    }

    const direction = (orderBy.direction || 'desc').toLowerCase();

    if (!DIRECTIONS.includes(direction)) {
      return this._utilities.io.response.error(`No reconozco el orden "${orderBy.direction}"`);
    }

    return this._utilities.io.response.success({ dimension: orderBy.dimension, direction });
  }

  /**
   * Turns lookup labels into the numeric ids the fact table stores. Resolving
   * against the tiny parameter table first means the fact table is filtered by
   * its indexed foreign key instead of by a function over text.
   */
  /**
   * Turns lookup labels into the ids the fact table stores. Resolving against
   * the small parameter table first means the fact table is filtered by its
   * indexed foreign key instead of by a function over text.
   */
  async resolveSpec({ spec } = {}) {
    const entity = this.getEntity(spec.entity);
    const domainValues = await this.loadDomainValues();
    const filters = [];

    for (const filter of spec.filters || []) {
      const dimension = entity.dimensions[filter.dimension];

      if (dimension.kind !== 'lookup' || filter.value === null) {
        filters.push(filter);
        continue;
      }

      const values = domainValues[`${spec.entity}.${filter.dimension}`] || [];
      const wanted = Array.isArray(filter.value) ? filter.value : [filter.value];
      const matchedLabels = [];
      const resolved = [];

      for (const label of wanted) {
        const outcome = this.#resolveLabel({ label, values, dimension });

        if (!this._utilities.validator.response(outcome)) {
          return outcome;
        }

        // An ambiguous name is a question for the user, not a failure: it goes
        // back as a clarification so the interface can ask instead of erroring.
        if (outcome.result.ambiguous) {
          return this._utilities.io.response.success({
            ...spec,
            needs_clarification: true,
            clarification: outcome.result.message,
          });
        }

        matchedLabels.push(outcome.result.label);
        resolved.push(outcome.result.id);
      }

      filters.push({
        ...filter,
        value: Array.isArray(filter.value) ? matchedLabels : matchedLabels[0],
        resolved: Array.isArray(filter.value) ? resolved : resolved[0],
      });
    }

    return this._utilities.io.response.success({ ...spec, filters });
  }

  #resolveLabel({ label, values, dimension }) {
    const wanted = this.#normalizeLabel(label);
    const noun = dimension.label.toLowerCase();

    const byLabel = values.filter((value) => this.#normalizeLabel(value.label) === wanted);
    if (byLabel.length === 1) {
      return this._utilities.io.response.success(byLabel[0]);
    }

    const byName = values.filter((value) => this.#normalizeLabel(value.name ?? value.label) === wanted);
    if (byName.length === 1) {
      return this._utilities.io.response.success(byName[0]);
    }

    if (byName.length > 1) {
      return this.#ambiguous({ label, noun, candidates: byName });
    }

    // Fuzzy dimensions accept the name the way people say it: "Bogotá" for
    // BOGOTA D.C. Closed lists do not, because there a near miss is an error.
    if (dimension.resolution === 'fuzzy') {
      const partial = values.filter((value) =>
        this.#normalizeLabel(value.name ?? value.label).includes(wanted),
      );

      if (partial.length === 1) {
        return this._utilities.io.response.success(partial[0]);
      }

      if (partial.length > 1) {
        return this.#ambiguous({ label, noun, candidates: partial });
      }

      return this._utilities.io.response.error(
        `No encontré el ${noun} "${label}". Revisa cómo está escrito.`,
      );
    }

    const options = values.map((value) => value.label).join(', ');

    return this._utilities.io.response.error(
      `"${label}" no es un ${noun} conocido. Valores válidos: ${options}`,
    );
  }

  #ambiguous({ label, noun, candidates }) {
    const options = candidates
      .slice(0, 8)
      .map((value) => value.label)
      .join(', ');

    return this._utilities.io.response.success({
      ambiguous: true,
      message: `"${label}" corresponde a más de un ${noun}: ${options}. ¿Cuál de ellos?`,
    });
  }

  /** CALI → Cali, SANTIAGO DE CALI → Santiago de Cali, BOGOTA D.C. stays D.C. */
  #titleCase(value) {
    const connectors = new Set(['de', 'del', 'la', 'las', 'los', 'el', 'y']);

    return String(value)
      .toLowerCase()
      .split(' ')
      .map((word, index) => {
        if (word.includes('.')) {
          return word.toUpperCase();
        }

        if (index > 0 && connectors.has(word)) {
          return word;
        }

        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ')
      .replace(/\((\w)/g, (_match, letter) => `(${letter.toUpperCase()}`);
  }

  #normalizeLabel(label) {
    return String(label)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toUpperCase();
  }

  /**
   * Spec to Spanish. Deterministic on purpose: the panel rewrites the sentence
   * on every keystroke, and an LLM round-trip there would be both slow and
   * non-reproducible.
   */
  restate({ spec } = {}) {
    const entity = this.getEntity(spec?.entity);

    if (!entity) {
      return '';
    }

    const clauses = (spec.filters || [])
      .map((filter) => this.#filterPhrase({ entity, filter }))
      .filter(Boolean);

    // Filter clauses run together; the date clause is set off by a comma so a
    // long sentence still has one natural pause.
    let tail = clauses.length ? ` ${clauses.join(' ')}` : '';

    if (spec.date_range) {
      const verb = DIMENSION_PHRASES[spec.date_range.dimension]?.dateVerb || 'con fecha';
      tail += `${clauses.length ? ',' : ''} ${verb} ${spec.date_range.label}`;
    }

    const subject = entity.label_plural || entity.label.toLowerCase();
    const grouping = (spec.group_by || []).length
      ? `, agrupados por ${spec.group_by.map((name) => entity.dimensions[name].label.toLowerCase()).join(' y ')}`
      : '';

    if (spec.intent === 'count') {
      return `¿Cuántos ${subject} hay${tail}${grouping}?`;
    }

    return `${subject.charAt(0).toUpperCase()}${subject.slice(1)}${tail}${grouping}.`;
  }

  #filterPhrase({ entity, filter }) {
    const dimension = entity.dimensions[filter.dimension];

    if (!dimension) {
      return null;
    }

    const phrase = DIMENSION_PHRASES[filter.dimension] || {};
    const prefix = phrase.prefix || dimension.label.toLowerCase();
    const numeric = Boolean(phrase.numeric);
    const display = (value) => {
      if (numeric) {
        return value;
      }

      return phrase.properNoun ? this.#titleCase(value) : String(value).toLowerCase();
    };

    const list = (values) => {
      const items = values.map(display);

      if (items.length === 1) {
        return items[0];
      }

      return `${items.slice(0, -1).join(', ')} o ${items[items.length - 1]}`;
    };

    switch (filter.operator) {
      case 'eq':
        return `${prefix} ${display(filter.value)}`;
      case 'ne':
        return `${prefix} distinto de ${display(filter.value)}`;
      case 'gt':
        return numeric
          ? `${prefix} mayor a ${filter.value}`
          : `${prefix} posterior a ${display(filter.value)}`;
      case 'gte':
        return `${prefix} ${display(filter.value)} o superior`;
      case 'lt':
        return numeric
          ? `${prefix} menor a ${filter.value}`
          : `${prefix} anterior a ${display(filter.value)}`;
      case 'lte':
        return `${prefix} ${display(filter.value)} o inferior`;
      case 'between':
        return `${prefix} entre ${display(filter.value[0])} y ${display(filter.value[1])}`;
      case 'in':
        return `${prefix} ${list(filter.value)}`;
      case 'not_in':
        return `${prefix} distinto de ${list(filter.value)}`;
      case 'like':
        return `${prefix} que contiene ${display(filter.value)}`;
      case 'is_null':
        return `sin ${dimension.label.toLowerCase()}`;
      case 'is_not_null':
        return `con ${dimension.label.toLowerCase()}`;
      default:
        return null;
    }
  }
}

module.exports = ReportingQueryCatalogService;
