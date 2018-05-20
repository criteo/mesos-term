import AppsHelpers = require('./apps_helpers');

describe('app6 (label GRANTED_TO dev and harry, no root)', function() {
  describe('admin user', function() {
    AppsHelpers.testAuthorizations('john', 'app6', 200);
    AppsHelpers.testInteractionsWithTerminal('john', 'app6');
  });

  describe('user harry', function() {
    AppsHelpers.testAuthorizations('harry', 'app6', 200);
    AppsHelpers.testInteractionsWithTerminal('harry', 'app6');
  });

  describe('user bob (in dev group)', function() {
    AppsHelpers.testAuthorizations('bob', 'app6', 200);
    AppsHelpers.testInteractionsWithTerminal('bob', 'app6');
  });
});
