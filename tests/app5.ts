import AppsHelpers = require('./apps_helpers');

describe('app5 (no label, root user)', function() {
  describe('admin user', function() {
    AppsHelpers.testAuthorizations('john', 'app5', 200);
    AppsHelpers.testInteractionsWithTerminal('john', 'app5');
  });

  describe('user harry', function() {
    AppsHelpers.testAuthorizations('harry', 'app5', 403);
  });

  describe('user bob', function() {
    AppsHelpers.testAuthorizations('bob', 'app5', 403);
  });
});
