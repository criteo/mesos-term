import Assert = require('assert');
import Bluebird = require('bluebird');
import webdriver = require('selenium-webdriver');
import helpers = require('./helpers');

describe('basic routes', function() {
  this.timeout(5000);

  it('should access to /', function() {
    return helpers.withChrome(function(driver) {
      return Bluebird.resolve(driver.get(`http://john:password@localhost:3000`))
        .then(function() {
            return Bluebird.resolve(
              driver.wait(webdriver.until.elementLocated(webdriver.By.css(".helper")), 5000));
          });
        });
  });

  it('should access to /ping', function() {
    return helpers.withChrome(function(driver) {
      return Bluebird.resolve(driver.get(`http://john:password@localhost:3000/ping`))
        .then(function() {
            return Bluebird.resolve(
              driver.wait(webdriver.until.elementLocated(webdriver.By.css("p")), 5000))
          })
          .then(function(el) {
            return Bluebird.resolve(driver.wait(webdriver.until.elementTextContains(el, 'pong'), 5000));
          });
        });
  });
});

