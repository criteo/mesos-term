import AppsHelpers = require('./apps_helpers');

describe('app4 (label GRANTED_TO harry and bob, no user most probably meaning root)', function() {
  describe('admin user', function() {
    AppsHelpers.testInteractionsWithTerminal('john', 'app4');
  });

  describe('user harry', function() {
    AppsHelpers.testUnauthorizedUserInRootContainer('harry', 'app4');
  });

  describe('user bob', function() {
    AppsHelpers.testUnauthorizedUserInRootContainer('bob', 'app4');
  });
});
