import { env } from './env_vars';
import Request = require('request-promise');
import Constants = require('./constants');
import Axios, { AxiosRequestConfig } from 'axios';
import { promises as Fs } from 'fs';
import JSZip = require('jszip');
import * as https from 'https';

type Labels = { [key: string]: string };

interface MesosLabel {
  key: string;
  value: string;
}

export type MesosTaskState = 'TASK_RUNNING' | 'TASK_STARTING' | 'TASK_KILLED';

interface MesosStatus {
  state: MesosTaskState;
  container_status: {
    container_id: {
      value: string;
      parent: {
        value: string;
      }
    }
  };
}

interface MesosTask {
  labels: MesosLabel[];
  id: string;
  state: 'TASK_RUNNING' | 'TASK_STARTING' | 'TASK_KILLED';
  user: string;
  slave_id: string;
  framework_id: string;
  statuses: MesosStatus[];
}

interface MesosFramework {
  tasks: MesosTask[];
  completed_tasks: MesosTask[];
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

type SlaveById = { [id: string]: MesosSlave };

export interface TaskContainer {
  container_id: string;
  parent_container_id: string;
}

export interface TaskInfo extends TaskContainer {
  labels: Labels;
  user: string;
  slave_id: string;
  framework_id: string;
  agent_url: string;
  slave_hostname: string;
  admins: string[];
  task_id: string;
  statuses: ('TASK_STARTING' | 'TASK_RUNNING' | 'TASK_KILLED')[];
}

const mesosStateCache = cacheMesosState(env.MESOS_MASTER_URL, env.MESOS_STATE_CACHE_TIME);

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

export class TaskNotFoundError extends Error {
  constructor(m: string) {
    super('Task not found: ' + m);

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, TaskNotFoundError.prototype);
  }
}

export class FileNotFoundError extends Error {
  constructor(m: string) {
    super('File not found: ' + m);

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, FileNotFoundError.prototype);
  }
}

export class TaskNotRunningError extends Error {
  constructor(m: string) {
    super('Task not running: ' + m);

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, TaskNotRunningError.prototype);
  }
}

export class MesosAgentNotFoundError extends Error {
  constructor(m: string) {
    super('Mesos agent not found: ' + m);

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, MesosAgentNotFoundError.prototype);
  }
}

function findTaskInMasterState(state: MesosState, taskID: string) {
  const mesosTasks = state.frameworks
    .reduce((acc: MesosTask[], framework: MesosFramework) =>
      acc.concat(framework.tasks).concat(framework.completed_tasks), []);
  return mesosTasks.filter(task => task.id === taskID);
}

async function getMesosTasksFromMaster(taskID: string) {
  let state = await mesosStateCache(false);
  let tasks = findTaskInMasterState(state, taskID);

  if (tasks.length === 0) {
    state = await mesosStateCache(true);
    tasks = findTaskInMasterState(state, taskID);
  }
  return tasks;
}

function taskStatusToTaskContainer(status: MesosStatus): TaskContainer {
  const containerId = status.container_status.container_id.value;
  // Nested containers for task groups
  let parentContainerId: string;
  if (status.container_status.container_id.parent) {
    parentContainerId = status.container_status.container_id.parent.value;
  }

  return {
    container_id: containerId,
    parent_container_id: parentContainerId,
  };
}

function taskToTaskInfo(task: MesosTask, state: MesosState): TaskInfo {
  const labels = fromMesosLabels(task.labels);

  const slaves = state.slaves
    .reduce(function (acc: SlaveById, slave: MesosSlave) {
      acc[slave.id] = slave;
      return acc;
    }, {} as SlaveById);

  if (!(task.slave_id in slaves)) {
    throw new MesosAgentNotFoundError(task.slave_id);
  }

  const slave = slaves[task.slave_id];
  const slave_pid = slave.pid;
  const address = slave_pid.split('@')[1];
  const slave_url = (env.MESOS_MASTER_URL.indexOf('https') === 0)
    ? `https://${address}`
    : `http://${address}`;
  const slave_hostname = slave.hostname;
  let admins: string[] = [];

  if (Constants.DEBUG_ALLOWED_TO_KEY in labels) {
    const allowed: string = labels[Constants.DEBUG_ALLOWED_TO_KEY];
    admins = allowed.split(',') as string[];
  }

  // Ensure the task has run.
  const runningStatuses = task.statuses.filter(s => s.state === 'TASK_RUNNING');

  if (runningStatuses.length === 0) {
    throw new Error(`Cannot find running status for task ${task.id}`);
  }

  if (runningStatuses.length > 1) {
    throw new Error(`Multiple running statuses has been found for the task ${task.id}`);
  }

  const taskContainer = taskStatusToTaskContainer(runningStatuses[0]);

  return {
    labels: labels,
    user: task.user,
    slave_id: task.slave_id,
    framework_id: task.framework_id,
    agent_url: slave_url,
    slave_hostname: slave_hostname,
    admins: admins,
    task_id: task.id,
    statuses: task.statuses.map(s => s.state),
    ...taskContainer,
  };
}

