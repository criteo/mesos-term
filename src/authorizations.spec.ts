import Assert = require('assert');
import { isUserAdmin } from './authorizations';
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

  describe('isUserAdmin', function() {
    describe('no groups in ADMIN', function() {
      it('should return false', function() {
        this.req.app.get.withArgs('env_vars').returns({ ADMINS: '' });
        Assert(!isUserAdmin(this.req));
      });
    });

    describe('one group in ADMIN', function() {
      it('should return true when user is admin', function() {
        this.req.app.get.withArgs('env_vars').returns({ ADMINS: 'admins' });
        Assert(isUserAdmin(this.req));
      });

      it('should return false when user is not admin', function() {
        this.req.app.get.withArgs('env_vars').returns({ ADMINS: 'no_admins' });
        Assert(!isUserAdmin(this.req));
      });
    });

    describe('several groups in ADMIN', function() {
      it('should return true when user is admin', function() {
        this.req.app.get.withArgs('env_vars').returns({ ADMINS: 'pqr,admins,abcd,xyz' });
        Assert(isUserAdmin(this.req));
      });

      it('should return false when user is not admin', function() {
        this.req.app.get.withArgs('env_vars').returns({ ADMINS: 'xyz,no_admins,abcd' });
        Assert(!isUserAdmin(this.req));
      });
    });
  });
});
