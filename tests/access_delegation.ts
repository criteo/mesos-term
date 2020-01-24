import helpers = require('./helpers');
import webdriver = require('selenium-webdriver');
import Bluebird = require('bluebird');


describe('access delegation', function () {
  it('should allow access to super admin', function () {
    this.timeout(10000);

    return helpers.withChrome(function (driver) {
      return Bluebird.resolve(driver.get(`http://john:password@localhost:3000/delegate`))
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
      return Bluebird.resolve(driver.get(`http://harry:password@localhost:3000/delegate`))
        .then(function () {
          return Bluebird.resolve(
            driver.wait(webdriver.until.elementLocated(webdriver.By.css(".error-code")), 5000))
        })
        .then(function (el) {
          return Bluebird.resolve(driver.wait(webdriver.until.elementTextContains(el, 'HTTP ERROR 403'), 5000));
        });
    });
  });
});
