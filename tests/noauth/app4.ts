import AppsHelpers = require('../apps_helpers');
import * as Sandbox from "../common/sandbox";

describe('app4 (label GRANTED_TO harry and bob, no user most probably meaning root)', function () {
    describe('user john can interact with terminal', function () {
        AppsHelpers.testInteractionsWithTerminal('john', 'app4');
    });

    describe("sandbox", () => {
        describe('user john can open sandbox', () => {
            Sandbox.testOpenSandbox('john', 'app4');
        });
    });
});
