import AppsHelpers = require('../apps_helpers');

describe('app3 (label GRANTED_TO dev, no root)', function () {
    describe('user john can interact with terminal', function () {
        AppsHelpers.testInteractionsWithTerminal('john', 'app3');
    });
});
