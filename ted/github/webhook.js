'use strict';

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
      client: client,
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

module.exports = Webhook;
