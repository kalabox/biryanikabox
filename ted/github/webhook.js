'use strict';

var _ = require('lodash');
var Commit = require('./commit.js');
var Repo = require('./repo.js');
var Promise = require('bluebird');
var Batch = require('../batch.js');
var util = require('util');
var yaml = require('../yaml.js');
var results = require('../results.js');
var config = require('../config.json');

/*
 * Constructor.
 */
function Webhook(config) {
  if (this instanceof Webhook) {
    this.config = config;
    this.client = config.client;
    this.headers = config.headers;
    this.body = config.body;
    this.kind = config.headers['x-github-event'];
    this.repo = new Repo({
      client: config.client,
      user: config.body.repository.owner.name,
      repo: config.body.repository.name
    });
    this.commit = new Commit({
      sha: config.body.after,
      repo: this.repo
    });
  } else {
    return new Webhook(config);
  }
}

/*
 * Initialize webhook.
 */
Webhook.prototype.init = function() {
  var self = this;
  // Create a new github status.
  return self.commit.createStatus({
    description: 'TED testing pending.'
  })
  .tap(function(status) {
    self.rootStatus = status;
  });
};

/*
 * Run webhook batch.
 */
Webhook.prototype.run = function() {
  var self = this;
  // Save total number of tests.
  var totalTests = 0;
  // Lock object for syncing operations from synchronous events.
  var lock = Promise.resolve();
  // Helper function for adding something to promise chain that is the lock.
  function withLock(fn) {
    lock = lock.then(fn);
  }
  // Object for storing current test info.
  var cursor = {
    count: 0
  };
  // Set root status to pending.
  return self.rootStatus.pending({
    description: 'TED loading tests.'
  })
  // Load batch from yaml file.
  .then(function() {
    // @todo: make this be injected into run or from config in constructor.
    return Batch.fromYamlFile('./config.yml');
  })
  // Subscribe to events and run batch.
  .then(function(batch) {
    // Batch on start.
    batch.on('start', function(data) {
      // Use sync lock.
      withLock(function() {
        // Set total tests, and update status with number of tests.
        totalTests = data.total;
        return self.rootStatus.pending({
          description: util.format('TED running %s tests.', data.total)
        });
      });
    });
    // Batch on test pass.
    batch.on('pass', function(data) {
      // Use sync lock.
      withLock(function() {
        cursor.count += 1;
        // Create a new github status.
        return self.commit.createStatus({
          description: data.fullTitle,
          context: util.format('test-%s', cursor.count)
        })
        // Update status to success state along with result.
        .then(function(status) {
          return status.success({
            result: {pass: data},
          });
        });
      });
    });
    // Batch on test fail.
    batch.on('fail', function(data) {
      // Use sync lock.
      withLock(function() {
        cursor.count += 1;
        // Create a new github status.
        return self.commit.createStatus({
          description: data.fullTitle,
          context: util.format('test-%s', cursor.count)
        })
        // Update status to a failure state along with result.
        .then(function(status) {
          return status.failure({
            result: {fail: data}
          });
        });
      });
    });
    // Run batch.
    return batch.run()
    // Wait on the sync lock.
    .tap(function() {
      return lock;
    })
    // Throw an error if there are failures.
    .then(function(failures) {
      if (failures > 0) {
        throw new Error(util.format('%s tests failed!', failures));
      }
    });
  })
  // Update root status to a failure along with a result.
  .catch(function(err) {
    return self.rootStatus.failure({
      description: err.message,
      result: {
        error: {
          msg: err.message,
          stack: err.stack
        }
      }
    })
    .then(function() {
      throw err;
    });
  })
  // Update root status to success along with a result.
  .then(function(data) {
    return self.rootStatus.success({
      description: 'TED testing successful!',
      result: {success: data}
    });
  })
  // Report errors.
  .catch(function(err) {
    console.log(err.message);
  });
};

/*
 * Export constructor.
 */
module.exports = Webhook;
