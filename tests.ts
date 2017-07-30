declare var require: any;
let testsContext = require.context(".", true, /\.test\.js$/);
testsContext.keys().forEach(testsContext);
