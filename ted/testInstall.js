
ted.describe('kalabox', function(tag) {

  var vm = ted.driver.vm(tag);

  after(function() {
    return vm.done();
  });

  it('should have a working echo', function() {
    return vm.run('which echo')
    .run('which foo')
    .promise();
  });

  it('should install dependencies correctly', function() {
    return vm.run('../scripts/build/build_deps_linux.sh')
    .run('git version')
    .run('npm version')
    //.snapshot('deps')
    .promise();
  });

  it('should be in dev mode', function() {
    return vm.run('mkdir /home/kalabox/.kalabox')
    //.revert('deps')
    .run('echo "{"devMode": "true"}" > /home/kalabox/.kalabox/kalabox.json')
    .promise();
  });

  it.skip('should install kalabox correctly', function() {
    return vm.run('../scripts/install/install_linux.sh')
    .revert('deps')
    .run('kbox config')
    .promise();
  });

  /*it('should install correctly', function() {
    return ted.driver.vm(tag, {gui: true})
    .run('which echo')
    .run('../scripts/build/build_deps_linux.sh')
    .run('../scripts/install/install_linux.sh')
    .restart()
    .run('/home/kalabox/kalabox/bin/kbox.js config')
    .done();
  });*/

});
