import AppsHelpers = require('./apps_helpers');

describe('app3 (label GRANTED_TO dev, no root)', function() {
  describe('admin user', function() {
    AppsHelpers.testAuthorizations('john', 'app3', 200);
    AppsHelpers.testInteractionsWithTerminal('john', 'app3');
  });

  describe('user harry', function() {
    AppsHelpers.testAuthorizations('harry', 'app3', 403);
  });

  describe('user bob (in dev group)', function() {
    AppsHelpers.testAuthorizations('bob', 'app3', 200);
    AppsHelpers.testInteractionsWithTerminal('bob', 'app3');
  });
});
