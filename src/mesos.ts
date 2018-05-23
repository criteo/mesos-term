import { env } from './env_vars';
import Request = require('request-promise');
import Bluebird = require('bluebird');

type Labels = {[key: string]: string};

interface MesosLabel {
  key: string;
  value: string;
}

interface MesosStatus {
  state: string;
  container_status: {
    container_id: {
      value: string;
    }
  };
}

interface MesosTask {
  labels: MesosLabel[];
  id: string;
  state: 'TASK_RUNNING';
  user: string;
  slave_id: string;
  framework_id: string;
  statuses: MesosStatus[];
}

interface MesosTasks {
  tasks: MesosTask[];
}

interface MesosFramework {
  tasks: MesosTask[];
}

interface MesosSlave {
  id: string;
  hostname: string;
  port: number;
  pid: string;
}

interface MesosState {
  frameworks: MesosFramework[];
  slaves: MesosSlave[];
}

type SlaveById = {[id: string]: MesosSlave};

export interface Task {
  labels: Labels;
  user: string;
  container_id: string;
  slave_id: string;
  framework_id: string;
  agent_url: string;
  slave_hostname: string;
  admins: string[];
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

      const slaves = mesosState.slaves
        .reduce(function(acc: SlaveById, slave: MesosSlave) {
          acc[slave.id] = slave;
          return acc;
        }, {} as SlaveById);

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

      const statuses = taskInfo.statuses.filter(function(status: MesosStatus) {
        return status.state == 'TASK_RUNNING';
      });

      if (statuses.length == 0) {
        return Bluebird.reject(new Error(`No status details found for task ID ${taskId}`));
      }

      if (statuses.length > 1) {
        return Bluebird.reject(new Error(`Several status details found for task ID ${taskId}`));
      }

      const containerId = statuses[0].container_status.container_id.value;
      const labels = fromMesosLabels(taskInfo.labels);

      const slave = slaves[taskInfo.slave_id];
      const slave_pid = slave.pid;
      const address = slave_pid.split('@')[1];
      const slave_url = `http://${address}`;
      const slave_hostname = slave.hostname;

      return Bluebird.resolve({
        labels: labels,
        user: taskInfo.user,
        container_id: containerId,
        slave_id: taskInfo.slave_id,
        framework_id: taskInfo.framework_id,
        agent_url: slave_url,
        slave_hostname: slave_hostname,
        admins: []
      });
    });
}
