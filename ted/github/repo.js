'use strict';

var util = require('util');
var Status = require('./status.js');
var Promise = require('bluebird');
var File = require('./file.js');

/*
 * Constructor. Repo represents a github repo.
 */
function Repo(config) {
  if (this instanceof Repo) {
    this.config = config;
    this.client = config.client;
    this.user = config.user;
    this.repo = config.repo;
    this.name = util.format('%s/%s', config.user, config.repo);
    this.api = config.client.repo(this.name);
  } else {
    return new Repo(config);
  }
}

/*
 * Returns an array of File objects for each ted file in repo.
 */
Repo.prototype.testFiles = function() {
  var self = this;
  // Get meta data about contents of ted directory in repo.
  return Promise.fromNode(function(cb) {
    self.api.contents('ted', cb);
  })
  // Return just the json data.
  .then(function(results) {
    // @todo: check for errors here?
    return results[0];
  })
  // Map each chunk of meta data to a File object.
  .map(function(data) {
    return new File(data);
  });
};

Repo.prototype.hooks = function() {
  var self = this;
  return Promise.fromNode(function(cb) {
    self.api.hooks(cb);
  })
  // Return just the json data.
  .then(function(results) {
    // @todo: check for errors here?
    return results[0];
  });
};

/*
 * Export constructor.
 */
module.exports = Repo;
