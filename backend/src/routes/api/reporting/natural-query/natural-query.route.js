class ReportingNaturalQueryRoute {
  constructor(dependencies) {
    /* Base Properties */
    this._dependencies = dependencies;
    this._utilities = this._dependencies.utilities;
    this._console = this._dependencies.console;
    this._services = this._dependencies.services;

    /* Assigments */
    this.EntityService = this._services.ReportingNaturalQueryService;
  }

  /**
   * @swagger
   * /catalog/schema:
   *   get:
   *     summary: Dimensions, domain values and example questions available to the demo.
   *     tags: [Reporting]
   *     responses:
   *       200:
   *         description: Catalog document.
   */
  async getCatalog({ headers, params }) {
    try {
      const entityService = new this.EntityService(this._dependencies);

      return entityService.getCatalog({ headers, data: params });
    } catch (error) {
      this._console.error(error);

      return this._utilities.io.response.error();
    }
  }

  /**
   * @swagger
   * /query/ask:
   *   post:
   *     summary: Interpret a Spanish question, compile it to SQL and run it.
   *     tags: [Reporting]
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               question: { type: string }
   *               spec: { type: object, description: Previous spec, when refining }
   *               dry_run: { type: boolean }
   *               page: { type: integer }
   *               page_size: { type: integer }
   *     responses:
   *       200:
   *         description: Spec, restatement, SQL, answer and rows.
   */
  async ask({ headers, params }) {
    try {
      const entityService = new this.EntityService(this._dependencies);

      return entityService.ask({ headers, data: params });
    } catch (error) {
      this._console.error(error);

      return this._utilities.io.response.error();
    }
  }

  /**
   * @swagger
   * /query/execute:
   *   post:
   *     summary: Compile and run a spec edited by hand. Never calls the model.
   *     tags: [Reporting]
   *     responses:
   *       200:
   *         description: Spec, restatement, SQL, answer and rows.
   */
  async execute({ headers, params }) {
    try {
      const entityService = new this.EntityService(this._dependencies);

      return entityService.execute({ headers, data: params });
    } catch (error) {
      this._console.error(error);

      return this._utilities.io.response.error();
    }
  }

  /**
   * @swagger
   * /query/restate:
   *   post:
   *     summary: Rewrite a spec as a Spanish sentence. Deterministic.
   *     tags: [Reporting]
   *     responses:
   *       200:
   *         description: Normalised spec and its sentence.
   */
  async restate({ headers, params }) {
    try {
      const entityService = new this.EntityService(this._dependencies);

      return entityService.restate({ headers, data: params });
    } catch (error) {
      this._console.error(error);

      return this._utilities.io.response.error();
    }
  }
}

module.exports = ReportingNaturalQueryRoute;
