'use strict';

var _ = require('lodash');
var Commit = require('./commit.js');
var Repo = require('./repo.js');
var Promise = require('bluebird');

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

Webhook.prototype.init = function() {
  var self = this;
  return self.commit.createStatus({
    description: 'TED testing pending.'
  })
  .tap(function(status) {
    self.masterStatus = status;
  });
};

Webhook.prototype.run = function() {
  var self = this;
  var tests = [
    'test1',
    'test2',
    'test3',
    'test4',
    'test5'
  ];
  return Promise.map(tests, function(test) {
    return self.commit.createStatus({
      description: test,
      targetUrl: 'http://www.google.com',
      context: test
    })
    .tap(function(status) {
      console.log(status.context);
      //console.log(JSON.stringify(status, null, ''));
    });
  })
  .delay(60 * 1000)
  .each(function(status) {
    return Promise.try(function() {
      var n = _.random(1, 100);
      if (n > 95) {
        return status.failure({
          description: err.message
        });
      } else {
        return status.success({
          description: 'Passed.'
        });
      }
    })
    .delay(20 * 1000);
  })
  .catch(function(err) {
    return self.masterStatus.failure({
      description: err.message
    })
    .then(function() {
      throw err;
    });
  })
  .then(function() {
    return self.masterStatus.success({
      description: 'OK!'
    });
  });
};

module.exports = Webhook;
