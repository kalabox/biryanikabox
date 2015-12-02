'use strict';

var Promise = require('bluebird');
var exec = require('child_process').exec;
var VError = require('verror');

/*
 * Constructor: a batch is a group of tests run together.
 */
function Batch(config) {
  this.reporter = config.reporter || 'JSON';
  this.files = config.files;
}

/*
 * Run batch through mocha and return json results.
 */
Batch.prototype.run = function() {
  var self = this;
  // Execute mocha cli command.
  return Promise.fromNode(function(cb) {
    // Build command.
    var cmd = [
      'mocha',
      '-R', self.reporter,
    ];
    // Add files to test.
    cmd = cmd.concat(self.files);
    cmd = cmd.join(' ');
    // Execute!
    exec(cmd, function(err, stdout, stderr) {
      // @todo: not sure if this is the best thing to do here.
      if (err) {
        console.log(stderr);
      }
      cb(null, stdout);
    });
  })
  // Parse and return json results.
  .then(function(data) {
    return Promise.try(function() {
      return JSON.parse(data);
    })
    .catch(function(err) {
      throw new VError(err, 'Failed to parse JSON: %s', data);
    });
  });
};

/*
 * Export the constructor.
 */
module.exports = Batch;
