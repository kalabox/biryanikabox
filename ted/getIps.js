#!/usr/bin/env node

/*
 * Simple script for getting ip addresses of running vms.
 */

var _ = require('lodash');
var vmrun = require('../vmrun/vmrun.js');
var Promise = require('bluebird');

// Get list of machines.
vmrun.listMachines()
// Print out info for each machine.
.then(function(machines) {
  return Promise.each(machines, function(machine) {
    // Get ip address.
    return machine.getIp()
    // Don't throw an error is the machine is powered off.
    .catch(function(err) {
      if (!_.contains(err.message, 'not powered on') &&
        !_.contains(err.message, 'Tools are not running')) {
        return err.message;
      }
    })
    // Print info.
    .then(function(ip) {
      if (ip) {
        console.log(JSON.stringify({
          name: machine.name,
          ip: ip
        }));
      }
    });
  });
});
