import AppsHelpers = require('./apps_helpers');

describe('app2 (label GRANTED_TO harry, no root)', function() {
  describe('admin user john', function() {
    AppsHelpers.testAuthorizations('john', 'app2', 200);
    AppsHelpers.testInteractionsWithTerminal('john', 'app2');
  });

  describe('user harry', function() {
    AppsHelpers.testAuthorizations('harry', 'app2', 200);
    AppsHelpers.testInteractionsWithTerminal('harry', 'app2');
  });

  describe('user james', function() {
    AppsHelpers.testAuthorizations('james', 'app2', 403);
  });
});
