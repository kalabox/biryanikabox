'use strict';

var _ = require('lodash');

/*
 * Set list of vms.
 */
function set(arr) {
  // Serialize and set list of vms.
  process.env.VM_LIST = JSON.stringify(arr);
}

/*
 * Reset list of vms (clear).
 */
function reset() {
  this.set([]);
}

/*
 * Get list of vms.
 */
function get() {
  // Make sure environmental variable exists.
  if (!process.env.VM_LIST) {
    this.reset();
  }
  // Get and deserialize list of vms.
  return JSON.parse(process.env.VM_LIST);
}

/*
 * Add a vm.
 */
function add(tag) {
  var arr = this.get();
  arr.push(tag);
  this.set(arr);
}

/*
 * Get list of vms.
 */
function list() {
  return this.get();
}

/*
 * Call function once for each vm with vm as the first and only argument.
 */
function each(fn) {
  _.each(this.get(), fn);
}

/*
 * Export api.
 */
module.exports = {
  set: set,
  reset: reset,
  get: get,
  add: add,
  list: list,
  each: each
};
