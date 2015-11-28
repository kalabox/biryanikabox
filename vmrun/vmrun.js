'use strict';

var _ = require('lodash');
var Promise = require('bluebird');
var fs = require('fs');
var path = require('path');
var exec = require('child_process').exec;
var uuid = require('uuid');
var os = require('os');
var util = require('util');

/*
 * ############################################################################
 * ############################################################################
 * ############################################################################
 */

function User(u, p) {
  this.u = u;
  this.p = p;
}

/*
 * ############################################################################
 * ############################################################################
 * ############################################################################
 */

function Result(config) {
  this.machine = config.machine;
  this.stdoutFile = config.stdout;
  this.stderrFile = config.stderr;
}

Result.prototype.stdout = function() {
  var self = this;
  return self.machine.getFileRead(self.stdoutFile);
};

Result.prototype.stderr = function() {
  var self = this;
  return self.machine.getFileRead(self.stderrFile);
};

/*
 * ############################################################################
 * ############################################################################
 * ############################################################################
 */
function Machine() {
  this.path = path.join(
    '~',
    'Documents',
    '"Virtual Machines.localized"',
    '"Ubuntu 64-bit 14.04.3.vmwarevm"',
    '"Ubuntu 64-bit 14.04.3.vmx"'
  );
}

Machine.prototype.__exec = function(cmd) {
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

Machine.prototype.__execVmrun = function(action, opts) {
  var self = this;

  var user = _.get(opts, 'user') || self.user;

  var cmd = ['vmrun'];

  function concat(elts) {
    _.each(elts, function(elt) {
      cmd.push(elt);
    });
  }

  if (user) {
    concat([
      '-gu', user.u,
      '-gp', user.p
    ]);
  }

  concat([
    '-T', 'fusion',
    action,
    self.path
  ]);

  if (_.get(opts, 'args')) {
    concat(opts.args);
  }

  return self.__exec(cmd);
};

Machine.prototype.__start = function() {
  return this.__execVmrun('start');
};

Machine.prototype.start = function() {
  var self = this;
  return self.__start()
  .delay(5 * 1000)
  .then(function() {
    return self.wait();
  });
};

Machine.prototype.stop = function() {
  return this.__execVmrun('stop');
};

Machine.prototype.waitDarwin = function(user) {
  return this.__execVmrun('runProgramInGuest', {
    user: user,
    args: ['/bin/echo', 'foo']
  });
};

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

Machine.prototype.toGuestFile = function(fileIn) {
  var self = this;
  var fileOut = path.join(
    '/',
    'home',
    self.user.u,
    path.basename(fileIn)
  );
  console.log('File out: %s', fileOut);
  return fileOut;
};

Machine.prototype.putFile = function(fileIn) {
  var self = this;
  var fileOut = self.toGuestFile(fileIn);
  return self.__execVmrun('CopyFileFromHostToGuest', {
    args: [
      fileIn,
      fileOut
    ]
  });
};

Machine.prototype.getFile = function(remoteFile, localDir) {
  var self = this;
  var localFile = path.join(localDir, path.basename(remoteFile));
  return self.__execVmrun('CopyFileFromGuestToHost', {
    args: [
      remoteFile,
      localFile
    ]
  })
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
      var id = uuid.v1();
      var stdout = self.toGuestFile(id + '-stdout.log');
      var stderr = self.toGuestFile(id + '-stderr.log');
      var cmd = util.format(
        '"%s 1> %s 2> %s"',
        self.toGuestFile(file),
        stdout,
        stderr
      );
      return self.__execVmrun('runScriptInGuest', {
        args: [
          '/bin/bash',
          cmd
        ]
      })
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

Machine.prototype.user = function(u, p) {
  if (u instanceof User) {
    this.user = u;
  } else {
    this.user = new User(u, p);
  }
};

function VMRun() {

}

VMRun.prototype.listMachinesDarwin = function() {
  /*var env = process.env;
  var user = env.USER;
  var path = path.join(
    'Users',
    user,
    'Library',
    'Application Support',
    'VMware Fusion',
    'vmInventory'
  );*/
};

VMRun.prototype.listMachines = function() {
  /*var os = process.platform;
  switch (os) {
    case: 'darwin':
      
    default:
      throw new Error('OS not supported: ' + os);
  }*/
  return Promise.resolve([new Machine()]);
};

VMRun.prototype.user = function(u, p) {
  return new User(u, p);
};

module.exports = new VMRun();
