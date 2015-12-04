'use strict';

var _ = require('lodash');

function set(arr) {
  process.env.VM_LIST = JSON.stringify(arr);
}

function reset() {
  this.set([]);
}

function get() {
  if (!process.env.VM_LIST) {
    this.reset();
  }
  return JSON.parse(process.env.VM_LIST);
}

function add(tag) {
  var arr = this.get();
  arr.push(tag);
  this.set(arr);
}

function list() {
  return this.get();
}

function each(fn) {
  _.each(this.get(), fn);
}

module.exports = {
  set: set,
  reset: reset,
  get: get,
  add: add,
  list: list,
  each: each
};
