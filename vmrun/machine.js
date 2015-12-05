'use strict';

var _ = require('lodash');
var Promise = require('bluebird');
var fs = require('fs');
var path = require('path');
var exec = require('child_process').exec;
var uuid = require('uuid');
var os = require('os');
var util = require('util');
var Result = require('./result.js');
var User = require('./user.js');
var Snapshot = require('./snapshot.js');
var VError = require('verror');

var debugOn = false;
function debug() {
  if (debugOn) {
    console.log.apply(_.toArray(arguments));
  }
};

/*
 * Constructor.
 */
function Machine(config) {
  this.name = config.name;
  this.path = config.path;
  this.user = new User('kalabox', 'kalabox');
}

/*
 * Execute a shell command.
 */
Machine.prototype.__exec = function(cmd) {
  // @todo: add comments.
  return Promise.fromNode(function(cb) {
    cmd = cmd.join(' ');
    debug('exec: %s', cmd);
    var buffer = '';
    var errBuffer = '';
    var ps = exec(cmd, function(err) {
      if (err) {
        cb(err);
      }
    });
    ps.on('error', function(err) {
      cb(err);
    });
    ps.stdout.on('data', function(data) {
      buffer += data;
    });
    ps.stderr.on('error', function(err) {
      cb(err);
    });
    ps.on('exit', function(code, signal) {
      debug('Exit: %s', code);
      if (code === 0) {
        debug('STDOUT: ' + buffer);
        cb(null, buffer);
      } else {
        var data = {
          code: code,
          stdout: buffer,
          stderr: errBuffer
        };
        var err = new Error(JSON.stringify(data));
        err.code = code;
        cb(err);
      }
    });
  });
};

/*
 * Execute a vmrun command.
 */
Machine.prototype.__execVmrun = function(action, opts) {
  var self = this;

  // Get user.
  var user = _.get(opts, 'user') || self.user;

  // Base command.
  var cmd = ['vmrun'];

  // Helper function for adding to command array.
  function concat(elts) {
    _.each(elts, function(elt) {
      cmd.push(elt);
    });
  }

  // If a user is specified include login info.
  if (user) {
    concat([
      '-gu', user.u,
      '-gp', user.p
    ]);
  }

  // Add in needed arguments.
  concat([
    '-T', 'fusion',
    action,
    self.path
  ]);

  // Add in action specific arguments.
  if (_.get(opts, 'args')) {
    concat(opts.args);
  }

  // Run command.
  return self.__exec(cmd)
  .tap(function(data) {
    debug('OUT: ' + data);
  });
};

/*
 * Internal version of starting vm.
 */
Machine.prototype.__start = function(opts) {
  var self = this;
  opts = opts || {};
  opts.gui = _.get(opts, 'gui') || false;
  return self.__execVmrun('start', {
    args: opts.gui ? ['gui'] : ['nogui']
  })
  .catch(function(err) {
    throw new VError(err, 'Error starting vm: %s', self.path);
  });
};

/*
 * Start the vm.
 */
Machine.prototype.start = function(opts) {
  var self = this;
  // Start the vm.
  return self.__start(opts)
  // Wait a short duration.
  .delay(5 * 1000)
  // Wait for vm to become responsive.
  .then(function() {
    return self.wait();
  });
};

/*
 * Stop the vm gracefully.
 */
Machine.prototype.stop = function() {
  var self = this;
  // @todo: create a hard stop by maybe using options.
  return self.__execVmrun('stop')
  .catch(function(err) {
    throw new VError(err, 'Error stopping vm: ' + self.path);
  });
};

/*
 * Darwin specific wait.
 */
Machine.prototype.waitDarwin = function(user) {
  return this.__execVmrun('runProgramInGuest', {
    user: user,
    args: ['/bin/echo', 'foo']
  });
};

/*
 * Wait for vm to become responsive, then fulfill promise.
 */
Machine.prototype.wait = function(user) {
  var self = this;
  return Promise.try(function() {
    var os = process.platform;
    switch (os) {
      case 'darwin':
        return self.waitDarwin(user);
      default:
        throw new Error('OS not supported: ' + os);
    };
  })
  .catch(function(err) {
    throw new VError(err, 'Error waiting for vm: ' + self.path);
  });
};

/*
 * Resolve a host path to a vm path.
 */
Machine.prototype.toGuestFile = function(fileIn) {
  var self = this;
  // @todo: this needs to be OS specific.
  return path.join(
    '/',
    'home',
    self.user.u,
    path.basename(fileIn)
  );
};

/*
 * Copy file from host to vm.
 */
Machine.prototype.putFile = function(fileIn) {
  var self = this;
  // Build file name for the vm.
  var fileOut = self.toGuestFile(fileIn);
  // Copy file to the vm.
  return self.__execVmrun('CopyFileFromHostToGuest', {
    args: [
      fileIn,
      fileOut
    ]
  })
  // Return file on the vm.
  .return(fileOut)
  // Wrap errors.
  .catch(function(err) {
    throw new VError(err, 'Error putting file: ' + fileIn);
  });
};

/*
 * Get file from vm.
 */
Machine.prototype.getFile = function(remoteFile, localDir) {
  var self = this;
  // Build a local filename.
  var localFile = path.join(localDir, path.basename(remoteFile));
  // Copy file from vm to host.
  return self.__execVmrun('CopyFileFromGuestToHost', {
    args: [
      remoteFile,
      localFile
    ]
  })
  // Return the path of the file on the host.
  .return(localFile)
  // Wrap errors.
  .catch(function(err) {
    throw new VError(err, 'Error getting file: ' + remoteFile);
  });
};

