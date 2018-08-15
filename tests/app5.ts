import AppsHelpers = require('./apps_helpers');
import Helpers = require('./helpers');

describe('app5 (no label, root user)', function() {
  describe('authorizations disabled', function() {
    describe('user john', function() {
      AppsHelpers.testInteractionsWithTerminal(3001, 'john', 'app5');
    });
  });

  describe('authorizations enabled', function() {
    describe('super admin user', function() {
      AppsHelpers.testInteractionsWithTerminal(3000, 'john', 'app5');
    });

    describe('user harry', function() {
      AppsHelpers.testUnauthorizedUser(3000, 'harry', 'app5');
    });

    describe('user bob', function() {
      AppsHelpers.testUnauthorizedUser(3000, 'bob', 'app5');
    });
  });

  describe('delegation enabled', function() {
    describe('non admin user harry has delegated rights to root container', function() {
      it('should be able to interact with terminal', function() {
        this.timeout(20000);
        const instanceId = this.mesosTaskIds['app5'];
        return Helpers.getDelegation(3000, 'john', 'harry', instanceId)
          .then(function(accessToken: string) {
            return AppsHelpers.checkInteractionsWithTerminalUsingAccessToken(3000, 'harry', accessToken, instanceId);
          });
      });
    });
  });
});
