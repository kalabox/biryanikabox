'use strict';

var _ = require('lodash');
var Commit = require('./commit.js');
var Repo = require('./repo.js');
var Promise = require('bluebird');
var Batch = require('../batch.js');
var util = require('util');
var yaml = require('../yaml.js');
var results = require('../results.js');
var email = require('kalabox-email')(global.config.email);

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
      ref: config.body.after,
      user: config.body.repository.owner.name,
      repo: config.body.repository.name
    });
    this.commit = new Commit({
      ref: config.body.after,
      repo: this.repo
    });
  } else {
    return new Webhook(config);
  }
}

/*
 * Find out if this webhook should be run based on setup.
 */
Webhook.prototype.shouldRun = function() {
  var self = this;
  var org = self.repo.user;
  var repo = self.repo.repo;
  var orgs = global.config.server.github.orgs;
  /*
   * @todo: we should validate that each and every repo has been setup
   * in the config to catch new repos.
   */
  var shouldRun = (!!orgs[org] && !!orgs[org][repo]);
  console.log('shouldRun=' + shouldRun);
  return shouldRun;
};

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

Webhook.prototype.info = function() {
  var self = this;
  return self.rootStatus.info();
 };

Webhook.prototype.sendEmail = function(opts) {
  var self = this;
  opts = opts || {};
  opts.from = opts.from || 'ted@kalabox.io';
  opts.to = opts.to || '@ci';
  return self.info()
  .then(function(info) {
    opts.text = opts.text || JSON.stringify(info, null, '  ');
    return email.send(opts);
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
  // Download test files from repo.
  .then(function() {
    // Get list of File objects.
    return self.repo.testFiles()
    // Download each file.
    .tap(function(files) {
      return Promise.each(files, function(file) {
        return file.download();
      });
    })
    // Map File objects to just filepaths.
    .map(function(file) {
      return file.path;
    });
  })
  // Load batch from yaml file and add test files to batch.
  .then(function(files) {
    var config = global.config.batch;
    config.files = files;
    return new Batch(config);
  })
  // Subscribe to events and run batch.
  .then(function(batch) {
    // Batch on start.
    batch.on('start', function(data) {
      // Use sync lock.
      withLock(function() {
        // Set total tests, and update status with number of tests.
        totalTests = data.total;
        if (totalTests === 0) {
          throw new Error('Batch doesn\'t have any tests!');
        }
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
      return self.sendEmail({
        subject: 'TED failures'
      });
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
    })
    .then(function() {
      return self.sendEmail({
        subject: 'TED successful'
      });
    });
  })
  // Report errors.
  .catch(function(err) {
    console.log('message: ' + err.message);
    console.log('  stack: ' + err.stack);
  });
};

/*
 * Export constructor.
 */
module.exports = Webhook;
