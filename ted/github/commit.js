'use strict';

function Commit(config) {
  if (this instanceof Commit) {
    this.config = config;
    this.id = config.id;
  } else {
    return new Commit(config);
  }
}

module.exports = Commit;
