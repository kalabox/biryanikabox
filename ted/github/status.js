'use strict';

var Promise = require('bluebird');
var util = require('util');

function Status(config) {
  if (this instanceof Status) {
    this.config = config;
    this.client = config.client;
    this.commit = config.commit;
    this.repo = config.repo;
    this.state = 'pending';
    this.targetUrl = config.targetUrl;
    this.description = config.description;
    this.context = config.context;
  } else {
    return new Status(config);
  }
}

Status.prototype._update = function(opts) {
  var self = this;
  return Promise.fromNode(function(cb) {
    if (opts.state) {
      self.state = opts.state;
    }
    if (opts.description) {
      self.description = opts.description;
    }
    self.repo.api.status(self.commit.sha, opts, cb);
  });
};

Status.prototype.pending = function(opts) {
  opts.state = 'pending';
  return this._update(opts);
};

Status.prototype.success = function(opts) {
  opts.state = 'success';
  return this._update(opts);
};

Status.prototype.error = function(err) {
  var opts = {
    state: 'error',
    description: err.message
  };
  return this._update(opts);
};

Status.prototype.failure = function(err) {
  var opts = {
    state: 'failure',
    description: err.message
  };
  return this._update(opts);
};

module.exports = Status;
