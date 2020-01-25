import AppsHelpers = require('../apps_helpers');
import Helpers = require('../helpers');

describe('app5 (no label, root user)', function () {
    describe('user john can interact with terminal', function () {
        AppsHelpers.testInteractionsWithTerminal('john', 'app5');
    });
});