export async function getTaskInfo(taskID: string): Promise<TaskInfo> {
  const tasks = await getMesosTasksFromMaster(taskID);

  if (tasks.length === 0) {
    throw new TaskNotFoundError(taskID);
  }

  if (tasks.length > 1) {
    throw new Error(`Multiple tasks found for ${taskID}`);
  }

  const state = await mesosStateCache(false);
  return taskToTaskInfo(tasks[0], state);
}

export async function getRunningTaskInfo(taskID: string): Promise<TaskInfo> {
  const tasks = await getMesosTasksFromMaster(taskID);
  const runningTasks = tasks.filter(t => t.state === 'TASK_RUNNING');

  if (tasks.length > 0 && runningTasks.length === 0) {
    throw new TaskNotRunningError(taskID);
  }

  if (tasks.length === 0) {
    throw new TaskNotFoundError(taskID);
  }

  if (tasks.length > 1) {
    throw new Error(`Multiple tasks found for ${taskID}`);
  }

  const state = await mesosStateCache(false);
  return taskToTaskInfo(tasks[0], state);
}

function cacheMesosState(mesosMasterURL: string, refreshSeconds: number) {
  let cache: MesosState | undefined;

  async function refreshCache() {
    const axiosConfig: AxiosRequestConfig = {};
    if (env.CA_FILE) {
      const httpsAgent = new https.Agent({
        ca: await Fs.readFile(env.CA_FILE),
      });
      axiosConfig['httpsAgent'] = httpsAgent;
    }
    const res = await Axios.get<MesosState>(`${mesosMasterURL}/master/state`, axiosConfig);
    cache = res.data;
    return cache;
  }

  // Setup the auto refresh
  setInterval(function () {
    refreshCache();
  }, 1000 * refreshSeconds);
  // Do the first fetch
  refreshCache();

  return async (update: boolean) => {
    if (!update && cache !== undefined) {
      return cache;
    }
    return refreshCache();
  };
}

interface MesosSlaveState {
  id: string;
  flags: {
    work_dir: string;
  };
  frameworks: MesosSlaveFramework[];
}

interface MesosSlaveExecutor {
  id: string;
  tasks: MesosTask[];
  completed_tasks: MesosTask[];
}

interface MesosSlaveFramework {
  id: string;
  name: string;
  user: string;
  failover_timeout: number;
  checkpoint: boolean;
  hostname: string;
  role: string;
  executors: MesosSlaveExecutor[];
  completed_executors: MesosSlaveExecutor[];
}

export function findTaskInSlaveState(state: MesosSlaveState, taskID: string) {
  const aggExecutorTasks = (acc2: MesosTask[], executor: MesosSlaveExecutor) =>
    acc2.concat(executor.tasks).concat(executor.completed_tasks);

  const mesosTasks = state.frameworks
    .reduce((acc: MesosTask[], framework: MesosSlaveFramework) => acc
      .concat(framework.executors.reduce(aggExecutorTasks, []))
      .concat(framework.completed_executors.reduce(aggExecutorTasks, [])), []);
  return mesosTasks.filter(task => task.id === taskID);
}

export async function getMesosSlaveState(mesosSlaveURL: string) {
  const res = await Axios.get<MesosSlaveState>(`${mesosSlaveURL}/state`);
  return res.data;
}

interface FileDescription {
  gid: string;
  mode: string;
  mtime: string;
  path: string;
  size: number;
  uid: string;
}

export async function browseSandbox(
  mesosSlaveURL: string, workDir: string, slaveID: string,
  frameworkID: string, executorID: string, containerID: string,
  relativePath: string) {
  const basePath = `${workDir}/slaves/${slaveID}/frameworks/${frameworkID}/executors/${executorID}/runs/${containerID}`;
  const fullPath = encodeURIComponent(`${basePath}${relativePath}`);
  const res = await Axios.get<FileDescription[]>(`${mesosSlaveURL}/files/browse?path=${fullPath}`, {
    validateStatus: (code: number) => code === 404 || code === 200,
  });

  if (res.status === 404) {
    throw new FileNotFoundError(relativePath);
  }

  const files = res.data.map(f => ({ ...f, path: f.path.replace(basePath, '') }));
  return files;
}

