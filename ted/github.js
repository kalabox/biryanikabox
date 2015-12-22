'use strict';

var githubApi = require('octonode');
var webhook = require('./github/webhook.js');

function Github(config) {
  if (this instanceof Github) {
    this.config = config;
    this.token = config.token;
    this.client = githubApi.client(config.token);
  } else {
    return new Github(config);
  }
}

Github.prototype.webhook = function(req) {
  var self = this;
  var webhook = new Webhook({
    client: self.client,
    headers: req.headers,
    body: req.body;
  });
  return webhook.commit.createStatus({
    description: 'TED testing pending.'
  })
  .return(webhook);
};

module.exports = Github;
