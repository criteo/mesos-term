import AppsHelpers = require('./apps_helpers');
import Helpers = require('./helpers');

describe('app1 (no label, no root)', function() {
  describe('authorizations disabled', function() {
    describe('user john', function() {
      AppsHelpers.testInteractionsWithTerminal(3001, 'john', 'app1');
    });
  });

  describe('authorizations enabled', function() {
    describe('admins are enabled', function() {
      describe('super admin user john', function() {
        AppsHelpers.testInteractionsWithTerminal(3000, 'john', 'app1');
      });
  
      describe('non admin user harry', function() {
        AppsHelpers.testUnauthorizedUser(3000, 'harry', 'app1');
      });
    });

    describe('admins are disabled', function() {
      describe('super admin user john', function() {
        AppsHelpers.testInteractionsWithTerminal(3002, 'john', 'app1');
      });
  
      describe('non admin user harry', function() {
        AppsHelpers.testUnauthorizedUser(3002, 'harry', 'app1');
      });
    });
  });

  describe('delegation enabled', function() {
    describe('non admin user harry has delegated rights', function() {
      it('should be able to interact with terminal', function() {
        this.timeout(10000);
        const instanceId = this.mesosTaskIds['app1'];
        return Helpers.getDelegation(3000, 'john', 'harry', instanceId)
          .then(function(accessToken: string) {
            return AppsHelpers.checkInteractionsWithTerminalUsingAccessToken(3000, 'harry', accessToken, instanceId);
          });
      });
    });

    describe('token produced for another container', function() {
      it('should be unauthorized', function() {
        this.timeout(10000);
        const instanceId1 = this.mesosTaskIds['app1'];
        const instanceId2 = this.mesosTaskIds['app2'];

        // we authorize instance of app1 and user tries to connect to instance of app2 with the token.
        return Helpers.getDelegation(3000, 'john', 'harry', instanceId2)
          .then(function(accessToken: string) {
            return AppsHelpers.checkBadAccessToken(3000, 'harry', accessToken, instanceId1);
          });
      });
    });

    describe.only('token produced for another person', function() {
      it('should be unauthorized', function() {
        this.timeout(10000);
        const instanceId = this.mesosTaskIds['app1'];

        // we authorize instance of app1 for user harry but user bob tries to use it.
        return Helpers.getDelegation(3000, 'john', 'harry', instanceId)
          .then(function(accessToken: string) {
            return AppsHelpers.checkBadAccessToken(3000, 'bob', accessToken, instanceId);
          });
      });
    });
  });
});
