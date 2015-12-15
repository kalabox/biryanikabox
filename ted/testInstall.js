
ted.describe('kalabox', function(tag) {

  var vm = null;

  before(function() {
    vm = ted.driver.install(tag);
    return vm.promise();
  });

  after(function() {
    return vm.cleanup();
  });

  beforeEach(function() {
    //return vm.revert('install').start().promise();
  });

  describe('[kbox version]', function() {
    it('should work', function() {
      return vm.run('kbox version').promise();
    });
  });

  describe('[kbox config]', function() {
    it('should work', function() {
      return vm.run('kbox config').promise();
    });
  });

  describe('[kbox update]', function() {
    it('should provision', function() {
      return vm.run('echo "kalabox" | sudo -S kbox update')
      .run('kbox down')
      .promise();
    });
  });

  /*describe('[pantheon site]', function() {
    it('should create', function() {
      var cmd = [
        'kbox', 'create', 'pantheon',
        '--',
        '--email', 'ben@kalamuna.com',
        '--password', 'hungry1sB3n',
        '--site', 'playbox',
        '--env', 'dev',
        '--name', 'playbox'
      ].join(' ');
      return vm.run(cmd).promise();
    });
  });*/

});
