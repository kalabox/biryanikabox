var _ = require('lodash');
var driver = require('./testDriver.js');

describe('testing test driver', function() {
  this.timeout(15 * 60 * 1000);

  it('should do something without failing', function() {
    return driver.vm('ubuntu-14.04:clean', {gui: true})
    .run('echo foobar')
    .run('echo blah blah')
    .done();
  });

});
