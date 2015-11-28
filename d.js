var vmrun = require('./vmrun/vmrun.js');

vmrun.listMachines()
.then(function(machines) {
  var user = vmrun.user('kalabox', '@N*4Hyp@t2UR');
  var machine = machines[0];
  machine.user(user);
  return machine.start()
  .then(function() {
    return machine.script('echo foofoofoofoo')
    .then(function(result) {
      return result.stdout()
      .then(function(stdout) {
        console.log('STDOUT: ' + stdout);
      });
    });
  })
  .finally(function() {
    return machine.stop();
  });
})
.then(function() {
  console.log('done');
});
