import AppsHelpers = require('../apps_helpers');

describe('pod1 (no label, no root)', function () {
    this.timeout(30000);
    this.retries(3);

    describe('user john can interact with terminal', function () {
        AppsHelpers.testInteractionsWithTerminal('john', 'pod1');
    });
});
