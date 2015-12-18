'use strict';

var Mocha = require('mocha');
var EventEmitter = require('events').EventEmitter;
var events = global.events = new EventEmitter();
var tedReporter = require('./tedReporter.js');

var mocha = new Mocha({
  reporter: tedReporter,
  events: events,
  timeout: 20 * 60 * 1000
});

require('./globals.js');

mocha.addFile('./TestInstall.js');

function pp(label, obj) {
  var data = !!obj ? JSON.stringify(obj) : '';
  console.log(label + ': ' + data);
}

events.on('start', function(data) {
  //pp('start', data);
});

events.on('end', function(data) {
  //pp('end', data);
});

events.on('test', function(data) {
  //foo('@@@TEST');
  //pp('test', data);
});

events.on('test-end', function(data) {
  //foo('@@@TESTEND');
  //pp('test-end', data);
});

//process.stdout.write = function() {};
mocha.run();
