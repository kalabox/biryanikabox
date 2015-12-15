var Batch = require('./batch.js');

return Batch.fromYamlFile('./config.yml')
.then(function(batch) {
  batch.on('progress', function(evt) {
    console.log(evt);
  });
  batch.on('foo', function(data) {
    console.log(data);
  });
  return batch.run()
  .tap(function(result) {
    // Do something with the result object.
  });
});
