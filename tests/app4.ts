import AppsHelpers = require('./apps_helpers');

describe('app4 (label GRANTED_TO harry and bob, no user most probably meaning root)', function() {
  describe('admin user', function() {
    AppsHelpers.testAuthorizations('john', 'app4', 200);
    AppsHelpers.testInteractionsWithTerminal('john', 'app4');
  });

  describe('user harry', function() {
    AppsHelpers.testAuthorizations('harry', 'app4', 403);
  });

  describe('user bob', function() {
    AppsHelpers.testAuthorizations('bob', 'app4', 403);
  });
});
