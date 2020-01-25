import AppsHelpers = require('../apps_helpers');

describe('app1 (no label, no root)', function () {
    describe('user john can interact with terminal', function () {
        AppsHelpers.testInteractionsWithTerminal('john', 'app1');
    });
});
