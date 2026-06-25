import Axios from 'axios';
import BluebirdPromise = require('bluebird');
import Assert = require('assert');

function getMesosState() {
  return Axios.get('http://localhost:5050/master/state.json').then(res => res.data);
}

function getMesosTasks() {
  return Axios.get('http://localhost:5050/master/tasks.json').then(res => res.data);
}

export function setupSuite() {
  before(function () {
    console.log('Set up suite');
    const that = this;

    const p1 = getMesosState().then(function (s) {
      that.mesosState = s;
    });
    const p2 = getMesosTasks().then(function (s) {
      that.mesosTasks = s;
      that.mesosTaskIds = {} as any;
      s.tasks.forEach(function (value: any) {
        if (value['state'] === 'TASK_RUNNING') {
          that.mesosTaskIds[value['name']] = value['id'];
        }
      });
    });

    return BluebirdPromise.join(p1, p2);
  });

  after(function () {
    console.log('Clean up suite');
  });

  describe('mesos', function () {
    ['app1', 'app2', 'app3', 'app4', 'app5', 'app6'].forEach((value: string) => {
      describe(`application ${value}`, () => {
        it('should have an instance', function () {
          Assert(this.mesosTaskIds[value]);
        });
      });
    });

    it('should have a state', function () {
      Assert(this.mesosState);
    });
  });
}
