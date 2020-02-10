import AppsHelpers = require('../apps_helpers');
import * as Sandbox from "../common/sandbox";

describe('app6 (label GRANTED_TO dev and harry, no root)', function () {
    this.retries(3);

    describe('super admin user', function () {
        AppsHelpers.testInteractionsWithTerminal('john', 'app6');
    });

    describe('user harry', function () {
        AppsHelpers.testUnauthorizedUser('harry', 'app6');
    });

    describe('user bob (in dev group)', function () {
        AppsHelpers.testUnauthorizedUser('bob', 'app6');
    });

    describe('user alice (in dev group)', function () {
        AppsHelpers.testUnauthorizedUser('alice', 'app6');
    });

    describe('user blackhat', function () {
        AppsHelpers.testUnauthorizedUser('blackhat', 'app6');
    });

    describe("sandbox", () => {
        describe('user john can open sandbox', () => {
            Sandbox.testOpenSandbox('john', 'app6');
        });

        describe('user harry is not authorized to open sandbox', () => {
            Sandbox.testSandboxUnauthorized('harry', 'app6');
        });

        describe('user bob is not authorized to open sandbox', () => {
            Sandbox.testSandboxUnauthorized('bob', 'app6');
        });

        describe('user alice is not authorized to open sandbox', () => {
            Sandbox.testSandboxUnauthorized('alice', 'app6');
        });

        describe('user blackhat is not authorized to open sandbox', () => {
            Sandbox.testSandboxUnauthorized('blackhat', 'app6');
        });
    });
});
