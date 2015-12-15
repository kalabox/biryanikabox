'use strict';

var _ = require('lodash');
var Promise = require('bluebird');
var path = require('path');
var Machine = require('./machine.js');
var User = require('./user.js');
var VError = require('verror');
var properties = require('properties');

/*
 * Constructor.
 */
function VMRun() {

}

/*
 * Discover list of machines on darwin host and map them to Machine objects.
 */
VMRun.prototype.listMachinesDarwin = function() {
  // Build filepath to where vmware keeps the inventory file.
  var file = path.join(
    '/',
    'Users',
    process.env.USER,
    'Library',
    'Application Support',
    'VMware Fusion',
    'vmInventory'
  );
  // Options for property parsing.
  var opts = {
    path: true,
    namespaces: true,
    sections: false,
    variables: false,
    include: false
  };
  // Parse the inventory file.
  return Promise.fromNode(function(cb) {
    properties.parse(file, opts, cb);
  })
  // Filter out properties without a config.
  .then(function(data) {
    return _.filter(_.values(data), function(obj) {
      return !!obj.config && !!obj.DisplayName;
    });
  })
  // Map to Machine objects.
  .map(function(data) {
    return new Machine({
      name: _.trim(data.DisplayName, '"'),
      path: data.config
    });
  })
  // Wrap errors.
  .catch(function(err) {
    throw new VError(
      err,
      'Error reading and parsing machine inventory: %s',
      file
    );
  });
};

/*
 * Return list of discovered machines on the host.
 */
VMRun.prototype.listMachines = function() {
  var self = this;
  var os = process.platform;
  if (os === 'darwin') {
    return self.listMachinesDarwin();
  } else {
    // Make sure we know this host's os is not yet supported.
    throw new Error('OS not supported: ' + os);
  }
};

/*
 * Find a machine whos name matches given name.
 */
VMRun.prototype.findMachine = function(name) {
  var self = this;
  // List machines.
  return self.listMachines()
  // Find machine with a matching name.
  .then(function(machines) {
    return _.find(machines, function(machine) {
      return machine.name === name;
    });
  });
};

/*
 * Find a machine whos name matches given name, throw an error if
 * no machine matching name exists.
 */
VMRun.prototype.findMachineThrows = function(name) {
  var self = this;
  return self.findMachine(name)
  .tap(function(machine) {
    if (!machine) {
      throw new Error('Machine does not exist: ' + name);
    }
  });
};

/*
 * Creates a new user with username u and password p.
 */
VMRun.prototype.user = function(u, p) {
  return new User(u, p);
};

/*
 * Singleton instance.
 */
var singleton = new VMRun();

/*
 * Export singleton instance.
 */
module.exports = singleton;
