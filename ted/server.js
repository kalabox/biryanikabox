'use strict';

var express = require('express');
var bodyParser = require('body-parser');
var Promise = require('bluebird');
var Batch = require('./batch.js');

// @todo: comment and clean up.

// Create app.
var app = express();

// Use json body parser plugin.
app.use(bodyParser.json());

/*
job object
{
  start:
  follow:
}
*/

app.post('/test/', function(req, res) {

  console.log('REQUEST: %s', JSON.stringify(req.body));

  res.setHeader('Content-Type', 'applicatin/json; charset=UTF-8');
  res.setHeader('Transfer-Encoding', 'chunked');

  Promise.try(function() {
    if (req.body.yaml) {
      return Batch.fromYaml(req.body.yaml);
    } else if (req.body.json) {
      return new Batch(req.body.json);
    } else {
      throw new Error('Invalid request body: ' + req.body);
    }
  })
  .then(function(batch) {
    var interval = setInterval(function() {
      res.write(JSON.stringify({ping: new Date()}));
    }, 30 * 1000);
    batch.on('progress', function(evt) {
      res.write(JSON.stringify(evt));
    });
    batch.run()
    .then(function() {
      clearInterval(interval);
      res.end();
    });
  });

});

var port = 8080;
Promise.fromNode(function(cb) {
  app.listen(port, cb);
})
.then(function() {
  console.log('Listening on port: %s', port);
});
