'use strict';

var yaml2json = require('js-yaml');
var Promise = require('bluebird');
var VError = require('verror');
var fs = require('fs');

/*
 * Parse yaml data into a json object.
 */
function parse(data) {
  // Parse yaml.
  return Promise.try(function() {
    return yaml2json.safeLoad(data);
  })
  // Wrap errors.
  .catch(function(err) {
    throw new VError(err, 'Error parsing yaml: %s', data);
  });
}

/*
 * Read yaml data from file and parse into a json object.
 */
function parseFile(file) {
  // Read file.
  return Promise.fromNode(function(cb) {
    fs.readFile(file, cb);
  })
  // Wrap errors.
  .catch(function(err) {
    throw new VError(err, 'Error reading yaml file: %s', file);
  })
  // Parse yaml to json.
  .then(function(data) {
    return parse(data);
  });
}

/*
 * Return api.
 */
module.exports = {
  parse: parse,
  parseFile: parseFile
};
