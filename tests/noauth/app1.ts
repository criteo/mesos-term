import AppsHelpers = require('../apps_helpers');
import * as Sandbox from "../common/sandbox";

describe('app1 (no label, no root)', function () {
    describe('user john can interact with terminal', function () {
        AppsHelpers.testInteractionsWithTerminal('john', 'app1');
    });

    describe("sandbox", () => {
        describe('user john can open sandbox', () => {
            Sandbox.testOpenSandbox('john', 'app1');
        });
    });
});
