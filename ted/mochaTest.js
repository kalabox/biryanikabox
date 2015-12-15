'use strict';

var Mocha = require('mocha');
var EventEmitter = require('events').EventEmitter;
var events = global.events = new EventEmitter();
var tedReporter = require('./tedReporter.js');

var mocha = new Mocha({
  reporter: tedReporter,
  timeout: 20 * 60 * 1000
});

require('./globals.js');

mocha.addFile('./TestInstall.js');

/*events.on('start', function(evt) {
  throw new Error(JSON.stringify(evt));
});*/

/*global.console.log = function(data) {
  throw new Error(data);
};*/

/*process.stdout.on('data', function(data) {
  throw new Error(data);
});*/

mocha.run();
