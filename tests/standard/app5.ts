import AppsHelpers = require('../apps_helpers');

describe('app5 (no label, root user)', function () {
    this.retries(3);

    describe('super admin user is authorized to interact with terminal', function () {
        AppsHelpers.testInteractionsWithTerminal('john', 'app5');
    });

    describe('user harry is unauthorized', function () {
        AppsHelpers.testUnauthorizedUser('harry', 'app5');
    });

    describe('user bob is unauthorized', function () {
        AppsHelpers.testUnauthorizedUser('bob', 'app5');
    });
});
