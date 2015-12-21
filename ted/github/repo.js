'use strict';

var Status = require('./status.js');

function Repo(config) {
  if (this instanceof Repo) {
    this.config = config;
    this.user = this.config.user;
    this.repo = this.config.repo;
    this.github = this.config.github;
  } else {
    return new Repo(config);
  }
}

Repo.prototype.createStatus = function(commit) {
  var self = this;
  var status = new Status({
    id: commit.id,
    repo: self,
    github: self.github
  });
  return status.pending()
  .then(function() {
    return status;
  });
};

module.exports = Repo;
