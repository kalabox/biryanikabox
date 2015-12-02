'use strict';

var _ = require('lodash');
var Promise = require('bluebird');
var exec = require('child_process').exec;
var VError = require('verror');
var util = require('util');
var EventEmitter = require('events').EventEmitter;

/*
 * Constructor: a batch is a group of tests run together.
 */
function Batch(config) {
  this.reporter = config.reporter || 'json-stream';
  this.files = config.files;
  EventEmitter.call(this);
}
util.inherits(Batch, EventEmitter);

/*
 * Run batch through mocha and return json results.
 */
Batch.prototype.run = function() {
  var self = this;
  // Execute mocha cli command.
  return Promise.try(function() {
    // Build command.
    var cmd = [
      'mocha',
      '-R', self.reporter,
    ];
    // Add files to test.
    cmd = cmd.concat(self.files);
    cmd = cmd.join(' ');
    // Execute!
    return exec(cmd);
  })
  // Handle events and end.
  .then(function(ps) {
    // This will later on be set by and end event and returned with promise.
    var result = null;
    // Handle lines of data coming back from child process.
    ps.stdout.on('data', function(data) {
      // Parse line data.
      var parts = JSON.parse(data);
      // Validate parsing of the data.
      if (parts.length !== 2) {
        throw new Error(util.format('Invalid event data: "%s"', data));
      }
      // Build event object.
      var key = parts[0];
      var val = parts[1];
      var evt = {};
      evt[key] = val;
      if (key === 'end') {
        // Set result here so it can be returned with promise.
        result = val;
      }
      // Emit progress event.
      self.emit('progress', evt);
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
 * Export the constructor.
 */
module.exports = Batch;
