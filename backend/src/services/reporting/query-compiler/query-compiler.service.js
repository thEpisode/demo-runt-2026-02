const SQL_OPERATORS = {
  eq: '=',
  ne: '<>',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
};

const DATE_FORMAT = 'YYYY-MM-DD HH24:MI:SS';

class ReportingQueryCompilerService {
  constructor(dependencies) {
    /* Base Properties */
    this._dependencies = dependencies;
    this._utilities = this._dependencies.utilities;
    this._console = this._dependencies.console;

    /* Custom Properties */
    this._catalogService = new this._dependencies.services.ReportingQueryCatalogService(dependencies);
    this._settings = this._dependencies?.config?.modules?.database?.providers?.oracle?.settings || {};
  }

  /**
   * Turns a validated spec into a parameterized statement. Values never reach
   * the SQL text: they travel as bind variables.
   */
  compile({ spec } = {}) {
    const entity = this._catalogService.getEntity(spec.entity);

    if (!entity) {
      return this._utilities.io.response.error(`Unknown entity "${spec.entity}"`);
    }

    const binds = {};
    const predicates = this.#buildPredicates({ entity, spec, binds });
    const where = predicates.length ? `\n WHERE ${predicates.join('\n   AND ')}` : '';
    const hint = this.#buildHint({ entity, spec });

    const countSql = `SELECT ${hint}COUNT(*) AS TOTAL\n  FROM ${entity.table} ${entity.alias}${where}`;

    const rowsSql = this.#buildRowsStatement({ entity, spec, where, hint });
    const groupSql = spec.group_by?.length
      ? this.#buildGroupStatement({ entity, spec, where, hint })
      : null;

    return this._utilities.io.response.success({
      count_sql: countSql,
      rows_sql: rowsSql,
      group_sql: groupSql,
      binds,
      uses_index: this.#usesIndex({ entity, spec }),
    });
  }

  #buildPredicates({ entity, spec, binds }) {
    const predicates = [];

    (spec.filters || []).forEach((filter, index) => {
      const dimension = entity.dimensions[filter.dimension];
      const column = `${entity.alias}.${dimension.column}`;
      const bindName = `${filter.dimension}_${index}`;

      predicates.push(this.#buildPredicate({ column, bindName, filter, dimension, binds }));
    });

    if (spec.date_range) {
      const dimension = entity.dimensions[spec.date_range.dimension];
      const column = `${entity.alias}.${dimension.column}`;

      binds[`${spec.date_range.dimension}_from`] = spec.date_range.from;
      binds[`${spec.date_range.dimension}_to`] = spec.date_range.to;

      predicates.push(
        `${column} >= TO_DATE(:${spec.date_range.dimension}_from, '${DATE_FORMAT}')`,
      );
      predicates.push(`${column} < TO_DATE(:${spec.date_range.dimension}_to, '${DATE_FORMAT}')`);
    }

    return predicates;
  }

  #buildPredicate({ column, bindName, filter, dimension, binds }) {
    if (filter.operator === 'is_null') {
      return `${column} IS NULL`;
    }

    if (filter.operator === 'is_not_null') {
      return `${column} IS NOT NULL`;
    }

    // Lookup dimensions bind the resolved id, never the label the user typed.
    const raw = dimension.kind === 'lookup' ? filter.resolved : filter.value;

    if (filter.operator === 'between') {
      binds[`${bindName}_from`] = this.#castValue({ dimension, value: raw[0] });
      binds[`${bindName}_to`] = this.#castValue({ dimension, value: raw[1] });

      return dimension.kind === 'date'
        ? `${column} >= TO_DATE(:${bindName}_from, '${DATE_FORMAT}') AND ${column} < TO_DATE(:${bindName}_to, '${DATE_FORMAT}')`
        : `${column} BETWEEN :${bindName}_from AND :${bindName}_to`;
    }

    if (['in', 'not_in'].includes(filter.operator)) {
      const names = raw.map((value, position) => {
        binds[`${bindName}_${position}`] = this.#castValue({ dimension, value });

        return `:${bindName}_${position}`;
      });

      const keyword = filter.operator === 'in' ? 'IN' : 'NOT IN';

      return `${column} ${keyword} (${names.join(', ')})`;
    }

    if (filter.operator === 'like') {
      binds[bindName] = `%${String(raw).toUpperCase()}%`;

      return `UPPER(${column}) LIKE :${bindName}`;
    }

