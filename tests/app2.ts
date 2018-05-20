import AppsHelpers = require('./apps_helpers');

describe.only('app1 (label GRANTED_TO harry, no root)', function() {
  describe('admin user', function() {
    AppsHelpers.testAuthorizations('john', 'app2', 200);
    AppsHelpers.testInteractionsWithTerminal('john', 'app2');
  });

  describe('non admin user', function() {
    AppsHelpers.testAuthorizations('harry', 'app2', 200);
    AppsHelpers.testInteractionsWithTerminal('harry', 'app2');
  });
});
