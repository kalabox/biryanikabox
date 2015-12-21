'use strict';

var github = require('../github.js');

function State() {}

State.pending = 'pending';

State.success = 'success';

State.error = 'error';

State.failure = 'failure';

function Status(config) {
  if (this instanceof Status) {
    this.config = config;
    this.state = State.pending;
    this.targetUrl = '';
    this.description = '';
    this.context = '';
  } else {
    return new Status(config);
  }
}

Status.prototype._update = function(state) {
  return github.post();
};

Status.prototype.get = function() {
  return github.get();
};

Status.prototype.pending = function() {
  return this._update(State.pending);
};

Status.prototype.success = function() {
  return this._update(State.success);
};

Status.prototype.error = function() {
  return this._update(State.error);
};

Status.prototype.failure = function() {
  return this._update(State.failure);
};

module.exports = Status;
