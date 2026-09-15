const express = require('express');
const fs = require('fs');
const path = require('path');

// The client routes are declared rather than matched with a catch-all: a
// catch-all registered here would run before the API routes and swallow them.
const CLIENT_ROUTES = ['/', '/buscador', '/asistente', '/constructor'];

class Function {
  constructor(dependencies) {
    /* Base Properties */
    this._dependencies = dependencies;
    this._utilities = this._dependencies.utilities;
    this._console = this._dependencies.console;

    /* Custom Properties */
    this._express = this._dependencies.express;
    this._webDirectory = path.resolve(this._dependencies.root, '..', 'web');

    /* Assigments */
    this._namespace = '[Function]::[Startup]::[WebClient]';
  }

  /**
   * Serves the compiled client from the same process and port as the API, so
   * the packaged demo is a single command and there is no cross-origin hop.
   * Skipped when the build is absent, which is the case while developing
   * against the Vite dev server.
   */
  async run() {
    const indexFile = path.join(this._webDirectory, 'index.html');

    if (!fs.existsSync(indexFile)) {
      this._console.info('No web build found, serving API only', {
        namespace: this._namespace,
      });
      return;
    }

    // Static assets fall through when the file does not exist, so this is safe
    // to register before the API routes.
    this._express.use(express.static(this._webDirectory, { index: false }));

    for (const route of CLIENT_ROUTES) {
      this._express.get(route, (_request, response) => response.sendFile(indexFile));
    }

    this._console.success(`Serving web client from ${this._webDirectory}`, {
      namespace: this._namespace,
    });
  }
}

module.exports = Function;
