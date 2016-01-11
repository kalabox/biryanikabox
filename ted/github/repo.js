'use strict';

var util = require('util');
var Status = require('./status.js');
var Promise = require('bluebird');
var File = require('./file.js');
var VError = require('verror');

/*
 * Constructor. Repo represents a github repo.
 */
function Repo(config) {
  if (this instanceof Repo) {
    this.config = config;
    this.client = config.client;
    this.user = config.user;
    this.repo = config.repo;
    this.ref = config.ref;
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
  var dir = 'ted';
  // Get meta data about contents of ted directory in repo.
  return Promise.try(function() {
    // Get meta data.
    return Promise.fromNode(function(cb) {
      self.api.contents(dir, self.ref, cb);
    })
    // Return just the json data.
    .then(function(results) {
      return results[0];
    })
    // Handle and wrap errors.
    .catch(function(err) {
      if (err.message === 'Not Found') {
        // Directory exists, return empty array.
        return [];
      } else {
        // Wrap errors.
        throw new VError(err, 'Error getting repo contents: %s', dir);
      }
    });
  })
  // Map each chunk of meta data to a File object.
  .map(function(data) {
    return new File(data);
  });
};

/*
 * Returns an object representing this repos state.
 */
Repo.prototype.info = function() {
  var self = this;
  return Promise.resolve({
    name: self.name
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
