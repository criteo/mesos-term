import { WebDriver, until, By, Condition, WebElement } from 'selenium-webdriver';
import * as Helpers from "../helpers";
import { receiveUnauthorizedErrorMessage } from './errors';

const TIMEOUT_DRIVER = 18000;

const untilSandboxDisplaysFiles = function (names: string[]) {
    return new Condition(
        `for sandbox to display files and directories ${names.join(', ')}`,
        async function (driver) {
            const el = await driver.findElements(By.className("file-item"));
            if (el === null) {
                return false;
            }

            const sandboxFilenames = el.map(async e => {
                const fileName = await e.findElement(By.className("filename"));
                if (fileName === null) {
                    return null;
                }
                return await fileName.getText();
            }).filter(v => v !== null);

            const filenames = new Set(await Promise.all(sandboxFilenames));

            const intersection = new Set(
                names.filter(x => filenames.has(x)));

            return [...intersection].length === names.length && [...intersection]
                .map(v => names.indexOf(v) > -1)
                .reduce((acc, v) => acc && v, true);
        });
}

export function testOpenSandbox(username: string, appName: string) {
    it('should be able to see files of the sandbox', async function () {
        const instanceID = this.mesosTaskIds[appName];
        await checkCanSeeFilesInSandbox(username, instanceID);
    });
}

export function testSandboxUnauthorized(username: string, appName: string) {
    it('should be unauthorized', async function () {
        const instanceID = this.mesosTaskIds[appName];
        await Helpers.withChrome(async (driver) => {
            await driver.get(`http://${username}:password@${Helpers.getMesosTermUiUrl()}/task/${instanceID}/sandbox`);
            await receiveUnauthorizedErrorMessage(driver);
        });
    });
}

async function checkCanSeeFilesInSandbox(username: string, instanceID: string) {
    await Helpers.withChrome(async (driver) => {
        await driver.get(`http://${username}:password@${Helpers.getMesosTermUiUrl()}/task/${instanceID}/sandbox`);
        await driver.wait(untilSandboxDisplaysFiles(['stdout', 'stderr']));
    });
}

const untilSandboxFileIsDetected = function (name: string) {
    return new Condition<Promise<WebElement>>(
        `for sandbox file ${name} to be detected`,
        async function (driver) {
            const el = await driver.findElements(By.className("file-item"));
            if (el === null) {
                return null;
            }

            for (let i = 0; i < el.length; i += 1) {
                const filenameEl = await el[i].findElement(By.className("filename"));
                const text = await filenameEl.getText();
                if (text === name) {
                    return filenameEl;
                }
            }
            return null;
        });
}

export async function clickFile(driver: WebDriver, name: string) {
    const file = await driver.wait(untilSandboxFileIsDetected(name));
    await file.click();
}

export async function doubleClickFile(driver: WebDriver, name: string) {
    const file = await driver.wait(untilSandboxFileIsDetected(name));
    await driver.actions().doubleClick(file).perform();
}

export async function checkDescription(driver: WebDriver, name: string, mode: string, uid: string, gid: string) {
    let el = await driver.wait(until.elementLocated(By.className("desc-name")), TIMEOUT_DRIVER);
    await driver.wait(until.elementTextIs(el, `name: ${name}`), TIMEOUT_DRIVER);

    el = await driver.wait(until.elementLocated(By.className("desc-mode")), TIMEOUT_DRIVER);
    await driver.wait(until.elementTextIs(el, `mode: ${mode}`), TIMEOUT_DRIVER);

    el = await driver.wait(until.elementLocated(By.className("desc-uid")), TIMEOUT_DRIVER);
    await driver.wait(until.elementTextIs(el, `uid: ${uid}`), TIMEOUT_DRIVER);

    el = await driver.wait(until.elementLocated(By.className("desc-gid")), TIMEOUT_DRIVER);
    await driver.wait(until.elementTextIs(el, `gid: ${gid}`), TIMEOUT_DRIVER);
}

export async function waitFileReaderToBeVisible(driver: WebDriver) {
    const el = await driver.wait(until.elementLocated(By.id("file-reader")), TIMEOUT_DRIVER);
    await driver.wait(until.elementIsVisible(el), TIMEOUT_DRIVER);
    return el;
}

export function untilFileReaderContains(pattern: string) {
    return new Condition(
        `for file reader to contain ${pattern}`,
        async function (driver) {
            const el = await driver.findElement(By.id("file-reader-content"));
            if (el === null) {
                return false;
            }

            const content = await el.getText();
            return content.indexOf(pattern) > -1;
        });
}
