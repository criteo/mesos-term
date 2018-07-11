import AppsHelpers = require('./apps_helpers');

describe('app4 (label GRANTED_TO harry and bob, no user most probably meaning root)', function() {
  describe('authorizations disabled', function() {
    describe('user john', function() {
      AppsHelpers.testInteractionsWithTerminal(3001, 'john', 'app4');
    });
  });

  describe('authorizations enabled', function() {
    describe('admins are enabled', function() {
      describe('super admin user', function() {
        AppsHelpers.testInteractionsWithTerminal(3000, 'john', 'app4');
      });

      describe('user harry', function() {
        AppsHelpers.testUnauthorizedUserInRootContainer(3000, 'harry', 'app4');
      });

      describe('user bob', function() {
        AppsHelpers.testUnauthorizedUserInRootContainer(3000, 'bob', 'app4');
      });
    });

    describe('admins are disabled', function() {
      describe('super admin user', function() {
        AppsHelpers.testInteractionsWithTerminal(3002, 'john', 'app4');
      });

      describe('user harry', function() {
        AppsHelpers.testUnauthorizedUser(3002, 'harry', 'app4');
      });

      describe('user bob', function() {
        AppsHelpers.testUnauthorizedUser(3002, 'bob', 'app4');
      });
    });
  });
});
