import helpers = require('../helpers');
import Axios from 'axios';

describe('basic routes', function () {
    this.timeout(30000);
    this.retries(3);

    it('endpoint should not be present', function () {
        return helpers.withChrome(async function (driver) {
            const res = await Axios.post('http://john:password@localhost:3000/api/delegate', null, {
                validateStatus: () => true,
            });
            if (res.status === 404) {
                return;
            }
            throw new Error('bad error');
        });
    });
});
