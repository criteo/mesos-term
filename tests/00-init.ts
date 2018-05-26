import Request = require('request-promise');
import BluebirdPromise = require('bluebird');

function getMesosState() {
  return Request({ uri: 'http://localhost:5050/master/state.json', json: true });
}

function getMesosTasks() {
  return Request({ uri: 'http://localhost:5050/master/tasks.json', json: true });
}

before(function() {
  console.log('Set up suite');
  const that = this;

  const p1 = getMesosState().then(function(s) {
    that.mesosState = s;
  });
  const p2 = getMesosTasks().then(function(s) {
    that.mesosTasks = s;
    that.mesosTaskIds = {} as any;
    s.tasks.forEach(function(value: any) {
      if (value['state'] === 'TASK_RUNNING') {
        that.mesosTaskIds[value['name']] = value['id'];
      }
    });
  });

  return BluebirdPromise.join(p1, p2);
});

after(function() {
  console.log('Clean up suite');
});
