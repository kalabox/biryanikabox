#!/usr/bin/env node

var _ = require('lodash');
var vmrun = require('../vmrun/vmrun.js');
var Promise = require('bluebird');

vmrun.listMachines()
.then(function(machines) {
  return Promise.each(machines, function(machine) {
    return machine.ip()
    .catch(function(err) {
      if (!_.contains(err.message, 'not powered on')) {
        return err.message;
      }
    })
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
