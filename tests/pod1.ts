import AppsHelpers = require('./apps_helpers');
import Helpers = require('./helpers');

describe('pod1 (no label, no root)', function() {
  describe('authorizations disabled', function() {
    describe('user john', function() {
      AppsHelpers.testInteractionsWithTerminal(3001, 'john', 'pod1');
    });
  });
});
