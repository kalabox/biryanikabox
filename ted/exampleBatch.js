var Batch = require('./batch.js');

var batch = new Batch({
  files: [
    './test1.js',
    './test2.js'
  ]
});

batch.on('progress', function(evt) {
  console.log('EVT: ' + JSON.stringify(evt, null, '  '));
});

batch.run()
.then(function(result) {
  console.log(JSON.stringify(result, null, '  '));
});
