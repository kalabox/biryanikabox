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

    // Get a list of machines
    var rawMachines = _.filter(_.values(data), function(obj) {
      return !!obj.config && !!obj.DisplayName;
    });

    // Get a list of other data
    var otherData = _.filter(_.values(data), function(obj) {
      return !!obj.field0 && !!obj.id;
    });

    // Add the release and platform to each machine and then return the result
    return _.map(rawMachines, function(machine) {

      // Grab the release info from the other data
      machine.release = _.result(_.find(otherData, function(datum) {
        return machine.config === datum.id;
      }), 'field0.value');

      // Use the release info to infer a platform
      if (_.contains(machine.release, 'os x')) {
        machine.platform = 'darwin';
      } else if (_.contains(machine.release, 'windows')) {
        machine.platform = 'win32';
      }
      else {
        machine.platform = 'linux';
      }

      // Return the updated machine
      return machine;

    });

  })
  // Map to Machine objects.
  .map(function(data) {
    return new Machine({
      name: _.trim(data.DisplayName, '"'),
      path: data.config,
      release: _.trim(data.release, '"'),
      platform: _.trim(data.platform, '"')
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
