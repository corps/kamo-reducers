declare var require: any;
let testsContext = require.context(".", true, /\.test\.js$/);
testsContext.keys().forEach(function(m: any) {
  if(m.indexOf("node_modules") !== -1) return;
  testsContext(m);
});
