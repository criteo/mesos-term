import child_process = require('child_process');
import { env } from './env_vars';

type Labels = {[key: string]: string};
type MesosLabels = {[key: string]: { key: string, value: string }};

export interface TaskInfo {
  labels: Labels;
  user: string;
}

export function getTaskInfo(
  taskId: string,
  fn: (err: Error, info?: TaskInfo) => void) {

  child_process.exec(`python3 ${env.MESOS_TASK_EXEC_DIR}/get_task_info.py ${taskId}`,
    function(err, stdout, stderr) {
    if (err) {
      fn(err);
      return;
    }
    const info = JSON.parse(stdout);
    const labels = ('labels' in info) ? info['labels'] : [];
    const user = ('user' in info) ? info['user'] : undefined;
    const labelsDict: Labels = {};

    for (let i = 0; i < labels.length; ++i) {
      labelsDict[labels[i]['key']] = labels[i]['value'];
    }

    const task_info = {
      labels: labelsDict,
      user: user
    };
    fn(undefined, task_info);
  });
}
