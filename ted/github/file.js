'use strict';

var Download = require('download');
var Promise = require('bluebird');
var VError = require('verror');
var fs = require('fs');
var os = require('os');
var path = require('path');
var uuid = require('uuid');

/*
 * Constructor. File object represents a file in the /ted directory of a
 * github repo.
 */
function File(config) {
  if (this instanceof File) {
    this.config = config;
    // URL to download from.
    this.url = config.download_url;
    // Directory where the file should be downloaded to.
    this.dir = os.tmpdir();
    // Name of the file after it has been downloaded.
    this.downloadPath = path.join(
      this.dir,
      path.basename(this.url)
    );
    // Name the file should be renamed to after download.
    this.path = path.join(
      this.dir,
      uuid.v4() + path.extname(config.download_url)
    ); 
  } else {
    return new File(config);
  }
}

/*
 * Downloads the file from the github repo and renames it to a random name.
 */
File.prototype.download = function() {
  var self = this;
  // Download the file.
  return Promise.fromNode(function(cb) {
    new Download()
    .get(self.url, self.dir)
    .run(cb);
  })
  // Rename the file.
  .then(function() {
    return Promise.fromNode(function(cb) {
      fs.rename(self.downloadPath, self.path, cb);
    });
  })
  // Wrap errors.
  .catch(function(err) {
    throw new VError(err, 'Error downloading file: %s', self.url);
  });
};

/*
 * Export the constructor.
 */
module.exports = File;
