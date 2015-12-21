'use strict';

var Promise = require('bluebird');
var GithubApi = require('github');
var Repo = require('./github/repo.js');
var Webhook = require('./github/webhook.js');

function Github(config) {
  if (this instanceof Github) {
    this.config = config;
    this.clientId = config.key;
    this.clientSecret = config.secret;
    this.api = new GithubApi({
      version: '3.0.0',
      protocol: 'https',
      host: 'api.github.com',
      timeout: 5 * 1000,
      headers: {
        'user-agent': 'kalabox-ted'
      }
    });
  } else {
    return new Github(config);
  }
}

Github.prototype.auth = function() {
  var self = this;
  return Promise.try(function() {
    self.api.authenticate({
      type: 'oauth',
      key: self.clientId,
      secret: self.clientSecret
    });
  });
};

Github.prototype.repo = function(user, repo) {
  var self = this;
  return new Repo({
    user: user,
    repo: repo,
    github: self
  });
};

Github.prototype.webhook = function(headers, body) {
  var self = this;
  return new Webhook({
    headers: headers,
    body: body,
    github: self
  });
};

module.exports = Github;
