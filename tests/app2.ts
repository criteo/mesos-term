import AppsHelpers = require('./apps_helpers');

describe('app2 (label GRANTED_TO harry, no root)', function() {
  describe('authorizations disabled', function() {
    describe('user john', function() {
      AppsHelpers.testInteractionsWithTerminal(3001, 'john', 'app2');
    });

    describe('user harry', function() {
      AppsHelpers.testInteractionsWithTerminal(3001, 'harry', 'app2');
    });

    describe('user james', function() {
      AppsHelpers.testInteractionsWithTerminal(3001, 'james', 'app2');
    });
  });

  describe('authorizations enabled', function() {
    describe('admin user john', function() {
      AppsHelpers.testInteractionsWithTerminal(3000, 'john', 'app2');
    });

    describe('user harry', function() {
      AppsHelpers.testInteractionsWithTerminal(3000, 'harry', 'app2');
    });

    describe('user james', function() {
      AppsHelpers.testUnauthorizedUser(3000, 'james', 'app2');
    });
  });
});
