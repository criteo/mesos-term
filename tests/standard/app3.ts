import AppsHelpers = require('../apps_helpers');

describe('app3 (label GRANTED_TO dev, no root)', function () {
    describe('super admin user', function () {
        AppsHelpers.testInteractionsWithTerminal('john', 'app3');
    });

    describe('user harry', function () {
        AppsHelpers.testUnauthorizedUser('harry', 'app3');
    });

    describe('user bob (in dev group)', function () {
        AppsHelpers.testInteractionsWithTerminal('bob', 'app3');
    });
});
