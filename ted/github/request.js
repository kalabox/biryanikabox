'use strict';

function Request(config) {
  if (this instanceof Request) {
    this.config = config;
  } else {
    return new Request(config);
  }
}

Request.prototype.run = function() {

};

module.exports = Request;
