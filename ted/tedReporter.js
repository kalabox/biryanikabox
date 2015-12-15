/**
 * Module dependencies.
 */

//var Base = require('./base');

/**
 * Expose `List`.
 */

//exports = module.exports = List;

module.exports = List;

/**
 * Initialize a new `List` test reporter.
 *
 * @api public
 * @param {Runner} runner
 */
function List(runner) {
  //Base.call(this, runner);

  var self = this;
  var total = runner.total;

  var oldWrite = process.stdout.write;

  process.stdout.write = function() {};

  runner.on('start', function() {
    //global.events.emit('start', {total: total});
    oldWrite(JSON.stringify(['start7', { total: total }]));
  });

  runner.on('pass', function(test) {
    oldWrite(JSON.stringify(['pass7', clean(test)]));
  });

  runner.on('fail', function(test, err) {
    test = clean(test);
    test.err = err.message;
    test.stack = err.stack || null;
    oldWrite(JSON.stringify(['fail7', test]));
  });

  runner.on('end', function() {
    //process.stdout.write(JSON.stringify(['end7', self.stats]));
    oldWrite(JSON.stringify(['end', self.stats]));
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
