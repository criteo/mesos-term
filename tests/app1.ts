import AppsHelpers = require('./apps_helpers');

describe('app1 (no label, no root)', function() {
  describe('authorizations disabled', function() {
    describe('user john', function() {
      AppsHelpers.testInteractionsWithTerminal(3001, 'john', 'app1');
    });
  });

  describe('authorizations enabled', function() {
    describe('admin user john', function() {
      AppsHelpers.testInteractionsWithTerminal(3000, 'john', 'app1');
    });
  
    describe('non admin user harry', function() {
      AppsHelpers.testUnauthorizedUser(3000, 'harry', 'app1');
    });
  });
});
