'use strict';

var _ = require('lodash');
var Promise = require('bluebird');
var fs = require('fs');
var path = require('path');
var exec = require('child_process').exec;

function User(u, p) {
  this.u = u;
  this.p = p;
}

function Machine() {
  this.path = path.join(
    '~',
    'Documents',
    '"Virtual Machines.localized"',
    '"Ubuntu 64-bit 14.04.3.vmwarevm"',
    '"Ubuntu 64-bit 14.04.3.vmx"'
  );
}

Machine.prototype.__exec = function(cmd) {
  return Promise.fromNode(function(cb) {
    cmd = cmd.join(' ');
    console.log('exec: %s', cmd);
    var ps = exec(cmd, function(err) {
      if (err) {
        cb(err);
      }
    });
    ps.on('error', function(err) {
      cb(err);
    });
    ps.stdout.on('data', function(data) {
      console.log('OUT: %s', data);
    });
    /*ps.stderr.on('data', function(data) {
      console.log('ERR: %s', data);
    });*/
    ps.on('exit', function(code, signal) {
      console.log('Exit: %s', code);
      if (code === 0) {
        cb();
      } else {
        cb(new Error('Non-zero exit code: ' + code));
      }
    });
  });
};

Machine.prototype.__execVmrun = function(action, opts) {
  var self = this;

  var user = _.get(opts, 'user') || self.user;

  var cmd = ['vmrun'];

  function concat(elts) {
    _.each(elts, function(elt) {
      cmd.push(elt);
    });
  }

  if (user) {
    concat([
      '-gu', user.u,
      '-gp', user.p
    ]);
  }

  concat([
    '-T', 'fusion',
    action,
    self.path
  ]);

  if (_.get(opts, 'args')) {
    concat(opts.args);
  }

  return self.__exec(cmd);
};

Machine.prototype.__start = function() {
  return this.__execVmrun('start');
};

Machine.prototype.start = function() {
  var self = this;
  return self.__start()
  .delay(5 * 1000)
  .then(function() {
    return self.wait();
  });
};

Machine.prototype.stop = function() {
  return this.__execVmrun('stop');
};

Machine.prototype.waitDarwin = function(user) {
  return this.__execVmrun('runScriptInGuest', {
    user: user,
    args: ['/bin/echo', 'foo']
  });
};

Machine.prototype.wait = function(user) {
  var self = this;
  var os = process.platform;
  switch (os) {
    case 'darwin':
      return self.waitDarwin(user);
    default:
      throw new Error('OS not supported: ' + os);
  };
};

Machine.prototype.user = function(u, p) {
  if (u instanceof User) {
    this.user = u;
  } else {
    this.user = new User(u, p);
  }
};

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
