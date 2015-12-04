/*
 * File is required by mocha every time it runs. Use this module to load
 * into the ted namespace in each of the test scripts.
 */

var env = require('./env.js');
var util = require('util');
var driver = require('./testDriver.js');

// Setup global ted object.
global.ted = {
  // Environment object used for storing information in the process.ENV.
  env: env,
  // Driver for using vmware.
  driver: driver,
  // Global describe function.
  describe: function(title, fn) {
    // Add a suite for each tag in batch.
    env.vms.each(function(tag) {
      // Use intrinsic global describe function.
      describe(util.format('%s - %s', tag, title), function() {
        return fn(tag);
      });
    });
  }
};
