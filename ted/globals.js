/*
 * File is required by mocha every time it runs. Use this module to load
 * into the ted namespace in each of the test scripts.
 */

var _ = require('lodash');
var util = require('util');
var driver = require('./testDriver.js');

// Setup global ted object.
global.ted = {
  // Global state.
  state: {
    sha: 'HEAD',
    vms: []
  },
  // Driver for using vmware.
  driver: driver,
  // Global describe function.
  describe: function(title, fn) {
    var self = this;
    // Add a suite for each tag in batch.
    _.each(self.state.vms, function(tag) {
      // Use intrinsic global describe function.
      describe(
        util.format('%s#%s - %s', tag, self.state.sha, title), function() {
        return fn({
          tag: tag,
          sha: self.state.sha
        });
      });
    });
  }
};
