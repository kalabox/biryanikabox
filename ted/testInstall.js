
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
    return vm.revert('install').start().promise();
  });

  it('should install git', function() {
    return vm.run('git version').promise();
  });

  it('should install npm', function() {
    return vm.run('npm version').promise();
  });

});
