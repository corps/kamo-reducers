export = function (config: any) {
  config.set({
    files: [
      {pattern: '*.test.js', watched: false},
      {pattern: '*/*.test.js', watched: false},
    ],

    frameworks: ['qunit'],
    plugins: ['karma-qunit', 'karma-webpack', 'karma-jsdom-launcher'],

    preprocessors: {
      // add webpack as preprocessor
      '*.test.js': ['webpack'],
      '*/*.test.js': ['webpack'],
    },

    webpack: {
      output: {
        pathinfo: true,
        publicPath: '/',
      },
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