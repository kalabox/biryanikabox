var Batch = require('./batch.js');

var batch = new Batch({
  files: ['./test1.js']
});

batch.run()
.then(function(result) {
  console.log(JSON.stringify(result, null, '  '));
});