    binds[bindName] = this.#castValue({ dimension, value: raw });

    if (dimension.kind === 'date') {
      return `${column} ${SQL_OPERATORS[filter.operator]} TO_DATE(:${bindName}, '${DATE_FORMAT}')`;
    }

    return `${column} ${SQL_OPERATORS[filter.operator]} :${bindName}`;
  }

  #castValue({ dimension, value }) {
    if (dimension.kind === 'number') {
      return Number(value);
    }

    if (dimension.kind === 'lookup') {
      return Number(value);
    }

    return value;
  }

  #buildRowsStatement({ entity, spec, where, hint }) {
    const joins = [];
    const columns = [`${entity.alias}.${entity.primary_key} AS ID`];

    for (const dimensionName of entity.display_dimensions) {
      const dimension = entity.dimensions[dimensionName];

      if (dimension.kind !== 'lookup') {
        columns.push(`${entity.alias}.${dimension.column} AS ${dimensionName.toUpperCase()}`);
        continue;
      }

      const { table, alias, key, label_column: labelColumn } = dimension.lookup;

      joins.push(
        `  LEFT JOIN ${table} ${alias} ON ${alias}.${key} = ${entity.alias}.${dimension.column}`,
      );
      columns.push(`${alias}.${labelColumn} AS ${dimensionName.toUpperCase()}`);
    }

    const order = spec.order_by || entity.default_order;
    const orderColumn = `${entity.alias}.${entity.dimensions[order.dimension].column}`;

    // No row-limiting clause here: the database provider adds it in its own
    // dialect when the caller asks for a page.
    return (
      `SELECT ${hint}${columns.join(',\n       ')}\n` +
      `  FROM ${entity.table} ${entity.alias}\n` +
      `${joins.join('\n')}${joins.length ? '\n' : ''}` +
      `${where.replace(/^\n/, '')}\n` +
      ` ORDER BY ${orderColumn} ${order.direction.toUpperCase()}`
    );
  }

  #buildGroupStatement({ entity, spec, where, hint }) {
    const joins = [];
    const columns = [];
    const groupColumns = [];

    for (const dimensionName of spec.group_by) {
      const dimension = entity.dimensions[dimensionName];

      if (dimension.kind !== 'lookup') {
        columns.push(`${entity.alias}.${dimension.column} AS ${dimensionName.toUpperCase()}`);
        groupColumns.push(`${entity.alias}.${dimension.column}`);
        continue;
      }

      const { table, alias, key, label_column: labelColumn } = dimension.lookup;

      joins.push(
        `  LEFT JOIN ${table} ${alias} ON ${alias}.${key} = ${entity.alias}.${dimension.column}`,
      );
      columns.push(`${alias}.${labelColumn} AS ${dimensionName.toUpperCase()}`);
      groupColumns.push(`${alias}.${labelColumn}`);
    }

    return (
      `SELECT ${hint}${columns.join(',\n       ')},\n       COUNT(*) AS TOTAL\n` +
      `  FROM ${entity.table} ${entity.alias}\n` +
      `${joins.join('\n')}${joins.length ? '\n' : ''}` +
      `${where.replace(/^\n/, '')}\n` +
      ` GROUP BY ${groupColumns.join(', ')}\n` +
      ` ORDER BY TOTAL DESC`
    );
  }

  /**
   * AUTOMOTOR_COLOR_IDCOLOR has no index in production, so a colour-only
   * question is a full scan. When no filter hits an index we ask Oracle for
   * parallelism instead of waiting on a serial scan during the demo.
   */
  #usesIndex({ entity, spec }) {
    const filtered = [
      ...(spec.filters || []).map((filter) => filter.dimension),
      ...(spec.date_range ? [spec.date_range.dimension] : []),
    ];

    if (!filtered.length) {
      return false;
    }

    return filtered.some((dimensionName) => entity.dimensions[dimensionName]?.indexed);
  }

  #buildHint({ entity, spec }) {
    if (this.#usesIndex({ entity, spec })) {
      return '';
    }

    const degree = this._settings.parallelDegree;

    if (!degree) {
      return '';
    }

    return `/*+ PARALLEL(${entity.alias}, ${degree}) */ `;
  }
}

module.exports = ReportingQueryCompilerService;
