import AppsHelpers = require("../apps_helpers");
import * as Sandbox from "../common/sandbox";

describe("app4 (label GRANTED_TO harry and bob, no user most probably meaning root)", function () {
  this.timeout(30000);
  this.retries(3);

  describe("super admin user", function () {
    AppsHelpers.testInteractionsWithTerminal("john", "app4");
  });

  describe("user harry", function () {
    AppsHelpers.testUnauthorizedUser("harry", "app4");
  });

  describe("user bob", function () {
    AppsHelpers.testUnauthorizedUser("bob", "app4");
  });

  describe("sandbox", () => {
    describe("super admin user john can open sandbox", () => {
      Sandbox.testOpenSandbox("john", "app4");
    });

    describe("user harry is not authorized to open sandbox", () => {
      Sandbox.testSandboxUnauthorized("harry", "app4");
    });

    describe("user bob is not authorized to open sandbox", () => {
      Sandbox.testSandboxUnauthorized("bob", "app4");
    });
  });
});
