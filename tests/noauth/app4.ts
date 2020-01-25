import AppsHelpers = require('../apps_helpers');
import Helpers = require('../helpers');

describe('app4 (label GRANTED_TO harry and bob, no user most probably meaning root)', function () {
    describe('user john can interact with terminal', function () {
        AppsHelpers.testInteractionsWithTerminal('john', 'app4');
    });
});
