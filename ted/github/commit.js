'use strict';

var Promise = require('bluebird');
var Status = require('./status.js');

/*
 * Constructor. Object represents a github commit.
 */
function Commit(config) {
  if (this instanceof Commit) {
    this.config = config;
    this.client = config.client;
    this.ref = config.ref;
    this.message = config.message || '';
    this.repo = config.repo;
    this.api = config.api;
  } else {
    return new Commit(config);
  }
}

/*
 * Return an object representing this objects informative state.
 */
Commit.prototype.info = function() {
  var self = this;
  return Promise.resolve({
    ref: self.ref,
    message: self.message
  });
};

/*
 * Create a github status for this commit.
 */
Commit.prototype.createStatus = function(opts) {
  var self = this;
  opts.ref = self.ref;
  opts.repo = self.repo;
  opts.commit = self;
  var status = new Status(opts);
  return status.pending()
  .return(status);
};

/*
 * Returns a list of status objects for this commit.
 */
Commit.prototype.statuses = function() {
  var self = this;
  return Promise.fromNode(function(cb) {
    self.repo.api.statuses(self.ref, cb);
  })
  .then(function(results) {
    return results[0];
  })
  .map(function(data) {
    return new Status({
      client: self.client,
      commit: self,
      repo: self.repo,
      state: data.state,
      targetUrl: data.target_url,
      description: data.description,
      context: data.context
    });
  });
};

/*
 * Export constructor.
 */
module.exports = Commit;
