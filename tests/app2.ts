import AppsHelpers = require('./apps_helpers');

describe('app2 (label GRANTED_TO harry, no root)', function() {
  describe('admin user john', function() {
    AppsHelpers.testInteractionsWithTerminal('john', 'app2');
  });

  describe('user harry', function() {
    AppsHelpers.testInteractionsWithTerminal('harry', 'app2');
  });

  describe('user james', function() {
    AppsHelpers.testUnauthorizedUser('james', 'app2');
  });
});
