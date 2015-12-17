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
var bill = require('kalabox-bill');

var debugOn = false;
function debug() {
  if (debugOn) {
    console.log.apply(_.toArray(arguments));
  }
}

/*
 * Get directory for machine executable.
 */
var getVMRunBinPath = function() {

  // Return exec based on path
  switch (process.platform) {
    case 'win32': return null;
    case 'darwin': return '/Applications/VMware\ Fusion.app/Contents/Library';
    case 'linux': return null;
  }

};

/*
 * Constructor.
 */
function Machine(config) {
  this.platform = config.platform;
  this.release = config.release;
  this.name = config.name;
  this.path = config.path;
  this.user = new User('kalabox', 'kalabox');
}

/*
 * Get process.env of bill server.
 */
Machine.prototype.getEnv = function(opts) {
  var self = this;
  var port = _.get(opts, 'port') || null;
  return self.ip()
  .then(function(ip) {
    var client = new bill.client(ip, port);
    return client.getEnv();
  });
};

/*
 * Set process.env key value pair on bill server.
 */
Machine.prototype.setEnv = function(key, val, opts) {
  var self = this;
  var port = _.get(opts, 'port') || null;
  return self.ip()
  .then(function(ip) {
    var client = new bill.client(ip, port);
    return client.setEnv(key, val);
  });
};

/*
 * Run a script in vm using bill daemon.
 */
Machine.prototype.script = function(cmd, opts) {
  var self = this;
  return Promise.fromNode(function(cb) {
    fs.exists(cmd, function(exists) {
      cb(null, exists);
    });
  })
  .then(function(exists) {
    if (exists) {
      return Promise.fromNode(function(cb) {
        fs.readFile(cmd, {encoding: 'utf8'}, cb);
      });
    } else {
      return cmd;
    }
  })
  .then(function(_cmd) {
    return self.__script({cmd: _cmd}, opts);
  });
};

Machine.prototype.__script = function(cmd, opts) {

  console.log('CMD: ' + JSON.stringify(cmd));

  opts = opts || {};
  var port = opts.port || 1989;
  var stdout = opts.stdout || true;
  var stderr = opts.stderr || true;
  var self = this;
  return self.ip()
  .then(function(ip) {
    return Promise.fromNode(function(cb) {
      var client = new bill.client(ip, port);
      var buffer = '';
      var bufferErr = '';
      client.on('exit', function(data) {
        if (data.code !== 0) {
          var msg = JSON.stringify({
            code: data.code,
            stderr: bufferErr,
            stdout: buffer
          });
          cb(new Error(msg));
        }
      });
      client.on('stdout', function(data) {
        buffer += data;
        if (stdout) {
          process.stdout.write(data);
        }
      });
      client.on('stderr', function(data) {
        bufferErr += data;
        if (stderr) {
          process.stdout.write(data);
        }
      });
      var fullCmd = cmd;
      client.sh(fullCmd)
      .then(function() {
        cb();
      });
    });
  })
  .catch(function(err) {
    throw new VError(err, 'Error running bill: %s', cmd);
  });
};

Machine.prototype.copy = function(file, opts) {

  opts = opts || {};
  var port = opts.port || 1989;
  var self = this;
  return self.ip()
  .then(function(ip) {
    return Promise.fromNode(function(cb) {
      var client = new bill.client(ip, port);
      var buffer = '';
      var bufferErr = '';
      client.on('exit', function(data) {
        if (data.code !== 0) {
          var msg = JSON.stringify({
            code: data.code,
            stderr: bufferErr,
            stdout: buffer
          });
          cb(new Error(msg));
        }
      });
      client.on('stdout', function(data) {
        buffer += data;
      });
      client.on('stderr', function(data) {
        bufferErr += data;
      });
      client.copy({file: file})
      .then(function() {
        cb();
      });
    });
  })
  .catch(function(err) {
    throw new VError(err, 'Error copying file to bill: %s', file);
  });
};

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
    ps.on('exit', function(code/*, signal*/) {
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

  // Add common vmrun executable path locations to the path
  // since vmrun is not commonly in the path by default
  var pathString = (process.platform === 'win32') ? 'Path' : 'PATH';
  var pathSep = (process.platform === 'win32') ? ';' : ':';
  var vmRunPath = getVMRunBinPath();
  if (!_.startsWith(process.env.path, vmRunPath)) {
    var newPath = [vmRunPath, process.env[pathString]].join(pathSep);
    process.env[pathString] = newPath;
    //console.log(process.env);
  }

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
  opts.gui = true;
  //opts.gui = _.get(opts, 'gui') || false;
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
  .delay(30 * 1000)
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
 * Wait for vm to become responsive, then fulfill promise.
 */
Machine.prototype.wait = function(/*user*/) {
  var self = this;
  return Promise.try(function() {
    var rec = function(counter) {
      var whicher = (self.platform === 'win32') ? 'where' : 'which';
      var shell = (self.platform === 'win32') ? 'cmd.exe' : 'bash';
      return self.script([whicher, shell].join(' '))
      .catch(function(err) {
        if (counter < 6) {
          return Promise.delay(counter * 10 * 1000)
          .then(function() {
            return rec(counter + 1);
          });
        } else {
          throw err;
        }
      });
    };
    return rec(1);
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
Machine.prototype.scriptOld = function(s) {

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
      // 's' is a script string, write it to a temp file.
      var file = path.join(os.tmpdir(), id + '.sh');
      var writer = fs.createWriteStream(file, {mode: '0500'});
      var lines = [
        '#!/bin/bash\n',
        '. ~/.profile\n',
        s + '\n'
      ];
      return Promise.each(lines, function(line) {
        return Promise.fromNode(function(cb) {
          writer.write(line, cb);
        });
      })
      .then(function() {
        return Promise.fromNode(function(cb) {
          writer.close(cb);
        });
      })
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
        return Promise.all([
          result.stdout(),
          result.stderr()
        ])
        .spread(function(stdout, stderr) {
          var data = {
            stderr: stderr,
            stdout: stdout
          };
          throw new VError(err, JSON.stringify(data));
        });
      })
      // Return a result object.
      .then(function() {
        return new Result({
          machine: self,
          stderr: stderr,
          stdout: stdout
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
 * Gets the IP of the vm.
 */
Machine.prototype.ip = function() {
  return this.__execVmrun('getGuestIPAddress')
  .then(function(ip) {
    return ip.trim();
  })
  .catch(function(err) {
    throw new VError(err, 'Error reading ip.');
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
    //console.log(snapshots);
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
