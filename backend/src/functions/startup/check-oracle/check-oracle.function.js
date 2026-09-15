class Function {
  constructor(dependencies) {
    /* Base Properties */
    this._dependencies = dependencies;
    this._utilities = this._dependencies.utilities;
    this._console = this._dependencies.console;

    /* Custom Properties */
    this._database = this._dependencies?.database?.default?.adapter;
    this._settings =
      this._dependencies?.config?.modules?.database?.providers?.oracle?.settings || {};

    /* Assigments */
    this._namespace = '[Function]::[Startup]::[Check]::[Oracle]';
  }

  /**
   * Reports the database state into the log at boot, so a log someone sends us
   * already answers whether the connection works instead of costing another
   * round of commands on a machine we cannot reach.
   */
  async run() {
    const target = `${this._settings.user}@${this._settings.connectString}`;

    if (!this._database?.query) {
      this._console.error(`FALLA · no hay adaptador de base de datos configurado`, {
        namespace: this._namespace,
      });
      return;
    }

    const response = await this._database.query({ sql: 'SELECT 1 AS ALIVE FROM dual', maxRows: 1 });

    if (!this._utilities.validator.response(response)) {
      this._console.error(`FALLA · ${target} · ${response.message}`, {
        namespace: this._namespace,
      });
      return;
    }

    this._console.success(`OK · ${target} · ${response.result.timing_ms} ms`, {
      namespace: this._namespace,
    });
  }
}

module.exports = Function;
