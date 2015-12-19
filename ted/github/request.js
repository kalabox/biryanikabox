'use strict';

var _ = require('lodash');
var Promise = require('bluebird');
var Status = require('./status.js');
var Batch = require('../batch.js');

function Request(config) {
  if (this instanceof Request) {
    this.config = config;
    this.statuses = [];
  } else {
    return new Request(config);
  }
}

Request.prototype.createBatch = function() {
  // @todo: build a batch config file.
  var config = {
  };
  this.batch = new Batch(config);
};

Request.prototype.init = function() {
  var self = this;
  self.batch = createBatch();
  // @todo: how do we get the mocha tests here?
  return Promise.all(
    _.map(self.batch.tags, function() {
      var status = new Status(/* @todo */);
      self.statuses.push(status);
      return status.pending();
    });
  );
};

Request.prototype.run = function() {
  // @todo: batch events.
  return self.batch.run();
};

module.exports = Request;
