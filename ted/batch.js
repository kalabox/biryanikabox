'use strict';

var _ = require('lodash');
var Promise = require('bluebird');
var exec = require('child_process').exec;
var VError = require('verror');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var env = require('./env.js');
var yaml = require('./yaml.js');
var fs = require('fs');
var JSONStream = require('json-stream');

/*
 * Constructor: a batch is a group of tests run together.
 */
function Batch(config) {
  this.name = config.name;
  this.reporter = config.reporter || 'json-stream';
  this.files = config.files;
  this.tags = config.tags;
  EventEmitter.call(this);
}
util.inherits(Batch, EventEmitter);

/*
 * Run batch through mocha and return json results.
 */
Batch.prototype.run = function() {
  var self = this;
  // Add each of the batches tags process.env.
  return Promise.try(function() {
    env.vms.reset();
    _.each(self.tags, function(tag) {
      env.vms.add(tag);
    })
  })
  // Execute mocha cli command.
  .then(function() {
    // Build command.
    var cmd = [
      'mocha',
      '-R', self.reporter,
      '--require', './globals.js',
      '--timeout', 20 * 60 * 1000
    ];
    // Add files to test.
    cmd = cmd.concat(self.files);
    cmd = cmd.join(' ');
    // Execute!
    return exec(cmd, {
      maxBuffer: 8 * 1000 * 1024
    });
  })
  // Handle events and end.
  .then(function(ps) {
    // This will later on be set by and end event and returned with promise.
    var result = null;
    ps.stderr.on('data', function(data) {
      console.log('ERR: %s',data);
    });
    var eventStream = JSONStream();
    ps.stdout.pipe(eventStream);
    // Handle lines of data coming back from child process.
    eventStream.on('data', function(data) {
      // Validate parsing of the data.
      if (data.length !== 2) {
        self.emit('foo', data);
      } else {
        // Build event object.
        var key = data[0];
        var val = data[1];
        var evt = {};
        evt[key] = val;
        if (key === 'end') {
          // Set result here so it can be returned with promise.
          result = val;
        }
        // Emit progress event.
        self.emit('progress', evt);
      }
    });
    // Fulfill promise based on child process behavior.
    return Promise.fromNode(function(cb) {
      ps.on('error', cb);
      ps.on('exit', function() {
        // Emit exit event.
        self.emit('end');
        // Fulfill promise after call stack has completed.
        process.nextTick(function() {
          cb(null, result);
        });
      });
    });
  })
  // Emit error event.
  .catch(function(err) {
    self.emit('error', err);
    throw err;
  });
};

/*
 * Return an instance of a batch from yaml data.
 */
Batch.fromYaml = function(data) {
  // Parse yaml data.
  return yaml.parse(data)
  // Return new instance.
  .then(function(config) {
    return new Batch(config);
  })
};

/*
 * Return an instance of a batch from a yaml filepath.
 */
Batch.fromYamlFile = function(file) {
  var self = this;
  // Read and parse yaml file.
  return yaml.parseFile(file)
  // Return an instance of a batch from yaml data.
  .then(function(config) {
    return new Batch(config);
  });
};

/*
 * Export the constructor.
 */
module.exports = Batch;
