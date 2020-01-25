import AppsHelpers = require('../apps_helpers');

describe('app2 (label GRANTED_TO harry, no root)', function () {
    describe('super admin user john', function () {
        AppsHelpers.testInteractionsWithTerminal('john', 'app2');
    });

    describe('user harry', function () {
        AppsHelpers.testUnauthorizedUser('harry', 'app2');
    });

    describe('user james', function () {
        AppsHelpers.testUnauthorizedUser('james', 'app2');
    });
});
