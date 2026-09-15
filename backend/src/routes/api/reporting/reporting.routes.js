const ROUTE = '/routes/api/reporting/natural-query/natural-query.route';

module.exports = {
  catalog: [
    { method: 'GET', httpRoute: '/schema', route: ROUTE, handler: 'getCatalog', protected: false },
  ],
  query: [
    { method: 'POST', httpRoute: '/ask', route: ROUTE, handler: 'ask', protected: false },
    { method: 'POST', httpRoute: '/execute', route: ROUTE, handler: 'execute', protected: false },
    { method: 'POST', httpRoute: '/restate', route: ROUTE, handler: 'restate', protected: false },
  ],
};
