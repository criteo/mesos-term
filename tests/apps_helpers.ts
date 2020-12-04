import { WebDriver, until, By, Condition } from 'selenium-webdriver';
import helpers = require('./helpers');

const TIMEOUT_DRIVER = 18000;

export const untilTermContains = function (pattern: RegExp) {
  return new Condition(
    `for terminal to contain ${pattern.toString()}`,
    async function (driver) {
      const el = await driver.wait(until.elementLocated(By.className("xterm-accessibility-tree")), TIMEOUT_DRIVER);
      const text = await el.getText();
      const matches = text.match(pattern);
      return matches !== null && matches.length > 0;
    });
}

export async function sendKeysToTerminal(driver: WebDriver, keys: string) {
  let el = await driver.wait(until.elementLocated(By.css(".xterm")), TIMEOUT_DRIVER);
  await el.click();
  el = await driver.wait(until.elementLocated(By.css(".xterm-helper-textarea")), TIMEOUT_DRIVER);
  await el.sendKeys(keys);
}

export async function interactWithTerminal(driver: WebDriver) {
  await driver.wait(untilTermContains(/\$|#/), TIMEOUT_DRIVER);
  await sendKeysToTerminal(driver, "ls\n");
  await driver.wait(untilTermContains(/stdout/), TIMEOUT_DRIVER);
}

export async function testAnswerToCommand(driver: WebDriver, command: string, expected: string) {
  await driver.wait(untilTermContains(/\$|#/), TIMEOUT_DRIVER);
  await sendKeysToTerminal(driver, command + '\n');
  await driver.wait(untilTermContains(new RegExp(expected)), TIMEOUT_DRIVER);
}

export async function checkInteractionsWithTerminal(
  user: string,
  instanceId: string) {
  await helpers.withChrome(async function (driver) {
    await driver.get(`http://${user}:password@${helpers.getMesosTermUiUrl()}/task/${instanceId}/terminal?screenReaderMode=true`);
    await interactWithTerminal(driver);
  });
}

async function enterAccessToken(driver: WebDriver, accessToken: string) {
  let el = await driver.wait(until.elementLocated(By.css("#access-request-dialog .token-field .MuiInput-input")), TIMEOUT_DRIVER);
  el = await driver.wait(until.elementIsVisible(el), TIMEOUT_DRIVER);
  await el.sendKeys(accessToken);
  let buttonEl = await driver.wait(until.elementLocated(By.css("#access-request-dialog .ok-button")), TIMEOUT_DRIVER);
  await buttonEl.click();
}

export async function checkInteractionsWithTerminalUsingAccessToken(
  user: string,
  accessToken: string,
  instanceId: string) {
  await helpers.withChrome(async function (driver) {
    await driver.get(`http://${user}:password@${helpers.getMesosTermUiUrl()}/task/${instanceId}/terminal?screenReaderMode=true`);
    await enterAccessToken(driver, accessToken);
    await interactWithTerminal(driver);
    await driver.sleep(2);
  });
}

export async function checkBadAccessToken(
  user: string,
  accessToken: string,
  instanceId: string) {

  await helpers.withChrome(async function (driver) {
    await driver.get(`http://${user}:password@${helpers.getMesosTermUiUrl()}/task/${instanceId}/terminal?screenReaderMode=true`);
    await enterAccessToken(driver, accessToken);
    await receiveUnauthorizedErrorMessage(driver, 'Unauthorized access');
    await driver.sleep(2);
  });
}

export function generateAccessToken(
  user: string,
  delegatedUser: string,
  instanceId: string,
  duration: string) {

  return helpers.withChrome(async function (driver) {
    await driver.get(`http://${user}:password@${helpers.getMesosTermUiUrl()}/task/${instanceId}/terminal?screenReaderMode=true`);
    const url = await delegateAccessToken(driver, delegatedUser, duration);
    return url.match(/access_token=(.*)$/)[1];
  });
}

export function testInteractionsWithTerminal(
  user: string,
  appName: string) {

  it('should be able to interact with terminal', async function () {
    const instanceId = this.mesosTaskIds[appName];
    await checkInteractionsWithTerminal(user, instanceId);
  });
}

async function testReceiveErrorMessage(
  user: string,
  instanceId: string,
  expectedError: string) {

  await helpers.withChrome(async function (driver) {
    await driver.get(`http://${user}:password@${helpers.getMesosTermUiUrl()}/task/${instanceId}/terminal?screenReaderMode=true`);
    const el = await driver.wait(until.elementLocated(By.css(".notification-error .message-content")), TIMEOUT_DRIVER);
    await driver.wait(until.elementTextContains(el, expectedError), TIMEOUT_DRIVER);
  });
}

async function receiveUnauthorizedErrorMessage(
  driver: WebDriver,
  expectedError: string) {
  const el = await driver.wait(until.elementLocated(By.css(".notification-error .message-content")), TIMEOUT_DRIVER);
  await driver.wait(until.elementTextContains(el, expectedError), TIMEOUT_DRIVER);
}

function testReceiveErrorMessageFromInstanceId(
  user: string,
  instanceId: string,
  expectedError: string) {

  describe(`from instance ID ${instanceId}`, function () {
    it(`should receive error "${expectedError}"`, function () {
      return testReceiveErrorMessage(user, instanceId, expectedError);
    });
  });
}

export function testCaseUnauthorizedAccessDialogDisplayed(user: string, appName: string) {
  describe("unauthorized access dialog be displayed", () => {
    it("displayed", async function () {
      const instanceId = this.mesosTaskIds[appName];
      await helpers.withChrome(async function (driver) {
        await driver.get(`http://${user}:password@${helpers.getMesosTermUiUrl()}/task/${instanceId}/terminal?screenReaderMode=true`);
        const el = await driver.wait(until.elementLocated(By.id("access-request-dialog")), TIMEOUT_DRIVER);
        await driver.wait(until.elementIsVisible(el), TIMEOUT_DRIVER);
      })
    })
  })
}

export function testUnauthorizedUser(user: string, appName: string) {
  testCaseUnauthorizedAccessDialogDisplayed(user, appName);
}

export function testNoTaskId(user: string, instanceId: string) {
  testReceiveErrorMessageFromInstanceId(user, instanceId, 'Task not found');
}

export function testShouldNotSeeGrantAccessButton(user: string, appName: string) {
  it('should not see the `Grant access` button', async function () {
    const instanceId = this.mesosTaskIds[appName];

    await helpers.withChrome(async function (driver) {
      await driver.get(`http://${user}:password@${helpers.getMesosTermUiUrl()}/task/${instanceId}/terminal?screenReaderMode=true`);
      let el = await driver.wait(until.elementLocated(By.css(".user-item")), TIMEOUT_DRIVER);
      await driver.wait(until.elementIsVisible(el), TIMEOUT_DRIVER);
      await driver.sleep(1000);
      try {
        await driver.findElement(By.css(".grant-permission-button"));
      } catch (err) {
        return
      }
      throw new Error("should not be here");
    });
  });
}

export function testShouldSeeGrantAccessButton(user: string, appName: string) {
  it('should see the `Grant access` button', async function () {
    const instanceId = this.mesosTaskIds[appName];

    await helpers.withChrome(async function (driver) {
      await driver.get(`http://${user}:password@${helpers.getMesosTermUiUrl()}/task/${instanceId}/terminal`)
      const el = await driver.wait(until.elementLocated(By.css(".grant-permission-button")), TIMEOUT_DRIVER);
      await driver.wait(until.elementIsVisible(el), TIMEOUT_DRIVER);
    });
  });
}

async function waitUntilElementIsVisible(driver: any, cssClass: string, timeout: number) {
  const el = await driver.wait(until.elementLocated(By.css(cssClass)), timeout);
  await driver.wait(until.elementIsVisible(el), timeout);
  return el;
}

// @duration is either 1h, 1d, 7d, 15d
async function delegateAccessToken(driver: WebDriver, delegatedUser: string, duration: string) {
  const grantEl = await driver.wait(until.elementLocated(By.css(".grant-permission-button")), TIMEOUT_DRIVER);
  await driver.wait(until.elementIsVisible(grantEl), TIMEOUT_DRIVER);
  await grantEl.click();

  const dialogEl = await driver.wait(until.elementLocated(By.id("delegation-dialog")), TIMEOUT_DRIVER);
  await driver.wait(until.elementIsVisible(dialogEl), TIMEOUT_DRIVER);
  const userEl = await waitUntilElementIsVisible(driver, '#delegation-dialog .username-field .MuiInput-input', TIMEOUT_DRIVER);
  await userEl.sendKeys(delegatedUser);

  const select = await driver.wait(until.elementLocated(By.css("#duration-select")), TIMEOUT_DRIVER);
  await select.click();
  const option = await driver.wait(until.elementLocated(By.xpath('//*[@id="menu-"]/div[3]/ul/li[@data-value="' + duration + '"]')), TIMEOUT_DRIVER);
  await option.click();

  const generateButtonEl = await waitUntilElementIsVisible(driver, '#delegation-dialog .generate-button', TIMEOUT_DRIVER);
  await generateButtonEl.click();

  const tokenEl = await waitUntilElementIsVisible(driver, '#delegation-dialog .token-field .MuiInput-input', TIMEOUT_DRIVER);
  const accessURL = await tokenEl.getAttribute("value");
  return accessURL;
}

export function testShouldGrantAccessViaButtonAndToken(admin: string, delegatedUser: string, appName: string) {
  it(`should allow ${admin} to delegate access to ${delegatedUser} via button and token in dialog`, async function () {
    const instanceId = this.mesosTaskIds[appName];
    let token: string;
    await helpers.withChrome(async function (driver) {
      await driver.get(`http://${admin}:password@${helpers.getMesosTermUiUrl()}/task/${instanceId}/terminal?screenReaderMode=true`);
      token = await delegateAccessToken(driver, delegatedUser, '1h');
      token = token.match(/access_token=(.*)$/)[1];
    });

    await helpers.withChrome(async function (driver) {
      await driver.get(`http://${delegatedUser}:password@${helpers.getMesosTermUiUrl()}/task/${instanceId}/terminal?screenReaderMode=true`);
      await driver.wait(until.elementLocated(By.id("access-request-dialog")), TIMEOUT_DRIVER);
      const aTokenEl = await waitUntilElementIsVisible(driver, '#access-request-dialog .token-field .MuiInput-input', TIMEOUT_DRIVER);
      await aTokenEl.sendKeys(token);
      const okButtonEl = await waitUntilElementIsVisible(driver, '#access-request-dialog .ok-button', TIMEOUT_DRIVER);
      await okButtonEl.click();
      await interactWithTerminal(driver);
    });
  });
}

export function testShouldGrantAccessViaButtonAndUrl(admin: string, delegatedUser: string, appName: string) {
  it(`should allow ${admin} to delegate access to ${delegatedUser} via button and url`, async function () {
    const instanceId = this.mesosTaskIds[appName];

    let url: string;
    await helpers.withChrome(async function (driver) {
      await driver.get(`http://${admin}:password@${helpers.getMesosTermUiUrl()}/task/${instanceId}/terminal?screenReaderMode=true`);
      url = await delegateAccessToken(driver, delegatedUser, '1h');
    });

    await helpers.withChrome(async function (driver) {
      url = "http://" + delegatedUser + ":password@" + url.slice(7);
      await driver.get(`${url}&screenReaderMode=true`);
      await interactWithTerminal(driver);
    });
  });
}


export function testShouldAbortAccessDelegation(admin: string, appName: string) {
  it(`should face an error when user is not provided`, async function () {
    const instanceId = this.mesosTaskIds[appName];

    await helpers.withChrome(async function (driver) {
      await driver.get(`http://${admin}:password@${helpers.getMesosTermUiUrl()}/task/${instanceId}/terminal?screenReaderMode=true`);
      const grantEl = await driver.wait(until.elementLocated(By.css(".grant-permission-button")), TIMEOUT_DRIVER);
      await driver.wait(until.elementIsVisible(grantEl), TIMEOUT_DRIVER);
      await grantEl.click();

      const dialogEl = await driver.wait(until.elementLocated(By.id("delegation-dialog")), TIMEOUT_DRIVER);
      await driver.wait(until.elementIsVisible(dialogEl), TIMEOUT_DRIVER);

      const buttonClose = await driver.wait(until.elementLocated(By.css("#delegation-dialog .close-button")));
      await buttonClose.click();

      await driver.wait(async (d) => {
        const el = await d.findElements(By.id("delegation-dialog"));
        return el.length === 0;
      }, TIMEOUT_DRIVER);
    });
  });
}
