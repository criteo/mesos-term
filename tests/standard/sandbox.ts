import * as Sandbox from "../common/sandbox";
import Helpers = require('../helpers');
import { TIMEOUT_DRIVER } from "../common/constants";
import { sendKeysToTerminal, untilTermContains } from "../apps_helpers";

describe('Sandbox', function () {
    this.timeout(30000);
    this.retries(3);

    describe('file description is updated when file selected', () => {
        it("should update description", async function () {
            const instanceID = this.mesosTaskIds["app1"];
            const username = "john";
            await Helpers.withChrome(async (driver) => {
                await driver.get(`http://${username}:password@${Helpers.getMesosTermUiUrl()}/task/${instanceID}/sandbox`);
                await Sandbox.clickFile(driver, "stdout");
                await Sandbox.checkDescription(driver, "stdout", "-rw-r--r--", "myuser", "myuser");
                await Sandbox.clickFile(driver, "stderr");
                await Sandbox.checkDescription(driver, "stderr", "-rw-r--r--", "myuser", "myuser");
            })
        });
    });

    describe('open a file', () => {
        it("should open the stdout file", async function () {
            const instanceID = this.mesosTaskIds["app1"];
            const username = "john";
            await Helpers.withChrome(async (driver) => {
                await driver.get(`http://${username}:password@${Helpers.getMesosTermUiUrl()}/task/${instanceID}/sandbox`);
                await Sandbox.doubleClickFile(driver, "stdout");
                await Sandbox.checkDescription(driver, "stdout", "-rw-r--r--", "myuser", "myuser");
                await Sandbox.waitFileReaderToBeVisible(driver);
                await driver.wait(Sandbox.untilFileReaderContains("MARATHON_APP_ID=/app1"), TIMEOUT_DRIVER);
            });
        });
    });

    describe('tail', () => {
        it('should follow new lines coming in', async function () {
            const instanceID = this.mesosTaskIds["app1"];
            const username = "john";
            await Helpers.withChrome(async (driver) => {
                await driver.get(`http://${username}:password@${Helpers.getMesosTermUiUrl()}/task/${instanceID}/terminal?screenReaderMode=true`);
                await driver.wait(untilTermContains(/\$|#/), TIMEOUT_DRIVER);
                await sendKeysToTerminal(driver, 'touch hello && sleep 5 && echo hello > hello\n');

                await driver.executeScript("window.open()");
                const tabs = await driver.getAllWindowHandles();
                await driver.switchTo().window(tabs[1]);

                await driver.get(`http://${username}:password@${Helpers.getMesosTermUiUrl()}/task/${instanceID}/sandbox`);
                await Sandbox.doubleClickFile(driver, "hello");
                await Sandbox.waitFileReaderToBeVisible(driver);
                await driver.wait(Sandbox.untilFileReaderContains("hello"), TIMEOUT_DRIVER);
            });
        });
    });
});
