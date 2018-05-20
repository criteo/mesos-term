import AppsHelpers = require('./apps_helpers');

describe('app1 (no label, no root)', function() {
  describe('admin user john', function() {
    AppsHelpers.testAuthorizations('john', 'app1', 200);
    AppsHelpers.testInteractionsWithTerminal('john', 'app1');
  });

  describe('non admin user harry', function() {
    AppsHelpers.testAuthorizations('harry', 'app1', 403);
  });
});
