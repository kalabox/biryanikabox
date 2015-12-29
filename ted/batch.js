'use strict';

var path = require('path');
var _ = require('lodash');
var Promise = require('bluebird');
var exec = require('child_process').exec;
var VError = require('verror');
var util = require('util');
var EventEmitter = require('events').EventEmitter;
var yaml = require('./yaml.js');
var fs = require('fs');
var JSONStream = require('json-stream');
var Mocha = require('mocha');
var path = require('path');
var reporter = require('./tedReporter.js');

/*
 * Constructor: a batch is a group of tests run together.
 */
function Batch(config) {
  if (this instanceof Batch) {
    this.config = config;
    this.name = this.config.name;
    this.files = this.config.files;
    this.sha = this.config.sha || 'HEAD';
    this.tags = this.config.tags;
    this.config.timeout = this.config.timeout || 20 * 60 * 1000;
    this.write = process.stdout.write;
    this.mocha = new Mocha({
      reporter: reporter,
      events: this,
      timeout: this.config.timeout
    });
    this.muted = false;
    EventEmitter.call(this);
  } else {
    return new Batch(config);
  }
}
util.inherits(Batch, EventEmitter);

/*
 * Mute data being sent to process.stdout and instead emit a stdout event.
 */
Batch.prototype.mute = function() {
  var self = this;
  self.muted = true;
  return process.stdout.write = function (chunk, encoding, callback) {
    // Argument flipping.
    if (typeof encoding === 'function') {
      callback = encoding;
      encoding = undefined;
    }
    // Emit stdout event
    self.emit('stdout', chunk);
    // Use callback if it's been given.
    if (callback) {
      callback();
    }
  };
};

/*
 * Unmute data being sent to process.stdout.
 */
Batch.prototype.unmute = function() {
  this.muted = false;
  process.stdout.write = this.write;
};

/*
 * Load tags into env.
 */
Batch.prototype.loadTags = function() {
  global.ted.state.sha = this.sha;
  global.ted.state.vms = [];
  _.each(this.tags, function(tag) {
    global.ted.state.vms.push(tag);
  });
};

/*
 * Load globals that will be used by the test scripts.
 */
Batch.prototype.loadGlobals = function() {
  require('./globals');
};

/*
 * Load a test file.
 */
Batch.prototype.loadFile = function(filepath) {
  /*
   * Module's cache needs to be cleared for this file so that in the next
   * batch it will get loaded again by mocha. This is a work around for a
   * bug in running mocha programmatically.
   */
  // Get absolute path to file.
  var file = path.resolve(filepath);
  // Clear the cache for the file.
  delete require.cache[file];
  // Add the file.
  this.mocha.addFile(file);
};

/*
 * Run batch of files and tags through mocha.
 */
Batch.prototype.run = function() {

  // Save this reference.
  var self = this;

  // Load globals.
  self.loadGlobals();

  // Load tags.
  self.loadTags();

  // Load test files.
  _.each(self.files, function(filepath) {
    return self.loadFile(filepath);
  });

  // Run mocha and collect failures.
  return Promise.fromNode(function(cb) {
    self.mocha.run(function(failures) {
      cb(null, failures);
    });
  })
  // Make sure process.stdout get unmuted.
  .finally(function() {
    self.unmute();
  });

};

/*
 * Return an instance of a batch from yaml data.
 */
Batch.fromYaml = function(data) {
  // Parse yaml data.
  return yaml.parse(data)
  // Return new instance.
  .then(function(config) {
    return new Batch(config);
  });
};

/*
 * Return an instance of a batch from a yaml filepath.
 */
Batch.fromYamlFile = function(file) {
  // Read and parse yaml file.
  return yaml.parseFile(file)
  // Return an instance of a batch from yaml data.
  .then(function(config) {
    return new Batch(config);
  });
};

/*
 * Export the constructor.
 */
module.exports = Batch;
