'use strict';

var fs = require('fs');
var os = require('os');
var path = require('path');
var uuid = require('uuid');
var Promise = require('bluebird');
var util = require('util');
var config = require('../config/');

/*
 * Constructor.
 */
function Result(config) {
  if (this instanceof Result) {
    this.config = config;
    this.id = config.id;
    // Make sure results get saved to temp directory.
    this.path = path.join(os.tmpdir(), config.id + '.json');
  } else {
    return new Result(config);
  }
}

/*
 * Returns url for viewing this result.
 */
Result.prototype.url = function() {
  var self = this;
  return util.format(
    'http://%s:%s/result/%s',
    config.slot.server.host,
    config.slot.server.port,
    self.id
  );
};

/*
 * Returns if this result exists or not.
 */
Result.prototype.exists = function() {
  var self = this;
  return Promise.fromNode(function(cb) {
    fs.exists(self.path, function(exists) {
      cb(null, exists);
    });
  });
};

/*
 * Save json data to disk.
 */
Result.prototype.save = function(o) {
  var self = this;
  // Check if result already exists.
  return self.exists()
  .then(function(exists) {
    if (exists) {
      // If result already exists, throw an error.
      throw new Error(util.format('File already exists: %s', self.path));
    }
    // Write result to disk with other meta data.
    return Promise.fromNode(function(cb) {
      var data = JSON.stringify({
        id: self.id,
        data: o,
        stdout: '' // @todo: capture and save stdout.
      });
      fs.writeFile(self.path, data, {encoding: 'utf8'}, cb);
    });
  });
};

/*
 * Load json data from disk.
 */
Result.prototype.load = function() {
  var self = this;
  // Read result file.
  return Promise.fromNode(function(cb) {
    fs.readFile(self.path, {encoding: 'utf8'}, cb);
  })
  // Parse contents into json.
  .then(function(data) {
    return JSON.parse(data);
  });
};

/*
 * Create and return a new result with a random uuid.
 */
function create() {
  return Promise.try(function() {
    var id = uuid.v4();
    return new Result({
      id: id
    });
  });
}

/*
 * Get a result object with given id.
 */
function get(id) {
  return new Result({
    id: id
  });
}

/*
 * Export api.
 */
module.exports = {
  create: create,
  get: get
};
