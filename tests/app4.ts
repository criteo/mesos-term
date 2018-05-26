import AppsHelpers = require('./apps_helpers');

describe('app4 (label GRANTED_TO harry and bob, no user most probably meaning root)', function() {
  describe('authorizations disabled', function() {
    describe('user john', function() {
      AppsHelpers.testInteractionsWithTerminal(3001, 'john', 'app4');
    });

    describe('user harry', function() {
      AppsHelpers.testInteractionsWithTerminal(3001, 'harry', 'app4');
    });

    describe('user bob', function() {
      AppsHelpers.testInteractionsWithTerminal(3001, 'bob', 'app4');
    });
  });

  describe('authorizations enabled', function() {
    describe('admin user', function() {
      AppsHelpers.testInteractionsWithTerminal(3000, 'john', 'app4');
    });

    describe('user harry', function() {
      AppsHelpers.testUnauthorizedUserInRootContainer(3000, 'harry', 'app4');
    });

    describe('user bob', function() {
      AppsHelpers.testUnauthorizedUserInRootContainer(3000, 'bob', 'app4');
    });
  });
});
