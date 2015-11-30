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

/*
 * Constructor.
 */
function Machine() {
  // @todo: make path set from passed in options.
  this.path = path.join(
    '~',
    'Documents',
    '"Virtual Machines.localized"',
    '"Ubuntu 64-bit 14.04.3.vmwarevm"',
    '"Ubuntu 64-bit 14.04.3.vmx"'
  );
}

/*
 * Execute a shell command.
 */
Machine.prototype.__exec = function(cmd) {
  // @todo: add comments.
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
    ps.stderr.on('data', function(data) {
      if (_.contains(data, 'JackRouter')) {

      } else if (_.contains(data, 'SeratoVirtualAudio')) {

      } else if (_.contains(data, 'Flip4Mac')) {
        
      } else {
        console.log('ERR: %s', data);
      }
    });
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
  return self.__exec(cmd);
};

/*
 * Internal version of starting vm.
 */
Machine.prototype.__start = function(opts) {
  opts.gui = opts.gui || false;
  return this.__execVmrun('start', {
    args: opts.gui ? ['gui'] : ['nogui']
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
  // @todo: create a hard stop by maybe using options.
  return this.__execVmrun('stop');
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
  var os = process.platform;
  switch (os) {
    case 'darwin':
      return self.waitDarwin(user);
    default:
      throw new Error('OS not supported: ' + os);
  };
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
  .return(fileOut);
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
  .return(localFile);
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
      fs.readFile(localFile, cb);
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
      var file = path.join(os.tmpdir(), uuid.v1() + '.sh');
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
      // Get uuid as an id for this script run.
      var id = uuid.v1();
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
      // Return a result object.
      .then(function() {
        return new Result({
          machine: self,
          stdout: stdout,
          stderr: stderr
        });
      });
    });
  });
};

/*
 * Set the user this machine will use.
 */
Machine.prototype.user = function(u, p) {
  if (u instanceof User) {
    this.user = u;
  } else {
    this.user = new User(u, p);
  }
};

// Export the constructor.
module.exports = Machine;
