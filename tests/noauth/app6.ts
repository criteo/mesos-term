import AppsHelpers = require('../apps_helpers');
import * as Sandbox from "../common/sandbox";

describe('app6 (label GRANTED_TO dev and harry, no root)', function () {
    this.retries(3);

    describe('user john can interact with terminal', function () {
        AppsHelpers.testInteractionsWithTerminal('john', 'app6');
    });

    describe("sandbox", () => {
        describe('user john can open sandbox', () => {
            Sandbox.testOpenSandbox('john', 'app6');
        });
    });
});
