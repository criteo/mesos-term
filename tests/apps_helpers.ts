import Bluebird = require('bluebird');
import webdriver = require('selenium-webdriver');
import helpers = require('./helpers');
import Assert = require('assert');

const TIMEOUT = 10000;

export function interactWithTerminal(driver: any) {
  return driver.wait(webdriver.until.elementLocated(webdriver.By.css(".xterm-rows")), TIMEOUT)
    .then(function(el: webdriver.WebElement) {
      return Bluebird.resolve(driver.wait(webdriver.until.elementTextMatches(el, /\$|#/), TIMEOUT));
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

export function testAnswerToCommand(driver: any, command: string, expected: string) {
  return driver.wait(webdriver.until.elementLocated(webdriver.By.css('.xterm-rows>div')), TIMEOUT)
    .then(function(el: webdriver.WebElement) {
      return Bluebird.resolve(driver.wait(webdriver.until.elementTextContains(el, 'runs'), TIMEOUT));
    })
    .then(function() {
      return Bluebird.resolve(
        driver.wait(webdriver.until.elementLocated(webdriver.By.css('.terminal')), TIMEOUT));
    })
    .then(function(el: webdriver.WebElement) {
      return Bluebird.resolve(el.sendKeys(command + '\n'));
    })
    .then(function() {
      return Bluebird.resolve(
        driver.wait(webdriver.until.elementLocated(webdriver.By.css('.xterm-rows')), TIMEOUT));
    })
    .then(function(el: webdriver.WebElement) {
      return Bluebird.resolve(driver.wait(webdriver.until.elementTextContains(el, expected), TIMEOUT));
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
    this.retries(3);
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

export function testShouldNotSeeGrantAccessButton(port: number, user: string, appName: string) {
  it('should not see the `Grant access` button', function() {
    this.timeout(TIMEOUT);
    const instanceId = this.mesosTaskIds[appName];

    return helpers.withChrome(function(driver) {
      return Bluebird.resolve(driver.get(`http://${user}:password@localhost:${port}/login/${instanceId}`))
        .then(function() {
          return Bluebird.resolve(
            driver.wait(webdriver.until.elementLocated(webdriver.By.css(".task_id")), TIMEOUT))
        })
        .then(function(el) {
          return Bluebird.resolve(
            driver.wait(webdriver.until.elementIsVisible(el), TIMEOUT))
        })
        .then(function() {
          return Bluebird.resolve(
            driver.findElement(webdriver.By.css(".delegate-button")))
            .then(() => Bluebird.reject(new Error('should not be here')))
            .catch((err) => Bluebird.resolve());
        });
    });
  });
}

export function testShouldSeeGrantAccessButton(port: number, user: string, appName: string) {
  it('should see the `Grant access` button', function() {
    this.timeout(TIMEOUT);
    const instanceId = this.mesosTaskIds[appName];
    
    return helpers.withChrome(function(driver) {
      return Bluebird.resolve(driver.get(`http://${user}:password@localhost:${port}/login/${instanceId}`))
        .then(function() {
          return Bluebird.resolve(
            driver.wait(webdriver.until.elementLocated(webdriver.By.css(".delegate-button")), TIMEOUT))
        })
        .then(function(el) {
          return Bluebird.resolve(
            driver.wait(webdriver.until.elementIsVisible(el), TIMEOUT))
        })
    });
  });
}

function waitUntilElementIsVisible(driver: any, cssClass: string, timeout: number) {
  return Bluebird.resolve(
    driver.wait(webdriver.until.elementLocated(webdriver.By.css(cssClass)), timeout))
      .then((el) => Bluebird.resolve(driver.wait(webdriver.until.elementIsVisible(el), timeout)));
}

function waitUntilElementIsNotVisible(driver: any, cssClass: string, timeout: number) {
  return Bluebird.resolve(
    driver.wait(webdriver.until.elementLocated(webdriver.By.css(cssClass)), timeout))
      .then((el) => Bluebird.resolve(driver.wait(webdriver.until.elementIsNotVisible(el), timeout)));
}

function delegateAccessToken(driver: any, port: number, delegatedUser: string, instanceId: string) {
  let token: string;
  return waitUntilElementIsVisible(driver, '.delegation-form', TIMEOUT)
    .then(() => waitUntilElementIsVisible(driver, '.delegate-form-user', TIMEOUT))
    .then((el) => Bluebird.resolve(el.sendKeys(delegatedUser)))
    .then(() => waitUntilElementIsVisible(driver, '.delegate-form-delegate', TIMEOUT))
    .then((el) => Bluebird.resolve(el.click()))
    .then(() => Bluebird.resolve(driver.sleep(1000)))
    .then(() => waitUntilElementIsVisible(driver, '.access-token textarea', TIMEOUT))
    .then((el) => Bluebird.resolve(el.getAttribute("value")))
    .then((accessUrl: string) => { token = accessUrl.match(/access_token=(.*)$/)[1]; return Bluebird.resolve(); })
    .then(() => waitUntilElementIsVisible(driver, '.delegate-form-ok', TIMEOUT))
    .then((el) => Bluebird.resolve(el.click()))
    .then(() => waitUntilElementIsNotVisible(driver, '.delegation-form', TIMEOUT))
    .then(() => Bluebird.resolve(driver.get(`http://${delegatedUser}:password@localhost:${port}/login/${instanceId}`)))
    .then(() => waitUntilElementIsVisible(driver, '.access-token-field', TIMEOUT))
    .then((el) => Bluebird.resolve(el.sendKeys(token)))
    .then(() => waitUntilElementIsVisible(driver, '.access-token-button', TIMEOUT))
    .then((el) => Bluebird.resolve(el.click()))
    .then(() => interactWithTerminal(driver));
}

function delegateAccessUrl(driver: any, port: number, delegatedUser: string, instanceId: string) {
  let url: string;
  return waitUntilElementIsVisible(driver, '.delegation-form', TIMEOUT)
    .then(() => waitUntilElementIsVisible(driver, '.delegate-form-user', TIMEOUT))
    .then((el) => Bluebird.resolve(el.sendKeys(delegatedUser)))
    .then(() => waitUntilElementIsVisible(driver, '.delegate-form-delegate', TIMEOUT))
    .then((el) => Bluebird.resolve(el.click()))
    .then(() => Bluebird.resolve(driver.sleep(1000)))
    .then(() => waitUntilElementIsVisible(driver, '.access-token textarea', TIMEOUT))
    .then((el) => Bluebird.resolve(el.getAttribute("value")))
    .then((accessUrl) => { url = accessUrl; return Bluebird.resolve(); })
    .then(() => waitUntilElementIsVisible(driver, '.delegate-form-ok', TIMEOUT))
    .then((el) => Bluebird.resolve(el.click()))
    .then(() => waitUntilElementIsNotVisible(driver, '.delegation-form', TIMEOUT))
    .then(() => Bluebird.resolve(driver.get(url)))
    .then(() => interactWithTerminal(driver));
}

export function testShouldGrantAccessViaButtonAndToken(port: number, admin: string, delegatedUser: string, appName: string) {
  it(`should allow ${admin} to delegate access to ${delegatedUser} via button`, function() {
    this.timeout(20000);
    const instanceId = this.mesosTaskIds[appName];

    return helpers.withChrome(function(driver) {
      
      return Bluebird.resolve(driver.get(`http://${admin}:password@localhost:${port}/login/${instanceId}`))
        .then(() => waitUntilElementIsVisible(driver, '.delegate-button', TIMEOUT))
        .then((el) => Bluebird.resolve(el.click()))
        .then(() => delegateAccessToken(driver, port, delegatedUser, instanceId));
    });
  });
}

export function testShouldGrantAccessViaButtonAndUrl(port: number, admin: string, delegatedUser: string, appName: string) {
  it(`should allow ${admin} to delegate access to ${delegatedUser} via button`, function() {
    this.timeout(20000);
    const instanceId = this.mesosTaskIds[appName];

    return helpers.withChrome(function(driver) {
      
      return Bluebird.resolve(driver.get(`http://${admin}:password@localhost:${port}/login/${instanceId}`))
        .then(() => waitUntilElementIsVisible(driver, '.delegate-button', TIMEOUT))
        .then((el) => Bluebird.resolve(el.click()))
        .then(() => delegateAccessUrl(driver, port, delegatedUser, instanceId));
    });
  });
}


export function testShouldNotGrantAccessWhenUserIsEmpty(port: number, admin: string, appName: string) {
  it(`should face an error when user is not provided`, function() {
    this.timeout(20000);
    const instanceId = this.mesosTaskIds[appName];

    return helpers.withChrome(function(driver) {
      let token: string;
      return Bluebird.resolve(driver.get(`http://${admin}:password@localhost:${port}/login/${instanceId}`))
        .then(() => waitUntilElementIsVisible(driver, '.delegate-button', TIMEOUT))
        .then((el) => Bluebird.resolve(el.click()))
        .then(() => waitUntilElementIsVisible(driver, '.delegation-form', TIMEOUT))
        .then(() => waitUntilElementIsVisible(driver, '.delegate-form-user', TIMEOUT))
        .then(() => waitUntilElementIsVisible(driver, '.delegate-form-delegate', TIMEOUT))
        .then((el) => Bluebird.resolve(el.click()))
        .then(() => waitUntilElementIsVisible(driver, '.error p', TIMEOUT))
        .then((el) => Bluebird.resolve(el.getText()))
        .then((errorMessage) => { Assert.equal('Request must contain key `delegate_to`.', errorMessage); return Bluebird.resolve(); })
        .then(() => waitUntilElementIsVisible(driver, '.delegate-form-retry', TIMEOUT))
        .then((el) => Bluebird.resolve(el.click()))
        .then(() => waitUntilElementIsVisible(driver, '.delegation-form', TIMEOUT))
        .then(() => waitUntilElementIsVisible(driver, '.delegate-form-user', TIMEOUT));
      });
  });
}

export function testShouldAbortAccessDelegation(port: number, admin: string, appName: string) {
  it(`should face an error when user is not provided`, function() {
    this.timeout(20000);
    const instanceId = this.mesosTaskIds[appName];

    return helpers.withChrome(function(driver) {
      let token: string;
      return Bluebird.resolve(driver.get(`http://${admin}:password@localhost:${port}/login/${instanceId}`))
        .then(() => waitUntilElementIsVisible(driver, '.delegate-button', TIMEOUT))
        .then((el) => Bluebird.resolve(el.click()))
        .then(() => waitUntilElementIsVisible(driver, '.delegation-form', TIMEOUT))
        .then(() => waitUntilElementIsVisible(driver, '.delegate-form-user', TIMEOUT))
        .then(() => waitUntilElementIsVisible(driver, '.delegate-form-abort', TIMEOUT))
        .then((el) => Bluebird.resolve(el.click()))
        .then(() => waitUntilElementIsNotVisible(driver, '.delegation-form', TIMEOUT));
      });
  });
}
