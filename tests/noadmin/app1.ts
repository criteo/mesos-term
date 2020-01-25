import AppsHelpers = require('../apps_helpers');

describe('app1 (no label, no root)', function () {
    describe('grant access button is not displayed', function () {
        AppsHelpers.testShouldSeeGrantAccessButton('john', 'app1');
    })

    describe('super admin user john', function () {
        AppsHelpers.testInteractionsWithTerminal('john', 'app1');
    });

    describe('non admin user harry', function () {
        AppsHelpers.testUnauthorizedUser('harry', 'app1');
    });
});
