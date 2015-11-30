'use strict';

/*
 * Constructor.
 */
function Result(config) {
  this.machine = config.machine;
  this.stdoutFile = config.stdout;
  this.stderrFile = config.stderr;
}

/*
 * Read stdout from vm.
 */
Result.prototype.stdout = function() {
  var self = this;
  return self.machine.getFileRead(self.stdoutFile);
};

/*
 * Read stderr from vm.
 */
Result.prototype.stderr = function() {
  var self = this;
  return self.machine.getFileRead(self.stderrFile);
};

// Export constructor.
module.exports = Result;
