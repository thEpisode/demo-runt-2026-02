const definition = {
  cache: [
    {
      name: 'cacheTemplate',
      route: '/functions/cache/_template/_template.function',
      storage: 'RAM',
      expire: 'never',
    },
  ],
  timed: [
    {
      name: 'timedTemplate',
      route: '/functions/timed/_template/_template.function',
      startAt: '23:59:59',
      intervalTime: '24',
      intervalMeasure: 'hours',
    },
  ],
  startup: [
    {
      name: 'startupTemplate',
      route: '/functions/startup/_template/_template.function',
      executionType: 'onServerLoaded',
    },
    {
      // 'atTime' runs during boot. The alternative waits on the internal event
      // bus, which is disabled in this service, so the function would never run.
      name: 'webClient',
      route: '/functions/startup/web-client/web-client.function',
      executionMode: 'atTime',
    },
  ],
};

module.exports = definition;
