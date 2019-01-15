import AppsHelpers = require('./apps_helpers');

describe('app6 (label GRANTED_TO dev and harry, no root)', function() {
  describe('authorizations disabled', function() {
    describe('user john', function() {
      AppsHelpers.testInteractionsWithTerminal(3001, 'john', 'app6');
    });
  });

  describe('authorizations enabled', function() {
    describe('admins are enabled', function() {
      describe('super admin user', function() {
        AppsHelpers.testInteractionsWithTerminal(3000, 'john', 'app6');
      });

      describe('user harry', function() {
        AppsHelpers.testInteractionsWithTerminal(3000, 'harry', 'app6');
      });

      describe('user bob (in dev group)', function() {
        AppsHelpers.testInteractionsWithTerminal(3000, 'bob', 'app6');
      });

      describe('user alice (in devOPS & dev groups)', function() {
        AppsHelpers.testInteractionsWithTerminal(3000, 'alice', 'app6');
      });

      describe('user blackhat', function() {
        AppsHelpers.testUnauthorizedUser(3000, 'blackhat', 'app6');
      });
    });

    describe('admins are whitelisted', function()  {
      describe('super admin user', function() {
        AppsHelpers.testInteractionsWithTerminal(3003, 'john', 'app6');
      });

      describe('user harry', function() {
        AppsHelpers.testUnauthorizedUser(3003, 'blackhat', 'app6');
      });

      describe('user bob (in dev group)', function() {
        AppsHelpers.testUnauthorizedUser(3003, 'blackhat', 'app6');
      });

      describe('user alice (in devOPS group)', function() {
        AppsHelpers.testInteractionsWithTerminal(3003, 'alice', 'app6');
      });

      describe('user blackhat', function() {
        AppsHelpers.testUnauthorizedUser(3003, 'blackhat', 'app6');
      });
    });

    describe('admins are disabled', function() {
      describe('super admin user', function() {
        AppsHelpers.testInteractionsWithTerminal(3002, 'john', 'app6');
      });

      describe('user harry', function() {
        AppsHelpers.testUnauthorizedUser(3002, 'harry', 'app6');
      });

      describe('user bob (in dev group)', function() {
        AppsHelpers.testUnauthorizedUser(3002, 'bob', 'app6');
      });

      describe('user alice (in dev group)', function() {
        AppsHelpers.testUnauthorizedUser(3002, 'alice', 'app6');
      });

      describe('user blackhat', function() {
        AppsHelpers.testUnauthorizedUser(3002, 'blackhat', 'app6');
      });
    });
  });
});
