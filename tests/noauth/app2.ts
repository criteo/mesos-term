import AppsHelpers = require('../apps_helpers');
import * as Sandbox from "../common/sandbox";

describe('app2 (label GRANTED_TO harry, no root)', function () {
    this.retries(3);

    describe('user john can interact with terminal', function () {
        AppsHelpers.testInteractionsWithTerminal('john', 'app2');
    });

    describe("sandbox", () => {
        describe('user john can open sandbox', () => {
            Sandbox.testOpenSandbox('john', 'app2');
        });
    });
});
