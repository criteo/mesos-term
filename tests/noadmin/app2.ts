import AppsHelpers = require('../apps_helpers');
import * as Sandbox from "../common/sandbox";

describe('app2 (label GRANTED_TO harry, no root)', function () {
    this.timeout(30000);
    this.retries(3);

    describe('super admin user john', function () {
        AppsHelpers.testInteractionsWithTerminal('john', 'app2');
    });

    describe('user harry', function () {
        AppsHelpers.testUnauthorizedUser('harry', 'app2');
    });

    describe('user james', function () {
        AppsHelpers.testUnauthorizedUser('james', 'app2');
    });

    describe("sandbox", () => {
        describe('user john can open sandbox', () => {
            Sandbox.testOpenSandbox('john', 'app2');
        });

        describe('user harry is not authorized to open sandbox', () => {
            Sandbox.testSandboxUnauthorized('harry', 'app2');
        });

        describe('user james is not authorized to open sandbox', () => {
            Sandbox.testSandboxUnauthorized('james', 'app2');
        });
    });
});
