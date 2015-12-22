'use strict';

var _ = require('lodash');
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
    this.context = _.filter([
      'ci',
      'ted',
      config.context
    ], _.identity).join('/');
  } else {
    return new Status(config);
  }
}

Status.prototype._update = function(opts) {
  var self = this;
  return Promise.fromNode(function(cb) {
    opts.state = opts.state || self.state;
    opts.description = opts.description || self.description;
    opts.context = self.context;
    opts.target_url = self.targetUrl;
    self.repo.api.status(self.commit.sha, opts, cb);
  });
};

Status.prototype.pending = function(opts) {
  opts = opts || {};
  opts.state = 'pending';
  return this._update(opts);
};

Status.prototype.success = function(opts) {
  opts = opts || {};
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