/*
 * Get file from vm, read file, remove file, return file contents.
 */
Machine.prototype.getFileRead = function(remoteFile) {
  var self = this;
  // Get local directory for the file.
  var localDir = os.tmpdir();
  // Get file from vm.
  return self.getFile(remoteFile, os.tmpdir())
  // Read file, remove file, and return file contents.
  .then(function(localFile) {
    // Read file.
    return Promise.fromNode(function(cb) {
      fs.readFile(localFile, {encoding: 'utf8'}, cb);
    })
    // Remove file.
    .tap(function() {
      return Promise.fromNode(function(cb) {
        fs.unlink(localFile, cb);
      });
    });
  });
};

/*
 * Run a script in the vm.
 */
Machine.prototype.script = function(s) {
  // Save reference.
  var self = this;
  // Get uuid as an id for this script run.
  var id = uuid.v4();
  // Check to see if 's' is a file that exists.
  return Promise.fromNode(function(cb) {
    fs.exists(s, function(exists) {
      cb(null, exists);
    });
  })
  // If 's' is not a file that exists then treat it as a script string and
  // write it to a temp file.
  .then(function(exists) {
    if (exists) {
      // 's' is a file that exists.
      return s;
    } else {
      // 's' is a script string, write it to a temp temp file.
      var file = path.join(os.tmpdir(), id + '.sh');
      return Promise.fromNode(function(cb) {
        fs.writeFile(file, s, {mode: '0500'}, cb);
      })
      .delay(5 * 1000)
      .return(file);
    }
  })
  .then(function(file) {
    // Put script into vm.
    return self.putFile(file)
    // Run the script in the vm.
    .then(function() {
      // Create filenames for the script run output.
      var stdout = self.toGuestFile(id + '-stdout.log');
      var stderr = self.toGuestFile(id + '-stderr.log');
      // Build command including stdout and stderr redirection.
      var cmd = util.format(
        '"%s 1> %s 2> %s"',
        self.toGuestFile(file),
        stdout,
        stderr
      );
      // Run the script in the vm.
      return self.__execVmrun('runScriptInGuest', {
        args: [
          '/bin/bash',
          cmd
        ]
      })
      .catch(function(err) {
        var result = new Result({
          machine: self,
          stdout: stdout,
          stderr: stderr
        });
        return result.stderr()
        .then(function(data) {
          throw new VError(err, JSON.stringify(data));
        });
      })
      // Return a result object.
      .then(function() {
        return new Result({
          machine: self,
          stdout: stdout,
          stderr: stderr
        });
      });
    });
  })
  // Wrap errors.
  .catch(function(err) {
    throw new VError(err, 'Error running script: "%s"', s);
  });
};

/*
 * Create a snapshot of the vm.
 */
Machine.prototype.createSnapshot = function(name) {
  return this.__execVmrun('snapshot', {
    args: [name]
  })
  // Wrap errors.
  .catch(function(err) {
    throw new VError(err, 'Error creating snapshot: ' + name);
  });
};

/*
 * Returns list of snapshot objects.
 */
Machine.prototype.listSnapshots = function() {
  var self = this;
  return self.__execVmrun('listSnapshots')
  .then(function(data) {
    var lines = data.split('\n');
    var names = _.filter(lines, function(line) {
      return line.length > 0 && !_.contains(line, 'Total snapshots:');
    });
    var snapshots = _.map(names, function(name) {
      return new Snapshot(name, self);
    });
    return snapshots;
  })
  // Wrap errors.
  .catch(function(err) {
    throw new VError(err, 'Error listing snapshots.');
  });
};

/*
 * Given the name of a snapshot it returns that snapshot, or null if not found.
 */
Machine.prototype.findSnapshot = function(name) {
  var self = this;
  // List snapshots.
  return self.listSnapshots()
  // Find snapshot that matches given name.
  .then(function(snapshots) {
    return _.find(snapshots, function(snapshot) {
      return snapshot.name === name;
    });
  })
  // Wrap errors.
  .catch(function(err) {
    throw new VError(err, 'Error finding snapshot: ' + name);
  });
};

/*
 * Given the name of a snapshot it returns that snapshot, or throw and error
 * if snapshot was not found.
 */
Machine.prototype.findSnapshotThrows = function(name) {
  var self = this;
  return self.findSnapshot(name)
  .tap(function(snapshot) {
    if (!snapshot) {
      var tag = [self.name, name].join(':');
      throw new Error('Snapshot does not exist: ' + tag);
    }
  });
};

/*
 * File exists in vm.
 */
Machine.prototype.fileExists = function(file) {
  // Run file exists in guest command.
  return this.__execVmrun('fileExistsInGuest', {
    args: [file]
  })
  // If there was no error then the file exits.
  .then(function() {
    return true;
  })
  // If the error code was 255 then the file does not exist.
  .catch(function(err) {
    if (err.code === 255) {
      return false;
    } else {
      throw new VError(err, 'Error checking if file exists: ' + file);
    }
  });
};

/*
 * Set the user this machine will use.
 */
Machine.prototype.setUser = function(u, p) {
  if (u instanceof User) {
    this.user = u;
  } else {
    this.user = new User(u, p);
  }
};

// Export the constructor.
module.exports = Machine;
