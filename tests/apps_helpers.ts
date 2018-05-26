import Request = require('request-promise');
import errors = require('request-promise/errors');
import Bluebird = require('bluebird');
import webdriver = require('selenium-webdriver');
import helpers = require('./helpers');

export function AssertReplyWith(req: Request.Options, statusCode: number): Bluebird<void> {
  req.resolveWithFullResponse = true;
  return Request(req)
    .then(function(res) {
      return (res.statusCode == statusCode)
        ? Bluebird.resolve()
        : Bluebird.reject(new Error(
          `Bad status code ${res.statusCode} (expected ${statusCode})`));
    })
    .catch(errors.StatusCodeError, function(res) {
      return (res.statusCode == statusCode)
        ? Bluebird.resolve()
        : Bluebird.reject(new Error(
          `Bad status code ${res.statusCode} (expected ${statusCode})`));
    });
}

export function testAuthorizations(user: string, appName: string, statusCode: number) {
  it(`should get ${statusCode} when accessing terminal page`, function() {
    const instanceId = this.mesosTaskIds[appName];
    return AssertReplyWith({
      uri: `http://${user}:password@localhost:3000/${instanceId}`
    }, statusCode);
  });

  it(`should get ${statusCode} when requesting a terminal`, function() {
    const instanceId = this.mesosTaskIds[appName];
    return AssertReplyWith({
      method: 'POST',
      uri: `http://${user}:password@localhost:3000/terminals/${instanceId}`
    }, statusCode);
  });
}

export function testInteractionsWithTerminal(
  port: number,
  user: string,
  appName: string) {

  it('should be able to interact with terminal', function() {
    this.timeout(10000);

    const instanceId = this.mesosTaskIds[appName];
    return helpers.withChrome(function(driver) {
      return Bluebird.resolve(driver.get(`http://${user}:password@localhost:${port}/${instanceId}`))
        .then(function() {
          return Bluebird.resolve(
            driver.wait(webdriver.until.elementLocated(webdriver.By.css(".xterm-rows")), 10000))
        })
        .then(function(el) {
          return Bluebird.resolve(driver.wait(webdriver.until.elementTextContains(el, 'runs'), 10000));
        })
        .then(function() {
          return Bluebird.resolve(
            driver.wait(webdriver.until.elementLocated(webdriver.By.css(".terminal")), 10000));
        })
        .then(function(el: webdriver.WebElement) {
          return el.sendKeys('ls\n');
        })
        .then(function() {
          return Bluebird.resolve(
            driver.wait(webdriver.until.elementLocated(webdriver.By.css(".xterm-rows")), 10000));
        })
        .then(function(el: webdriver.WebElement) {
	  return Bluebird.resolve(driver.wait(webdriver.until.elementTextContains(el, 'stdout'), 10000));
        });
    });
  });
}

function testReceiveErrorMessage(
  port: number,
  user: string,
  instanceId: string,
  expectedError: string) {

  return helpers.withChrome(function(driver) {
    return Bluebird.resolve(driver.get(`http://${user}:password@localhost:${port}/${instanceId}`))
      .then(function() {
        return Bluebird.resolve(
          driver.wait(webdriver.until.elementLocated(webdriver.By.css(".error-splash .error")), 10000))
      })
      .then(function(el) {
        return Bluebird.resolve(driver.wait(webdriver.until.elementTextContains(el, expectedError), 2000));
      });
  });
}

function testReceiveErrorMessageFromAppName(
  port: number,
  user: string,
  appName: string,
  expectedError: string) {

  describe(`from app name ${appName}`, function() {
    it(`should receive error "${expectedError}"`, function() {
      this.timeout(10000);

      const instanceId = this.mesosTaskIds[appName];
      return testReceiveErrorMessage(port, user, instanceId, expectedError);
    });
  });
}

function testReceiveErrorMessageFromInstanceId(
  port: number,
  user: string,
  instanceId: string,
  expectedError: string) {

  describe(`from instance ID ${instanceId}`, function() {
    it(`should receive error "${expectedError}"`, function() {
      this.timeout(10000);

      return testReceiveErrorMessage(port, user, instanceId, expectedError);
    });
  });
}

export function testUnauthorizedUser(port: number, user: string, appName: string) {
  testReceiveErrorMessageFromAppName(port, user, appName, 'Unauthorized access to container.');
}

export function testUnauthorizedUserInRootContainer(port: number, user: string, appName: string) {
  testReceiveErrorMessageFromAppName(port, user, appName, 'Unauthorized access to root container.');
}

export function testNoTaskId(port: number, user: string, instanceId: string) {
  testReceiveErrorMessageFromInstanceId(port, user, instanceId, 'Task not found.');
}
