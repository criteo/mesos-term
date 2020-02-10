import AppsHelpers = require('../apps_helpers');
import * as Sandbox from "../common/sandbox";

describe('app3 (label GRANTED_TO dev, no root)', function () {
    this.retries(3);

    describe('super admin user', function () {
        AppsHelpers.testInteractionsWithTerminal('john', 'app3');
    });

    describe('user harry', function () {
        AppsHelpers.testUnauthorizedUser('harry', 'app3');
    });

    describe('user bob (in dev group)', function () {
        AppsHelpers.testInteractionsWithTerminal('bob', 'app3');
    });

    describe("sandbox", () => {
        describe('super admin user john can open sandbox', () => {
            Sandbox.testOpenSandbox('john', 'app3');
        });

        describe('user bob (in dev group) is authorized to open sandbox', () => {
            Sandbox.testOpenSandbox('bob', 'app3');
        });

        describe('user harry is not authorized to open sandbox', () => {
            Sandbox.testSandboxUnauthorized('harry', 'app3');
        });
    });
});
