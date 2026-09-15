const DataSource = require('../base/data-source');

const READ_ONLY_STATEMENT = /^\s*(select|with)\b/i;

class OracleDataSource extends DataSource {
  constructor(dependencies) {
    if (!dependencies) {
      throw new Error('Required args to build this entity');
    }

    super(dependencies);

    /* Base Properties */
    this._dependencies = dependencies;
    this._console = this._dependencies.console;
    this._utilities = this._dependencies.utilities;

    /* Custom Properties */
    this._driver = null;
    this._pool = null;
    this._settings = null;
    this._namespace = '[Loom]::[Database]::[Oracle]';
  }

  async setup({ adapter }) {
    try {
      if (!adapter) {
        throw new Error('Oracle configuration missing');
      }

      const { settings } = adapter;

      this._settings = settings || {};
      this._driver = this._dependencies.oracledb;

      if (!this._driver) {
        throw new Error('oracledb is not registered in customDependencies');
      }

      this._driver.outFormat = this._driver.OUT_FORMAT_OBJECT;
      this._driver.fetchAsString = [this._driver.CLOB];

      this._pool = await this._driver.createPool({
        user: this._settings.user,
        password: this._settings.password,
        connectString: this._settings.connectString,
        poolMin: this._settings.poolMin ?? 1,
        poolMax: this._settings.poolMax ?? 4,
        poolIncrement: this._settings.poolIncrement ?? 1,
      });

      this._console.success(`Client initialized (thin: ${this._driver.thin})`, {
        namespace: this._namespace,
      });

      return this._pool;
    } catch (error) {
      this._console.error('Error setting up Module', { namespace: this._namespace });
      console.error(error);
    }
  }

  /**
   * Executes a read-only statement. Rejects anything that is not SELECT or WITH
   * so a malformed caller cannot reach the database with a write.
   *
   * Pagination lives here because OFFSET/FETCH is Oracle syntax: callers ask
   * for a page, and each provider expresses it in its own dialect.
   */
  async query({ sql, binds = {}, maxRows, page, pageSize } = {}) {
    if (!sql) {
      return this._utilities.io.response.error('Provide a sql statement');
    }

    if (!READ_ONLY_STATEMENT.test(sql)) {
      return this._utilities.io.response.error('Only read statements are allowed');
    }

    if (!this._pool) {
      return this._utilities.io.response.error('Oracle pool is not initialized');
    }

    const paginated = this.#paginate({ sql, binds, page, pageSize });

    let connection = null;
    const startedAt = Date.now();

    try {
      connection = await this._pool.getConnection();
      connection.callTimeout = this._settings.callTimeoutMs ?? 60000;

      const result = await connection.execute(paginated.sql, paginated.binds, {
        maxRows: maxRows ?? this._settings.maxRows ?? 200,
      });

      return this._utilities.io.response.success({
        rows: result.rows || [],
        row_count: (result.rows || []).length,
        timing_ms: Date.now() - startedAt,
        sql: paginated.sql,
        binds: paginated.binds,
      });
    } catch (error) {
      this._console.error(error, { namespace: this._namespace });

      return this._utilities.io.response.error(error.message);
    } finally {
      if (connection) {
        await connection.close().catch(() => {});
      }
    }
  }

  /**
   * Appends the Oracle 12c+ row-limiting clause. Bind names carry a reserved
   * prefix so they cannot collide with the caller's own binds.
   */
  #paginate({ sql, binds, page, pageSize }) {
    if (!pageSize) {
      return { sql, binds };
    }

    const size = Math.max(Number(pageSize) || 0, 1);
    const offset = (Math.max(Number(page) || 1, 1) - 1) * size;

    return {
      sql: `${sql}\n OFFSET :loom_offset ROWS FETCH NEXT :loom_limit ROWS ONLY`,
      binds: { ...binds, loom_offset: offset, loom_limit: size },
    };
  }

  async ping() {
    return this.query({ sql: 'SELECT 1 AS alive FROM dual' });
  }

  async close() {
    if (!this._pool) {
      return;
    }

    await this._pool.close(0).catch(() => {});
    this._pool = null;
  }

  async create() {
    return this._utilities.io.response.error('Oracle adapter is read-only');
  }

  async update() {
    return this._utilities.io.response.error('Oracle adapter is read-only');
  }

  async getByFilters() {
    return this._utilities.io.response.error('Use query() for this adapter');
  }
}

module.exports = OracleDataSource;
