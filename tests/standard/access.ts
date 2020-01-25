import webdriver = require('selenium-webdriver');
import helpers = require('../helpers');
import Axios from "axios";
import { equal } from "assert";

describe('basic routes', function () {
    this.timeout(5000);

    it('should access to /', async function () {
        await helpers.withChrome(async function (driver) {
            await driver.get(`http://john:password@localhost:3000`);
            await driver.wait(webdriver.until.elementLocated(webdriver.By.css(".helper")), 5000);
        });
    });

    it('should access to /ping', async function () {
        return helpers.withChrome(async function (driver) {
            await driver.get(`http://john:password@localhost:3000/ping`);
            const el = await driver.wait(webdriver.until.elementLocated(webdriver.By.css("p")), 5000);
            await driver.wait(webdriver.until.elementTextContains(el, 'pong'), 5000);
        });
    });

    describe('should access to /delegate', async function () {
        it('get', async function () {
            await helpers.withChrome(async function (driver) {
                await driver.get(`http://john:password@localhost:3000/api/delegate`);
                const el = await driver.wait(webdriver.until.elementLocated(webdriver.By.css("p")), 5000);
                await driver.wait(webdriver.until.elementTextContains(el, 'This endpoint'), 5000);
            });
        });

        it('post', async function () {
            await helpers.withChrome(async function (driver) {
                const res = await Axios.post('http://john:password@localhost:3000/api/delegate', null, { validateStatus: () => true });
                equal(res.status, 406);
            });
        });
    });
});