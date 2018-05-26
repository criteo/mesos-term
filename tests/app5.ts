import AppsHelpers = require('./apps_helpers');

describe('app5 (no label, root user)', function() {
  describe('admin user', function() {
    AppsHelpers.testInteractionsWithTerminal('john', 'app5');
  });

  describe('user harry', function() {
    AppsHelpers.testUnauthorizedUserInRootContainer('harry', 'app5');
  });

  describe('user bob', function() {
    AppsHelpers.testUnauthorizedUserInRootContainer('bob', 'app5');
  });
});
