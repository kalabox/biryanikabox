'use strict';

var express = require('express');
var bodyParser = require('body-parser');
var Promise = require('bluebird');
var Batch = require('./batch.js');
var argv = require('yargs').argv;
var path = require('path');
var config = require('../config/');
var results = require('./results.js');
var Github = require('./github.js');

// Create app.
var app = express();

// Use json body parser plugin.
app.use(bodyParser.json());

// Job chain.
var jobs = Promise.resolve();

function queueJob(fn) {
  jobs = jobs.then(fn);
}

var github = function() {
  return new Github({
    token: config.slot.server.github.token
  });
};

/*
 * Respond to a status ping from a monitor server.
 */
app.get('/status', function(req, res) {
  res.json({status: 'OK'});
});

/*
 * Respond with a json result object read from disk.
 */
app.get('/result/:id', function(req, res) {
  // Get id of result being requested.
  var id = req.params.id;
  // Get result object.
  var result = results.get(id);
  // Check if result exists.
  return result.exists()
  .then(function(exists) {
    if (!exists) {
      // If result does not exist respond with a 404.
      res.status(404);
      res.end();
    } else {
      // If result does exist load from disk and send in response.
      return result.load()
      .then(function(data) {
        res.json(data);
        res.end();
      });
    }
  })
  // Handle errors.
  .catch(function(err) {
    res.status(500);
    res.json({err: err.message});
    res.end();
  });
});

app.post('/github/webhook', function(req, res) {
  // Add job to the job queue.
  return github().createWebhook(req)
  .then(function(webhook) {
    if (webhook && webhook.shouldRun()) {
      return webhook.init()
      .then(function() {
        return queueJob(function() {
          return webhook.run();
        });
      });
    }
  })
  // There was a problem.
  .catch(function(err) {
    res.status(500);
    res.json({status: {err: err.message}});
    res.end();
    throw err;  
  })
  // Everything should be ok.
  .then(function() {
    res.status(200);
    res.json({status: 'OK'});
    res.end();
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

// Start listening.
Promise.try(function() {
  console.log('Loading config slot: ' + argv.slot);
  return config.load({
    slot: argv.slot
  })
  .then(function() {
    var port = config.slot.server.port;
    return Promise.fromNode(function(cb) {
      app.listen(port, cb);
    })
    .then(function() {
      console.log('Listening on port: %s', port);
    });
  });
});
