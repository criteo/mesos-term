import AppsHelpers = require('./apps_helpers');

describe('errors', function() {
  describe('authorizations disabled', function() {
    AppsHelpers.testNoTaskId(3001,'john', 'bad-task-id');
  });

  describe('authorizations enabled', function() {
    AppsHelpers.testNoTaskId(3000,'john', 'bad-task-id');
  });
});
