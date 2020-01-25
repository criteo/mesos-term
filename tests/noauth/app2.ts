import AppsHelpers = require('../apps_helpers');

describe('app2 (label GRANTED_TO harry, no root)', function () {
    describe('user john can interact with terminal', function () {
        AppsHelpers.testInteractionsWithTerminal('john', 'app2');
    });
});
