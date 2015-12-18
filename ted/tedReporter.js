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

  runner.on('start', function() {
    opts.events.emit('start', {total: total});
  });

  runner.on('test', function(test) {
    opts.events.emit('test', test);
  });

  runner.on('test end', function(test) {
    opts.events.emit('test-end', test);
  });

  runner.on('hook', function(hook) {
    opts.events.emit('hook', hook);
  });

  runner.on('hook end', function(hook) {
    opts.events.emit('hook-end', hook);
  });

  runner.on('pass', function(test) {
    opts.events.emit('pass', clean(test));
  });

  runner.on('fail', function(test, err) {
    test = clean(test);
    test.err = err.message;
    test.stack = err.stack || null;
    opts.events.emit('fail', test);
  });

  runner.on('end', function() {
    opts.events.emit('end', self.stats);
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
