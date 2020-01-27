import helpers = require('../helpers');
import Request = require('request-promise');

describe('basic routes', function () {
    this.timeout(10000);

    it('endpoint should not be present', async function () {
        await helpers.withChrome(async function (driver) {
            try {
                await Request({ uri: 'http://john:password@localhost:3000/api/delegate', json: true, method: 'POST' });
                throw new Error("Should not be here");
            } catch (err) {
                if (err.statusCode == 404) {
                    return
                }
                throw new Error('bad error');
            }
        });
    });
});
