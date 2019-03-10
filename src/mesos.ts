import { env } from './env_vars';
import Request = require('request-promise');
import Bluebird = require('bluebird');
import Constants = require('./constants');
import fs = require('fs');

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
  task_id: string;
}

let mesosState: MesosState;

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

function getMesosTask(
  mesos_master_url: string,
  taskId: string,
  canFetch: boolean): Bluebird<MesosTask> {

  if (!mesosState || !mesosState.frameworks) {
    if (canFetch) {
      return fetchMesosState(mesos_master_url)
        .then(() => getMesosTask(mesos_master_url, taskId, false));
    }
    else {
      return Bluebird.reject(new Error(`Cannot fetch Mesos state.`));
    }
  }

  const mesosTasks = mesosState.frameworks
    .reduce(function(acc: MesosTask[], framework: MesosFramework) {
      return acc.concat(framework.tasks);
    }, [] as MesosTask[]);

  const tasks = mesosTasks.filter((task) => {
    return task.id === taskId && task.state == 'TASK_RUNNING';
  });

  if (tasks.length == 0) {
    if (canFetch) {
      return fetchMesosState(mesos_master_url)
        .then(() => getMesosTask(mesos_master_url, taskId, false));
    }
    else {
      return Bluebird.reject(new Error(`Task not found.`));
    }
  }

  if (tasks.length > 1) {
    return Bluebird.reject(new Error(`Several task details found for this task.`));
  }

  return Bluebird.resolve(tasks[0]);
}

export function getTaskInfo(mesos_master_url: string, taskId: string): Bluebird<Task> {
  return getMesosTask(mesos_master_url, taskId, true)
    .then(function(taskInfo: MesosTask) {
      const statuses = taskInfo.statuses.filter(function(status: MesosStatus) {
        return status.state == 'TASK_RUNNING';
      });

      if (statuses.length == 0) {
        return Bluebird.reject(new Error(`No status details found.`));
      }

      if (statuses.length > 1) {
        return Bluebird.reject(new Error(`Several status details found.`));
      }

      const containerId = statuses[0].container_status.container_id.value;
      const labels = fromMesosLabels(taskInfo.labels);

      const slaves = mesosState.slaves
        .reduce(function(acc: SlaveById, slave: MesosSlave) {
          acc[slave.id] = slave;
          return acc;
        }, {} as SlaveById);
      const slave = slaves[taskInfo.slave_id];
      const slave_pid = slave.pid;
      const address = slave_pid.split('@')[1];
      const slave_url = (mesos_master_url.indexOf('https') === 0) ? `https://${address}` : `http://${address}`;
      const slave_hostname = slave.hostname;
      let admins: string[] = [];

      if (Constants.DEBUG_ALLOWED_TO_KEY in labels) {
        const allowed: string = labels[Constants.DEBUG_ALLOWED_TO_KEY];
        admins = allowed.split(',') as string[];
      }

      return Bluebird.resolve({
        labels: labels,
        user: taskInfo.user,
        container_id: containerId,
        slave_id: taskInfo.slave_id,
        framework_id: taskInfo.framework_id,
        agent_url: slave_url,
        slave_hostname: slave_hostname,
        admins: admins,
        task_id: taskId
      });
    });
}

function fetchMesosState(mesos_master_url: string) {
  const agentOptions =  (env.CA_FILE) ? { ca: fs.readFileSync(env.CA_FILE) } : {};
  return Request( { uri: `${mesos_master_url}/master/state`, json: true, agentOptions: agentOptions})
    .then(function(state: MesosState) {
      mesosState = state;
    });
}

export function setupAutoFetch(mesos_master_url: string, refreshSeconds: number) {
  fetchMesosState(mesos_master_url);
  setInterval(function() {
    fetchMesosState(mesos_master_url);
  }, 1000 * refreshSeconds);
}
