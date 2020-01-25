import AppsHelpers = require('../apps_helpers');

describe('pod1 (no label, no root)', function () {
    describe('user john can interact with terminal', function () {
        AppsHelpers.testInteractionsWithTerminal('john', 'pod1');
    });
});
