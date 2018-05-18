import child_process = require('child_process');
import { MESOS_TASK_EXEC_DIR } from './env_vars';

type Labels = {[key: string]: string};
type MesosLabels = {[key: string]: { key: string, value: string }};

export function getTaskLabels(
  taskId: string,
  fn: (err: Error, labels?: Labels) => void) {

  child_process.exec(`python3 ${MESOS_TASK_EXEC_DIR}/get_task_info.py ${taskId}`,
    function(err, stdout, stderr) {
    if (err) {
      fn(err);
      return;
    }
    const info = JSON.parse(stdout);
    const labels = ('labels' in info) ? info['labels'] : [];
    const labelsDict: Labels = {};
    for (let i = 0; i < labels.length; ++i) {
      labelsDict[labels[i]['key']] = labels[i]['value'];
    }
    fn(undefined, labelsDict);
  });
}
