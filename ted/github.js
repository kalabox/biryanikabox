'use strict';

var _ = require('lodash');
var githubApi = require('octonode');
var Org = require('./github/org.js');
var Webhook = require('./github/webhook.js');

function Github(config) {
  if (this instanceof Github) {
    this.config = config;
    this.token = config.token;
    this.client = githubApi.client(config.token);
  } else {
    return new Github(config);
  }
}

/*
 * Creates a runnable webhook or return an empty promise if certain
 * requirements like the github event are not met.
 */
Github.prototype.createWebhook = function(req) {
  var self = this;
  // Get the github event type.
  var event = req.headers['x-github-event'];
  // Output the github event type.
  console.log('Github event: ' + event);
  if (_.contains(global.config.server.github.events, event)) {
    // Github event type is runnable so create and return a webhook.
    var webhook = new Webhook({
      client: self.client,
      headers: req.headers,
      body: req.body
    });
    return Promise.resolve(webhook);
  } else {
    // Github event type is not runnable so return an empty promise.
    console.log('Not a runnable github event: ' + event);
    return Promise.resolve();
  }
};

Github.prototype.org = function(name) {
  var self = this;
  return new Org({
    client: self.client,
    name: name
  });
};

module.exports = Github;
