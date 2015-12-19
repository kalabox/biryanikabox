'use strict';

var express = require('express');
var bodyParser = require('body-parser');
var Promise = require('bluebird');
var Batch = require('./batch.js');
var argv = require('yargs').argv;
var github = request('./github.js');

// Create app.
var app = express();

// Use json body parser plugin.
app.use(bodyParser.json());

app.post('/pull-request', function(req, res) {
  // Great new github request.
  Promise.try(function() {
    return github.request({
      headers: req.headers,
      body: req.body
    });
  })
  // End the response, things will be asynchronous from here on.
  .tap(function() {
    res.end();
  })
  // Report error back to github.
  .catch(function(err) {
    res.json({err: err.message});
    res.status(500);
    throw err;
  })
  // Run github request.
  .then(function(ghreq) {
    return ghreq.run();
  });
});

/*
 * POST request that runs a batch of tests.
 */
app.post('/batch/', function(req, res) {

  // Respond with json data.
  res.setHeader('Content-Type', 'applicatin/json; charset=UTF-8');
  // Respond with chunked encoding so response stays open.
  res.setHeader('Transfer-Encoding', 'chunked');

  // Promise chain to hold response write completions.
  var writes = Promise.resolve();
  // Write helper function.
  function write(json) {
    writes = writes.then(function() {
      return Promise.fromNode(function(cb) {
        res.write(JSON.stringify(json), cb);
      });
    });
  }

  // Load batch config.
  Promise.try(function() {
    if (req.body.yaml) {
      return Batch.fromYaml(req.body.yaml);
    } else if (req.body.json) {
      return new Batch(req.body.json);
    } else {
      throw new Error('Invalid request body: ' + req.body);
    }
  })
  // Run batch.
  .then(function(batch) {
    // Send pings to stop response from timing out.
    var interval = setInterval(function() {
      write({
        ping: new Date()
      })
    }, 5 * 1000);
    // Write progress events back.
    batch.on('progress', function(evt) {
      write(evt);
    });
    // Run batch
    return batch.run()
    // Cleanup.
    .then(function() {
      // Stop pinging.
      clearInterval(interval);
      // Wait for writes to complete.
      return writes.then(function() {
        // End response.
        res.end();
      });
    });
  })
  // Handle errors.
  .catch(function(err) {
    write({err: err.message});
    res.status(500);
  });

});

// Configure port.
var port = argv.p || 8080;
// Start listening.
Promise.try(function() {
  return Promise.fromNode(function(cb) {
    app.listen(port, cb);
  })
  .then(function() {
    console.log('Listening on port: %s', port);
  });
});
