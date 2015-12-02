
ted.describe('foo', function(tag) {

  /*
   * tag = <machine>:<snapshot>
   */

  it('should echo correctly', function() {
    return ted.driver.vm(tag)
    .run('echo foo')
    .run('echo bar')
    .done();
  });

  it('should fail when it does something stupid', function() {
    return ted.driver.vm(tag)
    .run('echo7 foo')
    .done();
  });

});
