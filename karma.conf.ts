export = function (config: any) {
  config.set({
    frameworks: ['qunit'],
    browsers: ['Chrome'],
    plugins: ['karma-qunit', 'karma-webpack', 'karma-chrome-launcher'],

    preprocessors: {
      // add webpack as preprocessor
      'tests.js': ['webpack'],
    },

    files: [
      'tests.js',
    ],

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