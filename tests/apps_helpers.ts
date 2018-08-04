import Bluebird = require('bluebird');
import webdriver = require('selenium-webdriver');
import helpers = require('./helpers');

const TIMEOUT = 10000;

export function interactWithTerminal(driver: any) {
  return driver.wait(webdriver.until.elementLocated(webdriver.By.css(".xterm-rows")), TIMEOUT)
    .then(function(el: webdriver.WebElement) {
      return Bluebird.resolve(driver.wait(webdriver.until.elementTextContains(el, 'runs'), TIMEOUT));
    })
    .then(function() {
      return Bluebird.resolve(
        driver.wait(webdriver.until.elementLocated(webdriver.By.css(".terminal")), TIMEOUT));
    })
    .then(function(el: webdriver.WebElement) {
      return Bluebird.resolve(el.sendKeys('ls\n'));
    })
    .then(function() {
      return Bluebird.resolve(
        driver.wait(webdriver.until.elementLocated(webdriver.By.css(".xterm-rows")), TIMEOUT));
    })
    .then(function(el: webdriver.WebElement) {
      return Bluebird.resolve(driver.wait(webdriver.until.elementTextContains(el, 'stdout'), TIMEOUT));
    });
}

export function checkInteractionsWithTerminal(
  port: number,
  user: string,
  instanceId: string) {
  return helpers.withChrome(function(driver) {
    return Bluebird.resolve(driver.get(`http://${user}:password@localhost:${port}/login/${instanceId}`))
      .then(function() {
        return interactWithTerminal(driver);
      })
      .then(function() {
        return driver.sleep(2);
      });
  });
}

export function checkInteractionsWithTerminalUsingAccessToken(
  port: number,
  user: string,
  accessToken: string,
  instanceId: string) {

  return helpers.withChrome(function(driver) {
    return Bluebird.resolve(driver.get(`http://${user}:password@localhost:${port}/login/${instanceId}`))
      .then(function() {
        return Bluebird.resolve(
          driver.wait(webdriver.until.elementLocated(webdriver.By.css(".access-token-field")), TIMEOUT))
      })
      .then(function(el: webdriver.WebElement) {
        return Bluebird.resolve(
          driver.wait(webdriver.until.elementIsVisible(el), TIMEOUT));
      })
      .then(function(el: webdriver.WebElement) {
        return Bluebird.resolve(el.sendKeys(accessToken + '\n'));
      })
      .then(function() {
        return interactWithTerminal(driver);
      })
      .then(function() {
        return driver.sleep(2);
      });
  });
}

export function checkBadAccessToken(
  port: number,
  user: string,
  accessToken: string,
  instanceId: string) {

  return helpers.withChrome(function(driver) {
    return Bluebird.resolve(driver.get(`http://${user}:password@localhost:${port}/login/${instanceId}`))
      .then(function() {
        return Bluebird.resolve(
          driver.wait(webdriver.until.elementLocated(webdriver.By.css(".access-token-field")), TIMEOUT))
      })
      .then(function(el: webdriver.WebElement) {
        return Bluebird.resolve(
          driver.wait(webdriver.until.elementIsVisible(el), TIMEOUT));
      })
      .then(function(el: webdriver.WebElement) {
        return Bluebird.resolve(el.sendKeys(accessToken + '\n'));
      })
      .then(function() {
        return receiveUnauthorizedErrorMessage(driver, port, user, instanceId, 'Unauthorized access to container.');
      })
      .then(function() {
        return driver.sleep(2);
      });
  });
}

export function testInteractionsWithTerminal(
  port: number,
  user: string,
  appName: string) {

  it('should be able to interact with terminal', function() {
    this.timeout(TIMEOUT);
    const instanceId = this.mesosTaskIds[appName];
    return checkInteractionsWithTerminal(port, user, instanceId);
  });
}

function testReceiveErrorMessage(
  port: number,
  user: string,
  instanceId: string,
  expectedError: string) {

  return helpers.withChrome(function(driver) {
    return Bluebird.resolve(driver.get(`http://${user}:password@localhost:${port}/login/${instanceId}`))
      .then(function() {
        return Bluebird.resolve(
          driver.wait(webdriver.until.elementLocated(webdriver.By.css(".error-splash .error")), TIMEOUT))
      })
      .then(function(el) {
        return Bluebird.resolve(driver.wait(webdriver.until.elementTextContains(el, expectedError), TIMEOUT));
      });
  });
}

function receiveUnauthorizedErrorMessage(
  driver: any,
  port: number,
  user: string,
  instanceId: string,
  expectedError: string) {

  return Bluebird.resolve(driver.get(`http://${user}:password@localhost:${port}/login/${instanceId}`))
    .then(function() {
      return Bluebird.resolve(
        driver.wait(webdriver.until.elementLocated(webdriver.By.css(".unauthorized-splash .error")), TIMEOUT))
    })
    .then(function(el) {
      return Bluebird.resolve(driver.wait(webdriver.until.elementTextContains(el, expectedError), TIMEOUT));
    });
}

function testReceiveUnauthorizedErrorMessage(
  port: number,
  user: string,
  instanceId: string,
  expectedError: string) {
  return helpers.withChrome(function(driver) {
    return receiveUnauthorizedErrorMessage(driver, port, user, instanceId, expectedError);
  });
}

function testReceiveErrorMessageFromAppName(
  port: number,
  user: string,
  appName: string,
  expectedError: string) {

  describe(`from app name ${appName}`, function() {
    it(`should receive error "${expectedError}"`, function() {
      this.timeout(TIMEOUT);

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
      this.timeout(TIMEOUT);

      return testReceiveErrorMessage(port, user, instanceId, expectedError);
    });
  });
}

function testReceiveUnauthorizedErrorMessageFromAppName(
  port: number,
  user: string,
  appName: string,
  expectedError: string) {

  describe(`from app name ${appName}`, function() {
    it(`should receive unauthorized error "${expectedError}"`, function() {
      this.timeout(TIMEOUT);

      const instanceId = this.mesosTaskIds[appName];
      return testReceiveUnauthorizedErrorMessage(port, user, instanceId, expectedError);
    });
  });
}

export function testUnauthorizedUser(port: number, user: string, appName: string) {
  testReceiveUnauthorizedErrorMessageFromAppName(port, user, appName, 'Unauthorized access to container.');
}

export function testNoTaskId(port: number, user: string, instanceId: string) {
  testReceiveErrorMessageFromInstanceId(port, user, instanceId, 'Task not found.');
}
