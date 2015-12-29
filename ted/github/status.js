'use strict';

var _ = require('lodash');
var Promise = require('bluebird');
var util = require('util');
var results = require('../results.js');

/*
 * Constructor.
 */
function Status(config) {
  if (this instanceof Status) {
    this.config = config;
    this.client = config.client;
    this.commit = config.commit;
    this.repo = config.repo;
    this.state = config.state || 'pending';
    this.targetUrl = config.targetUrl;
    this.description = config.description;
    this.context = _.filter([
      'ci',
      'ted',
      config.context
    ], _.identity).join('/');
  } else {
    return new Status(config);
  }
}

/*
 * Update status object with github status.
 */
Status.prototype._update = function(opts) {
  var self = this;
  // If options includes a result object, then save it to disk.
  return Promise.try(function() {
    if (opts.result) {
      return self.saveResult(opts.result);
    }
  })
  // Update github status.
  .then(function(result) {
    return Promise.fromNode(function(cb) {
      opts.state = opts.state || self.state;
      opts.description = opts.description || self.description;
      opts.target_url = result ? result.url() : null;
      opts.context = self.context;
      self.repo.api.status(self.commit.sha, opts, cb);
    });
  });
};

/*
 * Update status with a pending state.
 */
Status.prototype.pending = function(opts) {
  opts = opts || {};
  opts.state = 'pending';
  return this._update(opts);
};

/*
 * Update status with a success state.
 */
Status.prototype.success = function(opts) {
  opts = opts || {};
  opts.state = 'success';
  return this._update(opts);
};

/*
 * Update status with an error state.
 */
Status.prototype.error = function(err) {
  var opts = {
    state: 'error',
    description: err.message
  };
  return this._update(opts);
};

/*
 * Update status with a failure state.
 */
Status.prototype.failure = function(opts) {
  opts = opts || {};
  opts.state = 'failure';
  return this._update(opts);
};

/*
 * Create and save a result to disk.
 */
Status.prototype.saveResult = function(data) {
  return results.create()
  .tap(function(result) {
    return result.save(data);
  });  
};

/*
 * Export constructor.
 */
module.exports = Status;
