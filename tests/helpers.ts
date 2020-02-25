require('chromedriver');
import webdriver = require('selenium-webdriver');
import Request = require('request-promise');
import { Options } from 'selenium-webdriver/chrome';

export async function withChrome<T>(
  fn: (driver: webdriver.WebDriver) => Promise<T>) {

  let pref = new webdriver.logging.Preferences();
  pref.setLevel('browser', webdriver.logging.Level.SEVERE);

  const chromeOptions = new Options();
  const driver = new webdriver.Builder()
    .forBrowser('chrome')
    .setLoggingPrefs(pref)
    .setChromeOptions(chromeOptions)
    .build();

  const entries = await driver.manage().logs().get(webdriver.logging.Type.BROWSER)
  entries.forEach(function (entry) {
    console.log('Chrome [%s] %s', entry.level.name, entry.message);
  });

  let fnError: Error;
  let result: any;

  try {
    result = await fn(driver);
  } catch (err) {
    fnError = err;
  } finally {
    await driver.quit();
  }

  if (fnError) {
    throw fnError;
  }
  return result;
}

export function getDelegation(from: string, to: string, instanceId: string) {
  const body = {
    'task_id': instanceId,
    'delegate_to': to,
    'duration': '1h',
  };
  return Request({
    uri: `http://${from}:password@localhost:5000/api/delegate`,
    body: body,
    json: true,
    method: 'POST'
  });
}
