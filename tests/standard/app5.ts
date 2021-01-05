import AppsHelpers = require("../apps_helpers");
import * as Sandbox from "../common/sandbox";

describe("app5 (no label, root user)", function () {
  this.timeout(30000);
  this.retries(3);

  describe("super admin user is authorized to interact with terminal", function () {
    AppsHelpers.testInteractionsWithTerminal("john", "app5");
  });

  describe("user harry is unauthorized", function () {
    AppsHelpers.testUnauthorizedUser("harry", "app5");
  });

  describe("user bob is unauthorized", function () {
    AppsHelpers.testUnauthorizedUser("bob", "app5");
  });

  describe("sandbox", () => {
    describe("super admin user john can open sandbox", () => {
      Sandbox.testOpenSandbox("john", "app5");
    });

    describe("user harry is not authorized to open sandbox", () => {
      Sandbox.testSandboxUnauthorized("harry", "app5");
    });

    describe("user bob is not authorized to open sandbox", () => {
      Sandbox.testSandboxUnauthorized("bob", "app5");
    });
  });
});