export interface FileData {
  data: string;
  offset: number;
  eof: boolean;
}

export async function readSandboxFile(
  mesosSlaveURL: string, workDir: string, slaveID: string,
  frameworkID: string, executorID: string, containerID: string,
  relativePath: string, offset: number, size: number) {
  const basePath = `${workDir}/slaves/${slaveID}/frameworks/${frameworkID}/executors/${executorID}/runs/${containerID}`;
  const fullPath = encodeURIComponent(`${basePath}${relativePath}`);
  const res = await Axios.get<FileData>(`${mesosSlaveURL}/files/read?path=${fullPath}&offset=${offset}&length=${size}`, {
    validateStatus: (code: number) => code === 404 || code === 200,
  });

  if (res.status === 404) {
    throw new FileNotFoundError(relativePath);
  }
  return res.data;
}

export class DownloadDirectoryError extends Error {
  constructor() {
    super('Cannot download a directory');

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, DownloadDirectoryError.prototype);
  }
}


export async function downloadSandboxFileAsStream(
  mesosSlaveURL: string, workDir: string, slaveID: string,
  frameworkID: string, executorID: string, containerID: string,
  relativePath: string, res: any) {
  const basePath = `${workDir}/slaves/${slaveID}/frameworks/${frameworkID}/executors/${executorID}/runs/${containerID}`;
  const fullPath = encodeURIComponent(`${basePath}${relativePath}`);
  const fileContentRes = await Axios.get(`${mesosSlaveURL}/files/download?path=${fullPath}`, {
    validateStatus: (code: number) => code === 400 || code === 200,
    responseType: 'stream',
  });
  if (fileContentRes.status === 400 && (fileContentRes as any).data === 'Cannot download a directory.\n') {
    throw new DownloadDirectoryError();
  }

  return new Promise((resolve, reject) => {
    fileContentRes.data.on('data', (chunk: ArrayBuffer) => {
      res.write(chunk);
    });
    fileContentRes.data.on('end', () => {
      resolve();
    });
    fileContentRes.data.on('error', (err: Error) => {
      reject(err);
    });
  });
}

export async function downloadSandboxFileAsNodeArray(
  mesosSlaveURL: string, workDir: string, slaveID: string,
  frameworkID: string, executorID: string, containerID: string,
  relativePath: string) {
  const basePath = `${workDir}/slaves/${slaveID}/frameworks/${frameworkID}/executors/${executorID}/runs/${containerID}`;
  const fullPath = encodeURIComponent(`${basePath}${relativePath}`);
  const fileContentRes = await Axios.get(`${mesosSlaveURL}/files/download?path=${fullPath}`, {
    validateStatus: (code: number) => code === 400 || code === 200,
    responseType: 'arraybuffer',
  });
  if (fileContentRes.status === 400 && (fileContentRes as any).data === 'Cannot download a directory.\n') {
    throw new DownloadDirectoryError();
  }
  return fileContentRes.data;
}

async function downloadFileToDisk(mesosSlaveURL: string, workDir: string, slaveID: string,
  frameworkID: string, executorID: string, containerID: string,
  relativePath: string, basePath: string, zip: any) {
  const content = await downloadSandboxFileAsNodeArray(mesosSlaveURL, workDir, slaveID,
    frameworkID, executorID, containerID, relativePath);
  // slice(1) strips the first slash.
  const path = relativePath.slice(basePath.length + ((basePath === '/') ? 0 : 1));
  zip.file(path, content);
}

export async function downloadSandboxDirectory(
  mesosSlaveURL: string, workDir: string, slaveID: string,
  frameworkID: string, executorID: string, containerID: string,
  relativePath: string, res: any) {
  const directories = [relativePath] as string[];
  const files = [] as string[];

  while (directories.length > 0) {
    const dir = directories.pop();
    const fds = await browseSandbox(mesosSlaveURL, workDir, slaveID,
      frameworkID, executorID, containerID, dir);
    for (let i = 0; i < fds.length; i++) {
      if (fds[i].mode.slice(0, 1) === 'd') {
        directories.push(fds[i].path);
      }
      else {
        files.push(fds[i].path);
      }
    }
  }

  const zip = new JSZip();
  const promises = [] as Promise<void>[];
  for (let i = 0; i < files.length; i++) {
    promises.push(downloadFileToDisk(mesosSlaveURL, workDir, slaveID,
      frameworkID, executorID, containerID, files[i], relativePath, zip));
  }
  await Promise.all(promises);
  return new Promise((resolve, reject) => {
    zip.generateNodeStream({ streamFiles: true })
      .pipe(res)
      .on('finish', resolve)
      .on('error', reject);
  });
}