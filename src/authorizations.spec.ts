import Assert = require('assert');
import { isUserInAdminGroups } from './authorizations';
import Sinon = require('sinon');

describe('authorizations', function() {
  beforeEach(function() {
    const getStub = Sinon.stub();
    this.req = {
      user: {
        memberOf: [
          'CN=mygroup,DC=domain,DC=com',
          'CN=admins,DC=domain,DC=com'
        ]
      },
      app: {
        get: getStub
      }
    };
  });

  describe('isUserInAdminGroups', function() {
    describe('no groups in ADMIN', function() {
      it('should return false', function() {
        this.req.app.get.withArgs('env_vars').returns({ ADMINS: '' });
        Assert(!isUserInAdminGroups(this.req));
      });
    });

    describe('one group in ADMIN', function() {
      it('should return true when user is admin', function() {
        this.req.app.get.withArgs('env_vars').returns({ ADMINS: 'admins' });
        Assert(isUserInAdminGroups(this.req));
      });

      it('should return false when user is not admin', function() {
        this.req.app.get.withArgs('env_vars').returns({ ADMINS: 'no_admins' });
        Assert(!isUserInAdminGroups(this.req));
      });
    });

    describe('several groups in ADMIN', function() {
      it('should return true when user is admin', function() {
        this.req.app.get.withArgs('env_vars').returns({ ADMINS: 'pqr,admins,abcd,xyz' });
        Assert(isUserInAdminGroups(this.req));
      });

      it('should return false when user is not admin', function() {
        this.req.app.get.withArgs('env_vars').returns({ ADMINS: 'xyz,no_admins,abcd' });
        Assert(!isUserInAdminGroups(this.req));
      });
    });
  });
});
