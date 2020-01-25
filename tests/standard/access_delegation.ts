import helpers = require('../helpers');
import * as AppsHelpers from "../apps_helpers";
import webdriver = require('selenium-webdriver');
import Bluebird = require('bluebird');


describe('access delegation', function () {
  it('should allow access to super admin', function () {
    this.timeout(10000);

    return helpers.withChrome(function (driver) {
      return Bluebird.resolve(driver.get(`http://john:password@localhost:3000/api/delegate`))
        .then(function () {
          return Bluebird.resolve(
            driver.wait(webdriver.until.elementLocated(webdriver.By.css("p")), 5000))
        })
        .then(function (el) {
          return Bluebird.resolve(driver.wait(webdriver.until.elementTextContains(el, 'This endpoint allows'), 5000));
        });
    });
  });

  it('should deny access to non super admin', function () {
    this.timeout(10000);

    return helpers.withChrome(function (driver) {
      return Bluebird.resolve(driver.get(`http://harry:password@localhost:3000/api/delegate`))
        .then(function () {
          return Bluebird.resolve(
            driver.wait(webdriver.until.elementLocated(webdriver.By.css(".error-code")), 5000))
        })
        .then(function (el) {
          return Bluebird.resolve(driver.wait(webdriver.until.elementTextContains(el, 'HTTP ERROR 403'), 5000));
        });
    });
  });

  describe('non admin user harry has delegated rights', function () {
    it('should be able to interact with terminal', function () {
      this.timeout(10000);
      const instanceId = this.mesosTaskIds['app1'];
      return helpers.getDelegation('john', 'harry', instanceId)
        .then(function (accessToken: string) {
          return AppsHelpers.checkInteractionsWithTerminalUsingAccessToken('harry', accessToken, instanceId);
        });
    });
  });

  describe('non admin user harry has delegated rights to root container', function () {
    it('should be able to interact with terminal', function () {
      this.timeout(20000);
      const instanceId = this.mesosTaskIds['app5'];
      return helpers.getDelegation('john', 'harry', instanceId)
        .then(function (accessToken: string) {
          return AppsHelpers.checkInteractionsWithTerminalUsingAccessToken('harry', accessToken, instanceId);
        });
    });
  });
});
