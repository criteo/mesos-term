import AppsHelpers = require('./apps_helpers');

describe('app6 (label GRANTED_TO dev and harry, no root)', function() {
  describe('authorizations disabled', function() {
    describe('user john', function() {
      AppsHelpers.testInteractionsWithTerminal(3001, 'john', 'app6');
    });

    describe('user harry', function() {
      AppsHelpers.testInteractionsWithTerminal(3001, 'harry', 'app6');
    });

    describe('user bob (in dev group)', function() {
      AppsHelpers.testInteractionsWithTerminal(3001, 'bob', 'app6');
    });

    describe('user blackhat', function() {
      AppsHelpers.testInteractionsWithTerminal(3001, 'blackhat', 'app6');
    });
  });

  describe('authorizations enabled', function() {
    describe('admin user', function() {
      AppsHelpers.testInteractionsWithTerminal(3000, 'john', 'app6');
    });

    describe('user harry', function() {
      AppsHelpers.testInteractionsWithTerminal(3000, 'harry', 'app6');
    });

    describe('user bob (in dev group)', function() {
      AppsHelpers.testInteractionsWithTerminal(3000, 'bob', 'app6');
    });

    describe('user blackhat', function() {
      AppsHelpers.testUnauthorizedUser(3000, 'blackhat', 'app6');
    });
  });
});
