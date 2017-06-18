export = function (config: any) {
  config.set({
    files: [
      {pattern: 'test/*.test.js', watched: false},
    ],

    frameworks: ['qunit'],
    plugins: ['karma-qunit'],

    preprocessors: {
      // add webpack as preprocessor
      'test/*.test.js': ['webpack'],
    },

    webpack: {
    },

    webpackMiddleware: {
      // webpack-dev-middleware configuration
      // i. e.
      stats: 'errors-only'
    },

    beforeMiddleware: ['webpackBlocker'],

    client: {
      clearContext: false,
      qunit: {
        showUI: true,
        testTimeout: 5000
      }
    }
  })
}