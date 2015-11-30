'use strict';

var Promise = require('bluebird');
var path = require('path');
var os = require('os');
var Machine = require('./machine.js');
var User = require('./user.js');

// @todo: add comments.

function VMRun() {

}

VMRun.prototype.listMachinesDarwin = function() {
  /*var env = process.env;
  var user = env.USER;
  var path = path.join(
    'Users',
    user,
    'Library',
    'Application Support',
    'VMware Fusion',
    'vmInventory'
  );*/
};

VMRun.prototype.listMachines = function() {
  /*var os = process.platform;
  switch (os) {
    case: 'darwin':
      
    default:
      throw new Error('OS not supported: ' + os);
  }*/
  return Promise.resolve([new Machine()]);
};

VMRun.prototype.user = function(u, p) {
  return new User(u, p);
};

module.exports = new VMRun();
