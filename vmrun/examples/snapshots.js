'use strict';

var vmrun = require('../vmrun.js');
var Promise = require('bluebird');
var uuid = require('uuid');
var assert = require('assert');

// List vms.
vmrun.findMachine('ubuntu14.04-x64-clean')
.then(function(machine) {
  console.log(typeof machine);
  var user = vmrun.user('kalabox', 'kalabox');
  //var machine = machines[0];
  var id = uuid.v4();
  machine.setUser(user);
  // Create snapshot.
  return Promise.try(function() {
    console.log('Creating snapshot: %s.', id);
    return machine.createSnapshot(id);
  })
  // Start vm.
  .then(function() {
    console.log('Starting vm.');
    return machine.start({gui: true});
  })
  // Create file on vm.
  .then(function() {
    var file = machine.toGuestFile(id + '.txt');
    console.log('Creating file on vm: %s.', file);
    return machine.script('touch ' + file);
  })
  // Make sure the file exists in the vm.
  .then(function() {
    var file = machine.toGuestFile(id + '.txt');
    return machine.fileExists(file)
    .then(function(exists) {
      console.log('File exists on vm: %s.', exists);
      assert(exists, 'File does not exist.');
    });
  })
  // Revert back to the old snapshot.
  .then(function() {
    return machine.findSnapshot(id)
    .then(function(snapshot) {
      if (!snapshot) {
        throw new Error('Snapshot not found: ' + id);
      }
      console.log('Stopping vm.');
      return machine.stop()
      .then(function() {
        console.log('Reverting snapshot: %s', id);
        return snapshot.revert();
      })
      .then(function() {
        console.log('Starting vm.');
        return machine.start();
      });
    });
  })
  // Make sure the file no longer exists on the vm.
  .then(function() {
    var file = machine.toGuestFile(id + '.txt');
    return machine.fileExists(file)
    .then(function(exists) {
      console.log('File exists on vm: %s.', exists);
      assert(!exists, 'File still exists.');
    });
  })
  // Stop the vm.
  .finally(function() {
    console.log('Stopping vm.');
    return machine.stop();
  })
  // Cleanup.
  .finally(function() {
    // Find the snapshot.
    return machine.findSnapshot(id)
    // Delete the snapshot.
    .then(function(snapshot) {
      console.log('Removing snapshot: %s.', id);
      return snapshot.remove();
    })
    // Make sure the snapshot no longer exists.
    .finally(function() {
      return machine.findSnapshot(id)
      .then(function(snapshot) {
        console.log('Snapshot exists: %s.', !!snapshot);
        assert(!snapshot, 'Snapshot still exists');
      });
    });
  });
});
