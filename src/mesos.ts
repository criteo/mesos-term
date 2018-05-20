import { env } from './env_vars';
import Request = require('request-promise');
import Bluebird = require('bluebird');

type Labels = {[key: string]: string};

interface MesosLabel {
  key: string;
  value: string;
}

interface MesosTask {
  labels: MesosLabel[];
  id: string;
  state: 'TASK_RUNNING';
  container_id: string;
  user: string;
}

interface MesosTasks {
  tasks: MesosTask[];
}

interface MesosFramework {
  tasks: MesosTask[];
}

interface MesosState {
  frameworks: MesosFramework[];
}

export interface Task {
  labels: Labels;
  user: string;
  container_id: string;
}

function fromMesosLabels(mesosLabels: MesosLabel[]): Labels {
  if (!mesosLabels) {
    return {};
  }

  const labels: Labels = {};
  for (let i = 0; i < mesosLabels.length; ++i) {
    labels[mesosLabels[i]['key']] = mesosLabels[i]['value'];
  }
  return labels;
}

export function getTaskInfo(taskId: string): Bluebird<Task> {
  return Request({ uri: `${env.MESOS_MASTER_URL}/master/state`, json: true })
    .then(function(mesosState: MesosState) {
      const mesosTasks = mesosState.frameworks
        .reduce(function(acc: MesosTask[], framework: MesosFramework) {
          return acc.concat(framework.tasks);
        }, [] as MesosTask[]);
      const tasks = mesosTasks.filter((task) => {
        return task.id === taskId && task.state == 'TASK_RUNNING';
      });

      if (tasks.length == 0) {
        return Bluebird.reject(new Error(`No task details found for task ID ${taskId}`));
      }

      if (tasks.length > 1) {
        return Bluebird.reject(new Error(`Several task details found for task ID ${taskId}`));
      }

      const taskInfo = tasks[0];
      const labels = fromMesosLabels(taskInfo.labels);

      return Bluebird.resolve({
        labels: labels,
        user: taskInfo.user,
        container_id: taskInfo.container_id
      });
    });
}
