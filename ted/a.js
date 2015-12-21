var Github = require('./github.js');

var headers = require('./headers.json');
var body = require('./body.json');

var github = new Github({
  key:'',
  secret: ''
});

var webhook = github.webhook(headers, body);

var commit = webhook.commit();

var repo = webhook.repo();

repo.createStatus(commit)
.then(function() {
  console.log('done');
});
