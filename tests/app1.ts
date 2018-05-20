import AppsHelpers = require('./apps_helpers');

/*
 * This application is run with user myuser but does not have any label to
 * grant debugging capabilities.
 */
describe('app1 (no label, no root)', function() {
  describe('admin user', function() {
    AppsHelpers.testAuthorizations('john', 'app1', 200);
    AppsHelpers.testInteractionsWithTerminal('john', 'app1');
  });

  describe('non admin user', function() {
    AppsHelpers.testAuthorizations('harry', 'app1', 403);
  });
});
