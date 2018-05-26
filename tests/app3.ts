import AppsHelpers = require('./apps_helpers');

describe('app3 (label GRANTED_TO dev, no root)', function() {
  describe('authorizations disabled', function() {
    describe('user john', function() {
      AppsHelpers.testInteractionsWithTerminal(3001, 'john', 'app3');
    });

    describe('user harry', function() {
      AppsHelpers.testInteractionsWithTerminal(3001, 'harry', 'app3');
    });

    describe('user bob (in dev group)', function() {
      AppsHelpers.testInteractionsWithTerminal(3001, 'bob', 'app3');
    });
  });

  describe('authorizations enabled', function() {
    describe('admin user', function() {
      AppsHelpers.testInteractionsWithTerminal(3000, 'john', 'app3');
    });

    describe('user harry', function() {
      AppsHelpers.testUnauthorizedUser(3000, 'harry', 'app3');
    });

    describe('user bob (in dev group)', function() {
      AppsHelpers.testInteractionsWithTerminal(3000, 'bob', 'app3');
    });
  });
});
