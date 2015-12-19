#!/usr/bin/env node

var Batch = require('./batch.js');
var Promise = require('bluebird');
var argv = require('yargs').argv;

// Use a default file if one isn't given.
var file = argv.f || './config.yml';
// Default to not being verbose.
var verbose = argv.v || false;

// Load batch from file.
Batch.fromYamlFile(file)
.then(function(batch) {

  // Fancy write function so we can write to stdout without being muted.
  var write = function(s) {
    if (typeof s === 'object') {
      s = JSON.stringify(s);
    }
    if (batch.muted) {
      batch.unmute();
      console.log(s);
      batch.mute();
    } else {
      console.log(s);
    }
  };

  // Report start of batch.
  batch.on('start', function(data) {
    batch.mute();
    write({start: data});
  });

  // Report end of batch.
  batch.on('end', function(data) {
    write({end: data});
    batch.unmute();
  });

  // Write stdout data if we are in verbose mode.
  batch.on('stdout', function(data) {
    if (verbose) {
      write(data);
    }
  });

  // Report test passed.
  batch.on('pass', function(data) {
    write({pass: data});
  });

  // Report test failed.
  batch.on('fail', function(data) {
    write({fail: data});
  });

  // Run batch.
  return batch.run()
  // Exit process with error code 1.
  .then(function(failures) {
    if (failures) {
      process.exit(1);
    }
  });

});
