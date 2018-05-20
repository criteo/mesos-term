require('chromedriver');
import webdriver = require('selenium-webdriver');
import Bluebird = require('bluebird');

export function withChrome<T>(
  fn: (driver: webdriver.WebDriver) => Bluebird<T>): Bluebird<T> {
  const driver = new webdriver.Builder()
    .forBrowser('chrome')
    .build();
  return fn(driver)
    .finally(function() {
      driver.quit();
    });
}
