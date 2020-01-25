import Bluebird = require('bluebird');
import AppsHelpers = require('../apps_helpers');
import helpers = require('../helpers');


describe('custom environment variables', function () {
    const user = 'john';
    const port = 3000;
    const appName = 'app1';

    describe('environment variable TOTO=tata is configured', function () {
        it('environment variable is set', function () {
            this.timeout(5000);
            const instanceId = this.mesosTaskIds[appName];
            return helpers.withChrome(function (driver) {
                return Bluebird.resolve(driver.get(`http://${user}:password@localhost:${port}/login/${instanceId}`))
                    .then(function () {
                        return AppsHelpers.testAnswerToCommand(driver, 'echo $TOTO', 'tata');
                    });
            });
        });
    });

    describe('environment variable Bad=var is configured', function () {
        it('environment variable is not set', function () {
            this.timeout(5000);
            const instanceId = this.mesosTaskIds[appName];
            return helpers.withChrome(function (driver) {
                return Bluebird.resolve(driver.get(`http://${user}:password@localhost:${port}/login/${instanceId}`))
                    .then(function () {
                        return AppsHelpers.testAnswerToCommand(driver, 'echo ${Bad-not set}', 'not set');
                    });
            });
        });
    });
});
