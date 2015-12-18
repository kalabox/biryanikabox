#!/usr/bin/env node

'use strict';

// @todo: comment and clean up.

var _ = require('lodash');
var argv = require('yargs').argv;
var fs = require('fs');
var Promise = require('bluebird');
var http = require('http');
var url = require('url');
var yaml = require('./yaml.js');

var config = {
  hostname: 'localhost',
  port: 8080
};

Promise.try(function() {
  return Promise.fromNode(function(cb) {
    fs.exists('./ted.yml', function(exists) {
      if (exists) {
        yaml.parseFile('./ted.yml')
        .then(function(opts) {
          _.extend(config, opts);
        })
        .nodeify(cb);
      } else {
        cb();
      }
    });
  });
})
.then(function() {
  console.log(config);
})
.then(function() {
  return Promise.fromNode(function(cb) {
    fs.readFile(argv.y, {encoding: 'utf8'}, cb);
  })
})
.then(function(data) {

  var postData = JSON.stringify({
    yaml: data
  });

  var opts = {
    hostname: config.hostname,
    port: config.port,
    path: '/batch',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': postData.length
    }
  };

  return Promise.fromNode(function(cb) {

    var req = http.request(opts, function(res) {
      res.setEncoding('utf8');
      res.on('data', function(data) {
        var json = JSON.parse(data);
        if (!json.ping) {
          console.log(JSON.stringify(json, null, '  '));
        }
        if (json.err) {
          throw new Error(json.err);
        }
        if (json.end && json.end.failures !== 0) {
          throw new Error(JSON.stringify(json));
        }
      });
      res.on('error', cb);
      res.on('end', cb);
    });

    req.write(postData);
    req.end();
    
  });

});
