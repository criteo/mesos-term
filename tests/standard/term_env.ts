import AppsHelpers = require('../apps_helpers');
import helpers = require('../helpers');


describe('custom environment variables', function () {
    this.timeout(30000);
    this.retries(3);

    const user = 'john';
    const appName = 'app1';

    describe('environment variable TOTO=tata is configured', function () {
        it('environment variable is set', async function () {
            this.timeout(20000);
            const instanceId = this.mesosTaskIds[appName];
            await helpers.withChrome(async function (driver) {
                await driver.get(`http://${user}:password@${helpers.getMesosTermUiUrl()}/task/${instanceId}/terminal?screenReaderMode=true`);
                return AppsHelpers.testAnswerToCommand(driver, 'echo $TOTO', 'tata');
            });
        });
    });

    describe('environment variable Bad=var is configured', function () {
        it('environment variable is not set', async function () {
            this.timeout(20000);
            const instanceId = this.mesosTaskIds[appName];
            await helpers.withChrome(async function (driver) {
                await driver.get(`http://${user}:password@${helpers.getMesosTermUiUrl()}/task/${instanceId}/terminal?screenReaderMode=true`);
                return AppsHelpers.testAnswerToCommand(driver, 'echo ${Bad-not set}', 'not set');
            });
        });
    });
});
