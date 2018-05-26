import AppsHelpers = require('./apps_helpers');

describe('app6 (label GRANTED_TO dev and harry, no root)', function() {
  describe('admin user', function() {
    AppsHelpers.testInteractionsWithTerminal('john', 'app6');
  });

  describe('user harry', function() {
    AppsHelpers.testInteractionsWithTerminal('harry', 'app6');
  });

  describe('user bob (in dev group)', function() {
    AppsHelpers.testInteractionsWithTerminal('bob', 'app6');
  });

  describe('user blackhat', function() {
    AppsHelpers.testUnauthorizedUser('blackhat', 'app6');
  });
});
