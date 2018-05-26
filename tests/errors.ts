import AppsHelpers = require('./apps_helpers');

describe('errors', function() {
  AppsHelpers.testNoTaskId('john', 'bad-task-id');
});
