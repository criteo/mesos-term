require('chromedriver');
import webdriver = require('selenium-webdriver');
import Bluebird = require('bluebird');

export function withChrome<T>(
  fn: (driver: webdriver.WebDriver) => Bluebird<T>): Bluebird<T> {

  let pref = new webdriver.logging.Preferences();
  pref.setLevel('browser', webdriver.logging.Level.SEVERE);

  const driver = new webdriver.Builder()
    .forBrowser('chrome')
    .setLoggingPrefs(pref)
    .build();

  driver.manage().logs().get(webdriver.logging.Type.BROWSER)
    .then(function(entries) {
        entries.forEach(function(entry) {
          console.log('Chrome [%s] %s', entry.level.name, entry.message);
        });
     });

  return fn(driver)
    .finally(function() {
      driver.quit();
    });
}
