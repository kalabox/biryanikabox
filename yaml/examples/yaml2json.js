'use strict';

var argv = require('yargs').argv;
var yaml2json = require('js-yaml');
var fs = require('fs');
var Promise = require('bluebird');

Promise.fromNode(function(cb) {
  fs.readFile(argv._[0], cb);
})
.then(function(data) {
  return yaml2json.safeLoad(data);
})
.then(function(json) {
  console.log(JSON.stringify(json, null, '  '));
});
