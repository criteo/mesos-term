import { expect } from 'chai';
import { FilterTaskAdmins } from './authorizations';

describe('authorizations', function() {

  describe('FilterTaskAdmins', function() {
    describe('per app admins is disabled', function() {
      it('should return empty array', function() {
        const task_admins_enabled = false;
        const allowed_task_admins = ['foo', 'bar'];
        const task_admins = ['foo'];
        expect(FilterTaskAdmins(task_admins_enabled, allowed_task_admins, task_admins))
          .to.be.empty;
      });
    });

    describe('all admins are allowed', function() {
      it('should return array with "foo"', function() {
        const task_admins_enabled = true;
        const allowed_task_admins: string[] = [];
        const task_admins = ['foo'];
        expect(FilterTaskAdmins(task_admins_enabled, allowed_task_admins, task_admins))
          .to.deep.equal([['foo']]);
      });
    });

    describe('"foo" is explicitly allowed', function() {
      it('should return array with "foo"', function() {
        const task_admins_enabled = true;
        const allowed_task_admins = ['foo'];
        const task_admins = ['foo'];
        expect(FilterTaskAdmins(task_admins_enabled, allowed_task_admins, task_admins))
          .to.deep.equal([['foo'], ['foo']]);
      });
    });
    describe('all admins are authorized', function() {
      it('should return array without "foo"', function() {
        const task_admins_enabled = true;
        const allowed_task_admins: string[] = ['bar'];
        const task_admins = ['foo'];
        expect(FilterTaskAdmins(task_admins_enabled, allowed_task_admins, task_admins))
          .not.to.contain('foo');
      });
    });
  });
});
