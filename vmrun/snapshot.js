'use strict';

var VError = require('verror');

/*
 * Constructor.
 */
function Snapshot(name, machine) {
  this.name = name;
  this.machine = machine;
}

/*
 * Reverts back to this snapshot.
 */
Snapshot.prototype.revert = function() {
  var self = this;
  // Run revert command.
  return self.machine.__execVmrun('revertToSnapshot', {
    args: [self.name]
  })
  // Wrap errors.
  .catch(function(err) {
    throw new VError(err, 'Error reverting snapshot: %s', self.name);
  });
};

/*
 * Removes this snapshot.
 */
Snapshot.prototype.remove = function() {
  var self = this;
  // Run remove command.
  return self.machine.__execVmrun('deleteSnapshot', {
    args: [self.name]
  })
  // Wrap errors.
  .catch(function(err) {
    throw new VError(err, 'Error removing snapshot: %s', self.name);
  });
};

// Export constructor.
module.exports = Snapshot;
