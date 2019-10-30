require('chromedriver');
import webdriver = require('selenium-webdriver');
import chrome = require('selenium-webdriver/chrome');
import Bluebird = require('bluebird');
import Request = require('request-promise');

export function withChrome<T>(
  fn: (driver: webdriver.WebDriver) => Bluebird<T>): Bluebird<T> {

  const pref = new webdriver.logging.Preferences();
  pref.setLevel('browser', webdriver.logging.Level.SEVERE);

  const options = new chrome.Options();
  options.addArguments('--headless', '--no-sandbox');

  const driver = new webdriver.Builder()
    .forBrowser('chrome')
    .setChromeOptions(options)
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
      return driver.quit();
    });
}

export function getDelegation(port: number, from: string, to: string, instanceId: string) {
  const body = {
    'task_id': instanceId,
    'delegate_to': to
  };
  return Request({
    uri: `http://${from}:password@localhost:${port}/delegate`,
    body: body,
    json: true,
    method: 'POST'
  });
}
