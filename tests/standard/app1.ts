import AppsHelpers = require("../apps_helpers");
import Helpers = require("../helpers");
import * as Sandbox from "../common/sandbox";

describe("app1 (no label, no root)", function () {
  this.timeout(30000);
  this.retries(3);

  describe("admins are enabled", function () {
    describe("super admin user john can interact with terminal", function () {
      AppsHelpers.testInteractionsWithTerminal("john", "app1");
    });

    describe("non admin user harry is not authorized to open terminal", function () {
      AppsHelpers.testUnauthorizedUser("harry", "app1");
    });

    describe("sandbox", () => {
      describe("super admin user john can open sandbox", () => {
        Sandbox.testOpenSandbox("john", "app1");
      });

      describe("non admin user harry is not authorized to open sandbox", () => {
        Sandbox.testSandboxUnauthorized("harry", "app1");
      });
    });

    describe("delegation enabled", function () {
      describe("grant access button should be displayed", function () {
        AppsHelpers.testShouldSeeGrantAccessButton("john", "app1");
      });

      describe("john use grant access button to delegate rights to harry by giving token", function () {
        AppsHelpers.testShouldGrantAccessViaButtonAndToken(
          "john",
          "harry",
          "app1"
        );
      });

      describe("john use grant access button to delegate rights to harry by giving url", function () {
        AppsHelpers.testShouldGrantAccessViaButtonAndUrl(
          "john",
          "harry",
          "app1"
        );
      });

      describe("abort access delegation", function () {
        AppsHelpers.testShouldAbortAccessDelegation("john", "app1");
      });

      describe("non admin user harry has delegated rights", function () {
        it("should be able to interact with terminal", async function () {
          this.timeout(20000);
          const instanceId = this.mesosTaskIds["app1"];
          const accessToken = await Helpers.getDelegation(
            "john",
            "harry",
            instanceId
          );
          await AppsHelpers.checkInteractionsWithTerminalUsingAccessToken(
            "harry",
            accessToken,
            instanceId
          );
        });
      });

      describe("token produced for another container", function () {
        it("should be unauthorized", async function () {
          this.timeout(20000);
          const instanceId1 = this.mesosTaskIds["app1"];
          const instanceId2 = this.mesosTaskIds["app2"];

          // we authorize instance of app1 and user tries to connect to instance of app2 with the token.
          const accessToken = await Helpers.getDelegation(
            "john",
            "harry",
            instanceId2
          );
          return AppsHelpers.checkBadAccessToken(
            "harry",
            accessToken,
            instanceId1
          );
        });
      });

      describe("token produced for another person", function () {
        it("should be unauthorized", async function () {
          this.timeout(20000);
          const instanceId = this.mesosTaskIds["app1"];

          // we authorize instance of app1 for user harry but user bob tries to use it.
          const accessToken = await Helpers.getDelegation(
            "john",
            "harry",
            instanceId
          );
          return AppsHelpers.checkBadAccessToken(
            "bob",
            accessToken,
            instanceId
          );
        });
      });
    });
  });
});
