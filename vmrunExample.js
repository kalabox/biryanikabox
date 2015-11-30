var vmrun = require('./vmrun/vmrun.js');
var uuid = require('uuid');

// Get list of vms.
vmrun.listMachines()
.then(function(machines) {

  var user = vmrun.user('kalabox', '@N*4Hyp@t2UR');
  var machine = machines[0];
  var id = uuid.v4();
  machine.user(user);

  // Start vm.
  return machine.start({gui: true})

  // Run script in vm.
  .then(function() {
    return machine.script('echo ' + id)
    .then(function(result) {
      return result.stdout()
      .then(function(stdout) {
        console.log('STDOUT: ' + stdout);
      });
    });
  })

  // Stop vm.
  .finally(function() {
    return machine.stop();
  });

})
.then(function() {
  console.log('done');
});
