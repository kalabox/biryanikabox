
var _ = require('lodash');
var Promise = require('bluebird');

describe('kalabox', function() {

  function foo() {
    return Promise.delay(3 * 1000)
    .then(function() {
      var n = _.random(1, 100);
      if (n > 80) {
        throw new Error('Oh no failure: ' + n);
      }
    });
  }

  before(function() {
    //throw new Error('banana failure');
    return foo();
  });

  beforeEach(function() {
    return foo();
  });

  it('should 1', function() {
    return foo();
  });

  it('should 2', function() {
    return foo();
  });

  it('should 3', function() {
    return foo();
  });

});
