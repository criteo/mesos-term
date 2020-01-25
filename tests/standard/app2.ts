import AppsHelpers = require('../apps_helpers');

describe('app2 (label GRANTED_TO harry, no root)', function () {
    describe('super admin user john can interact with terminal', function () {
        AppsHelpers.testInteractionsWithTerminal('john', 'app2');
    });

    describe('user harry can interact with terminal', function () {
        AppsHelpers.testInteractionsWithTerminal('harry', 'app2');
    });

    describe('grant access button is displayed to john', function () {
        AppsHelpers.testShouldSeeGrantAccessButton('john', 'app2');
    })

    describe('grant access button is not displayed to harry', function () {
        AppsHelpers.testShouldNotSeeGrantAccessButton('harry', 'app2');
    })

    describe('user james is unauthorized', function () {
        AppsHelpers.testUnauthorizedUser('james', 'app2');
    });
});
