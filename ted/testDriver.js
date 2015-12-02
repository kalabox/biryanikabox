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
 * Run a script.
 */
Context.prototype.run = function(s) {
  var self = this;
  return self.chain(function() {
    return self.machine.script(s);
  });
};

/*
 * Returns the chains promise.
 */
Context.prototype.promise = function() {
  return this.p;
};

/*
 * Cap the chain and do some cleaning up.
 */
Context.prototype.done = function() {
  var self = this;
  // @todo: cleanup snapshot created during the context.
  self.p = self.p.finally(function() {
    return self.machine.stop();
  });
  return self.promise();
};

/*
 * Export custom api.
 */
module.exports = {
  vm: function(tag) {
    return new Context(tag);
  }
};
