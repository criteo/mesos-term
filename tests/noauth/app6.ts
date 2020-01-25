import AppsHelpers = require('../apps_helpers');

describe('app6 (label GRANTED_TO dev and harry, no root)', function () {
    describe('user john can interact with terminal', function () {
        AppsHelpers.testInteractionsWithTerminal('john', 'app6');
    });
});
