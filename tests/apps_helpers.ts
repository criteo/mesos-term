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

export function testInteractionsWithTerminal(user: string, appName: string) {
  it('should be able to interact with terminal', function() {
    this.timeout(10000);

    const instanceId = this.mesosTaskIds[appName];
    return helpers.withChrome(function(driver) {
      return Bluebird.resolve(driver.get(`http://${user}:password@localhost:3000/${instanceId}`))
        .then(function() {
          return Bluebird.resolve(
            driver.wait(webdriver.until.elementLocated(
              webdriver.By.css(".xterm-rows")), 5000))
        })
        .then(function(el) {
          return Bluebird.resolve(driver.wait(webdriver.until.elementTextContains(el, 'runs'), 5000));
        })
        .then(function() {
          return Bluebird.resolve(
            driver.wait(webdriver.until.elementLocated(webdriver.By.css(".terminal")), 5000));
        })
        .then(function(el: webdriver.WebElement) {
          return el.sendKeys('ls\n');
        })
        .then(function() {
          return driver.findElement(webdriver.By.css(".xterm-rows div:nth-child(2)"));
        })
        .then(function(el) {
	  return Bluebird.resolve(driver.wait(webdriver.until.elementTextContains(el, 'stdout'), 5000));
        });
    });
  });
}
