/**
 * Module dependencies.
 */

var Base = require('mocha').reporters.Base;

/**
 * Expose `List`.
 */

exports = module.exports = List;

/**
 * Initialize a new `List` test reporter.
 *
 * @api public
 * @param {Runner} runner
 */
function List(runner, opts) {
  Base.call(this, runner);

  var self = this;
  var total = runner.total;
  var events = opts.events;

  runner.on('start', function() {
    //events.emit('start', {total: total});
    console.log(JSON.stringify(['start', { total: total }]));
  });

  runner.on('test', function(test) {
    events.emit('test', test);
  });

  runner.on('test end', function(test) {
    events.emit('test-end', test);
  });

  runner.on('hook', function(hook) {
    //events.emit('hook', hook);
  });

  runner.on('hook end', function(hook) {
    //events.emit('hook-end', hook);
  });

  runner.on('pass', function(test) {
    //events.emit('pass', clean(test));
    console.log(JSON.stringify(['pass', clean(test)]));
  });

  runner.on('fail', function(test, err) {
    test = clean(test);
    test.err = err.message;
    test.stack = err.stack || null;
    console.log(JSON.stringify(['fail', test]));
    //events.emit('fail', test);
  });

  runner.on('end', function() {
    console.log(JSON.stringify(['end', self.stats]));
    //events.emit('end', self.stats);
  });
}

/**
 * Return a plain-object representation of `test`
 * free of cyclic properties etc.
 *
 * @api private
 * @param {Object} test
 * @return {Object}
 */
function clean(test) {
  return {
    title: test.title,
    fullTitle: test.fullTitle(),
    duration: test.duration
  };
}
