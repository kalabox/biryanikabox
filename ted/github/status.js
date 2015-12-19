'use strict';

function Status(config) {
  if (this instanceof Status) {
    this.config = config;
  } else {
    return new Status(config);
  }
}

module.exports = Status;
