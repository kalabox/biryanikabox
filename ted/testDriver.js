'use strict';

var _ = require('lodash');
var Promise = require('bluebird');
var vmrun = require('../vmrun/vmrun.js');

/*
 * Constructor.
 */
function Context(tag, opts) {
  var self = this;
  // Set gui option.
  var gui = _.get(opts, 'gui') || false;
  // Split tag into parts.
  var parts = tag.split(':');
  self.tag = tag;
  // First part of tag is machine.
  self.machineName = parts[0];
  // Second part of tag is snapshot.
  self.snapshotName = parts[1];
  // Will need this list for cleanup later.
  self.snapshots = [];
  // Initialize promise.
  self.p = Promise.try(function() {
    // Find machine.
    return vmrun.findMachineThrows(self.machineName)
    // Save reference to machine.
    .tap(function(machine) {
      self.machine = machine;
    })
    // Find and revert to snapshot.
    .tap(function(machine) {
      return machine.findSnapshotThrows(self.snapshotName)
      .then(function(snapshot) {
        return snapshot.revert();
      });
    })
    // Start machine.
    .then(function(machine) {
      return machine.start({gui: gui});
    });
  });
}

/*
 * Add another operation to the end of the promise chain.
 */
Context.prototype.chain = function(fn) {
  var self = this;
  self.p = self.p.then(fn);
  return self;
};

/*
 * Create a snapshot.
 */
Context.prototype.snapshot = function(id) {
  var self = this;
  return self.chain(function() {
    // Create snapshot.
    return self.machine.createSnapshot(id)
    // Add a snapshot to list of snapshots that should be cleaned up later.
    .tap(function() {
      self.snapshots.push(id);
    });
  });
};

/*
 * Revert to an existing snapshot.
 */
Context.prototype.revert = function(id) {
  var self = this;
  return self.chain(function() {
    return self.machine.findSnapshotThrows(id)
    .then(function(snapshot) {
      return snapshot.revert();
    });
  });
};

/*
 * Start vm.
 */
Context.prototype.start = function() {
  var self = this;
  return self.chain(function() {
    return self.machine.start();
  });
};

/*
 * Stop and then start vm.
 */
Context.prototype.restart = function() {
  var self = this;
  return self.chain(function() {
    return self.machine.stop()
    .then(function() {
      self.machine.start();
    }) ;
  });
dd
};

/*
 * Run a script.
 */
Context.prototype.run = function(s) {
  var self = this;
  return self.chain(function() {
    return self.machine.script(s);
  });
};

/*
 * Install kalabox and create install snapshot.
 */
Context.prototype.install = function() {
  var self = this;
  return self.chain(function() {
    var cmds = [
      '../scripts/build/build_deps_linux.sh',
      'git version',
      'npm version'
    ];
    return Promise.each(cmds, function(cmd) {
      return self.machine.script(cmd);
    })
    .then(function() {
      return self.machine.createSnapshot('install')
      .then(function() {
        self.snapshots.push('install');
      });
    });
  });
};

/*
 * Returns the chains promise.
 */
Context.prototype.promise = function() {
  var p = this.p;
  this.p = Promise.resolve();
  return p;
};

/*
 * Cap the chain and do some cleaning up.
 */
Context.prototype.cleanup = function() {
  var self = this;
  self.p = self.p.finally(function() {
    // Stop machine.
    return self.machine.stop()
    // Cleanup snapshots created within context.
    .finally(function() {
      return Promise.each(self.snapshots, function(snapshotName) {
        return self.machine.findSnapshotThrows(snapshotName)
        .then(function(snapshot) {
          return snapshot.remove();
        });
      });
    });
  });
  return self.promise();
};

/*
 * Export custom api.
 */
module.exports = {
  vm: function(tag) {
    return new Context(tag);
  },
  install: function(tag) {
    return new Context(tag).install();
  }
};
