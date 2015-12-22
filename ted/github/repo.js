'use strict';

var util = require('util');
var Status = require('./status.js');

function Repo(config) {
  if (this instanceof Repo) {
    this.config = config;
    this.client = config.client;
    this.user = config.user;
    this.repo = config.repo;
    this.name = util.format('%s/%s', config.user, config.repo);
    this.api = client.repo(this.name);
  } else {
    return new Repo(config);
  }
}

module.exports = Repo;
