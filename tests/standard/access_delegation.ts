import helpers = require("../helpers");
import * as AppsHelpers from "../apps_helpers";
import webdriver = require("selenium-webdriver");
import { decode } from "jsonwebtoken";
import assert = require("assert");

describe("access delegation", function () {
  this.timeout(30000);
  this.retries(3);

  it("should allow access to super admin", function () {
    return helpers.withChrome(async function (driver) {
      await driver.get(`http://john:password@localhost:3000/api/delegate`);
      const el = await driver.wait(
        webdriver.until.elementLocated(webdriver.By.css("p")),
        5000
      );
      return driver.wait(
        webdriver.until.elementTextContains(el, "This endpoint allows"),
        5000
      );
    });
  });

  it("should deny access to non super admin", function () {
    return helpers.withChrome(async function (driver) {
      await driver.get(`http://harry:password@localhost:3000/api/delegate`);
      const el = await driver.wait(
        webdriver.until.elementLocated(webdriver.By.css(".error-code")),
        5000
      );
      return driver.wait(
        webdriver.until.elementTextContains(el, "HTTP ERROR 403"),
        5000
      );
    });
  });

  describe("should generate token with correct expiration", function () {
    it("1h", async function () {
      const instanceId = this.mesosTaskIds["app1"];

      const token = await AppsHelpers.generateAccessToken(
        "john",
        "harry",
        instanceId,
        "1h"
      );
      const json = decode(token) as any;
      assert.equal(json.exp, json.iat + 3600);
    });

    it("1d", async function () {
      const instanceId = this.mesosTaskIds["app1"];

      const token = await AppsHelpers.generateAccessToken(
        "john",
        "harry",
        instanceId,
        "1d"
      );
      const json = decode(token) as any;
      assert.equal(json.exp, json.iat + 3600 * 24);
    });
  });

  describe("non admin user harry has delegated rights", function () {
    it("should be able to interact with terminal", async function () {
      const instanceId = this.mesosTaskIds["app1"];
      const accessToken = await helpers.getDelegation(
        "john",
        "harry",
        instanceId
      );
      return AppsHelpers.checkInteractionsWithTerminalUsingAccessToken(
        "harry",
        accessToken,
        instanceId
      );
    });
  });

  describe("non admin user harry has delegated rights to root container", function () {
    it("should be able to interact with terminal", async function () {
      const instanceId = this.mesosTaskIds["app5"];
      const accessToken = await helpers.getDelegation(
        "john",
        "harry",
        instanceId
      );
      return AppsHelpers.checkInteractionsWithTerminalUsingAccessToken(
        "harry",
        accessToken,
        instanceId
      );
    });
  });
});
