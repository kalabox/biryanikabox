'use strict';

var Commit = require('./commit.js');
var Repo = require('./repo.js');

function Webhook(config) {
  if (this instanceof Webhook) {
    this.config = config;
    this.headers = config.headers;
    this.body = config.body;
    this.github = config.github;
    this.kind = config.headers['x-github-event'];
    this.user = config.body.repository.owner.name;
    this.repoName = config.body.repository.name;
    this.hash = config.body.after;
  } else {
    return new Webhook(config);
  }
}

Webhook.prototype.commit = function() {
  var self = this;
  return new Commit({
    id: self.body.after
  });
};

Webhook.prototype.repo = function() {
  var self = this;
  return new Repo({
    user: self.user,
    repo: self.repoName,
    github: self.github  
  });
};

module.exports = Webhook;
