import AppsHelpers = require("../apps_helpers");
import * as Sandbox from "../common/sandbox";

describe("app6 (label GRANTED_TO dev and harry, no root)", function () {
  this.timeout(30000);
  this.retries(3);

  describe("super admin user", function () {
    AppsHelpers.testInteractionsWithTerminal("john", "app6");
  });

  describe("user harry", function () {
    AppsHelpers.testUnauthorizedUser("harry", "app6");
  });

  describe("user bob (in dev group)", function () {
    AppsHelpers.testUnauthorizedUser("bob", "app6");
  });

  describe("user alice (in devOPS group)", function () {
    AppsHelpers.testInteractionsWithTerminal("alice", "app6");
  });

  describe("user blackhat", function () {
    AppsHelpers.testUnauthorizedUser("blackhat", "app6");
  });

  describe("sandbox", () => {
    describe("user john can open sandbox", () => {
      Sandbox.testOpenSandbox("john", "app6");
    });

    describe("user harry can open sandbox", () => {
      Sandbox.testOpenSandbox("harry", "app6");
    });

    describe("user bob can open sandbox", () => {
      Sandbox.testOpenSandbox("bob", "app6");
    });

    describe("user alice can open sandbox", () => {
      Sandbox.testOpenSandbox("alice", "app6");
    });

    describe("user blackhat can open sandbox", () => {
      Sandbox.testOpenSandbox("blackhat", "app6");
    });
  });
});
