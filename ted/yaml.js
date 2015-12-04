'use strict';

var yaml2json = require('js-yaml');
var Promise = require('bluebird');
var VError = require('verror');
var fs = require('fs');

function parse(data) {
  return Promise.try(function() {
    return yaml2json.safeLoad(data);
  })
  .catch(function(err) {
    throw new VError(err, 'Error parsing yaml: %s', data);
  });
}

function parseFile(file) {
  return Promise.fromNode(function(cb) {
    fs.readFile(file, cb);
  })
  .catch(function(err) {
    throw new VError(err, 'Error reading yaml file: %s', file);
  })
  .then(function(data) {
    return parse(data);
  });
}

module.exports = {
  parse: parse,
  parseFile: parseFile
};
