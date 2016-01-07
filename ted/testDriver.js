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
  // Set tail of promise chain to tail of promise chain + new promise.
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
    // Find snapshot.
    return self.machine.findSnapshotThrows(id)
    // Revert snapshot.
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
    // Start vm.
    return self.machine.start();
  });
};

/*
 * Stop and then start vm.
 */
Context.prototype.restart = function() {
  var self = this;
  return self.chain(function() {
    // Stop vm.
    return self.machine.stop()
    // Start vm.
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
    // Run script on vm.
    return self.machine.script(s);
  });
};

/*
 * Install kalabox and create install snapshot.
 */
Context.prototype.install = function(opts) {
  var self = this;
  return self.chain(function() {
    // Set default environmental variables.
    return self.__setEnv({
      KALABOX_DEV: true
    })
    // Setup dependencies.
    .then(function() {
      if (self.machine.platform === 'darwin') {
        // OSX
        return self.machine.script('./scripts/build/build_deps_darwin.sh');
      } else if (self.machine.platform === 'linux') {
        // Linux
        return self.machine.script('./scripts/build/build_deps_linux.sh');
      } else if (self.machine.platform === 'win32') {
        // Win32
        return self.machine.copy('./scripts/build/build_deps_win32.ps1')
        .then(function() {
          return self.machine.script('./scripts/build/build_deps_win32.bat');
        })
        // Grab windows environmental variables.
        .then(function() {
          return self.machine.getEnv()
        })
        // Set some new ENVvars
        .then(function(env) {
          // Add some windows things to the path
          var path = env.Path.split(';');
          path.push('C:\\Program Files (x86)\\nodejs\\');
          path.push('C:\\Program Files (x86)\\JXcore');
          path.push('C:\\Program Files\\Git\\bin');
          return self.__setEnv({Path: path.join(';')});
        })
      } else {
        throw new Error('Platform not implemented: ' + self.tag);
      }
    })
    // Make sure dependencies have been setup correctly.
    .then(function() {
      // Make sure git dependency is setup correctly.
      return self.machine.script('git version')
      // Make sure npm dependency is setup correctly.
      .then(function() {
        return self.machine.script('npm version');
      })
      // Make sure developer mode environmental variable is setup correctly.
      .then(function() {
        var envEr = (self.machine.platform === 'win32') ? 'set' : 'env';
        var grepA = (self.machine.platform === 'win32') ? 'findstr' : 'grep';
        var envCmd = [envEr, '|', grepA, 'KALABOX_DEV'].join(' ');
        return self.machine.script(envCmd);
      });
    })
    // Install kalabox.
    .then(function() {
      var args = _.filter([opts.ref], _.identity);
      if (self.machine.platform === 'darwin') {
        // OSX
        return self.machine.script('./scripts/install/install_posix.sh', {
          args: args
        });
      } else if (self.machine.platform === 'linux') {
        // Linux
        return self.machine.script('./scripts/install/install_posix.sh', {
          args: args
        });
      } else if (self.machine.platform === 'win32') {
        // Win32
        return self.machine.script('./scripts/install/install_win32.bat', {
          args: args
        })
        // Grab windows environmental variables.
        .then(function() {
          return self.machine.getEnv()
        })
        // Set some new ENVvars
        .then(function(env) {
          // Add some windows things to the path
          var path = env.Path.split(';');
          path.push('C:\\kalabox\\bin');
          return self.__setEnv({Path: path.join(';')});
        })
      } else {
        throw new Error('Platform not implemented: ' + self.tag);
      }
    })
    // Make sure kalabox has been installed correctly.
    .then(function() {
      return self.machine.script('kbox version');
    })
    // Create a snapshot for clean+install state.
    .then(function() {
      /*return self.machine.createSnapshot('install')
      .then(function() {
        self.snapshots.push('install');
      });*/
    });
  });
};

/*
 * Returns process.env of vm.
 */
Context.prototype.getEnv = function(fn) {
  var self = this;
  return self.chain(function() {
    // Get environmental variables object from vm.
    return self.machine.getEnv()
    // Call function with environmental variable object.
    .then(function(env) {
      return fn.call(self, fn);
    });
  });
};

/*
 * Given an object, this sets environemental variables on machine of
 * each key value pair.
 */
Context.prototype.__setEnv = function(env) {
  var self = this;
  // Wait for all promises to fulfill.
  return Promise.all(
    // Map each key value pair to a promise that sets the environmental
    // variable on the vm.
    _.map(env, function(val, key) {
      // Set environmental variable on vm.
      return self.machine.setEnv(key, val);
    })
  );
};

/*
 * Given an object, this sets environemental variables on machine of
 * each key value pair.
 */
Context.prototype.setEnv = function(env) {
  var self = this;
  return self.chain(function() {
    return self.__setEnv(env);
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
    // Create a last snapshot.
    .finally(function() {
      return self.machine.findSnapshot('last')
      .then(function(snapshot) {
        if (snapshot) {
          return snapshot.remove();
        }
      })
      .then(function() {
        return self.machine.createSnapshot('last');
      });
    })
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
  install: function(tag, opts) {
    return new Context(tag).install(opts);
  }
};
