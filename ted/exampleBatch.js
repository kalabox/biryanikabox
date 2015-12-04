var Batch = require('./batch.js');

return Batch.fromYamlFile('./config.yml')
.then(function(batch) {
  batch.on('progress', function(evt) {
    console.log(evt);
  });
  return batch.run()
  .tap(function(result) {
    // Do something with the result object.
  });
});
