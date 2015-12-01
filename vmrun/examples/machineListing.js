'use strict';

var vmrun = require('../vmrun.js');

vmrun.listMachines()
.then(function(machines) {
  console.log(machines);
});
