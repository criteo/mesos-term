import AppsHelpers = require('../apps_helpers');
import * as Sandbox from "../common/sandbox";

describe('app1 (no label, no root)', function () {
    this.retries(3);

    describe('grant access button is not displayed', function () {
        AppsHelpers.testShouldSeeGrantAccessButton('john', 'app1');
    })

    describe('super admin user john', function () {
        AppsHelpers.testInteractionsWithTerminal('john', 'app1');
    });

    describe('non admin user harry', function () {
        AppsHelpers.testUnauthorizedUser('harry', 'app1');
    });

    describe("sandbox", () => {
        describe('user john can open sandbox', () => {
            Sandbox.testOpenSandbox('john', 'app1');
        });

        describe('user harry is not authorized to open sandbox', () => {
            Sandbox.testSandboxUnauthorized('harry', 'app1');
        });
    });
});
