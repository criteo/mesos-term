import AppsHelpers = require('./apps_helpers');

describe('app5 (no label, root user)', function() {
  describe('authorizations disabled', function() {
    describe('user john', function() {
      AppsHelpers.testInteractionsWithTerminal(3001, 'john', 'app5');
    });

    describe('user harry', function() {
      AppsHelpers.testInteractionsWithTerminal(3001, 'harry', 'app5');
    });

    describe('user bob', function() {
      AppsHelpers.testInteractionsWithTerminal(3001, 'bob', 'app5');
    });
  });

  describe('authorizations enabled', function() {
    describe('admin user', function() {
      AppsHelpers.testInteractionsWithTerminal(3000, 'john', 'app5');
    });

    describe('user harry', function() {
      AppsHelpers.testUnauthorizedUserInRootContainer(3000, 'harry', 'app5');
    });

    describe('user bob', function() {
      AppsHelpers.testUnauthorizedUserInRootContainer(3000, 'bob', 'app5');
    });
  });
});
