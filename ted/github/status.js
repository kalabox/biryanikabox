'use strict';

var Promise = require('bluebird');

function Status(config) {
  if (this instanceof Status) {
    this.config = config;
    //this.targetUrl = '';
    //this.description = '';
    //this.context = '';
    this.id = config.id,
    this.repo = config.repo,
    this.github = config.github;
  } else {
    return new Status(config);
  }
}

Status.prototype._update = function(state) {
  var self = this;
  return Promise.fromNode(function(cb) {
    self.github.api.statuses.create({
      user: self.repo.user,
      repo: self.repo.repo,
      sha: self.id,
      state: state
    }, cb);
  });
};

Status.prototype.get = function() {
  return github.get();
};

Status.prototype.pending = function() {
  return this._update('pending');
};

Status.prototype.success = function() {
  return this._update('success');
};

Status.prototype.error = function() {
  return this._update('error');
};

Status.prototype.failure = function() {
  return this._update('failure');
};

module.exports = Status;
