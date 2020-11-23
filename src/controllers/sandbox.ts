import Express = require('express');
import {
    browseSandbox, getTaskInfo, getMesosSlaveState, readSandboxFile,
    downloadSandboxFileAsStream, downloadSandboxDirectory, TaskInfo, MesosAgentNotFoundError,
    TaskNotFoundError, FileNotFoundError, findTaskInSlaveState, MesosTaskState
} from '../mesos';
import { env } from '../env_vars';
import * as Moment from 'moment';
import { CheckTaskAuthorization, UnauthorizedAccessError } from '../authorizations';
import { CustomRequest } from '../express_helpers';

type TaskState = MesosTaskState | 'UNKNOWN';

interface SandboxDescriptor {
    agentURL: string;
    workDir: string;
    slaveID: string;
    frameworkID: string;
    containerID: string;
    task: TaskInfo;
    last_status: TaskState;
}

function cacheSandboxDescriptor(fetcher: (taskID: string) => Promise<SandboxDescriptor>) {
    const cache: {
        [taskID: string]: {
            expireAt: Date;
            locator: SandboxDescriptor;
        }
    } = {};

    setInterval(clearExpiredEntries, 1000);

    function clearExpiredEntries() {
        const expiredTaskIDs = [] as string[];
        for (const taskID in cache) {
            if (cache[taskID].expireAt < new Date()) {
                expiredTaskIDs.push(taskID);
            }
        }
        for (const i in expiredTaskIDs) {
            delete cache[expiredTaskIDs[i]];
        }
    }

    return async (taskID: string) => {
        if (taskID in cache && cache[taskID].expireAt > new Date()) {
            return cache[taskID].locator;
        }

        const res = await fetcher(taskID);
        cache[taskID] = {
            expireAt: Moment(new Date()).add(10, 'second').toDate(),
            locator: res,
        };
        return res;
    };
}



const sandboxCache = cacheSandboxDescriptor(async (taskID) => {
    // TaskInfo retrieval relies on mesos master cache.
    const taskInfo = await getTaskInfo(taskID);
    console.log(`Get sandbox cache for ${taskInfo.task_id}`);
    const slaveState = await getMesosSlaveState(taskInfo.agent_url);

    const slaveTaskInfos = await findTaskInSlaveState(slaveState, taskID);

    if (slaveTaskInfos.length === 0) {
        throw new TaskNotFoundError(taskID);
    }

    if (slaveTaskInfos.length > 1) {
        throw new Error(`Multiple task descriptors have been found for task ${taskID}`);
    }

    const status: TaskState = (slaveTaskInfos[0].statuses.length > 0)
        ? slaveTaskInfos[0].statuses[taskInfo.statuses.length - 1].state
        : 'UNKNOWN';

    return {
        agentURL: taskInfo.agent_url,
        workDir: slaveState.flags.work_dir,
        slaveID: slaveState.id,
        frameworkID: taskInfo.framework_id,
        containerID: slaveTaskInfos[0].container,
        task: taskInfo,
        last_status: status,
    };
});

export default function (app: Express.Application) {
    app.get('/api/sandbox/*', async function (req: CustomRequest, res: Express.Response, next: Express.NextFunction) {
        try {
            if (req.user == undefined)
                console.log(`Anonymous connection to ${req.query.taskID}: ${req.query.path}`);
            else
                console.log(`Connection attempt from ${req.user.cn} for ${req.query.taskID}: ${req.query.path}`);
            if (env.AUTHORIZATIONS_ENABLED && !env.AUTHORIZE_ALL_SANDBOXES) {
                const sandbox = await sandboxCache(req.query.taskID as string);
                await CheckTaskAuthorization(req, sandbox.task, req.query.access_token as string);
            }
        }
        catch (err) {
            console.error(`Cannot authorize user ${req.user.cn} to access to sandbox of task ${req.query.taskID}`, err);
            if (err instanceof MesosAgentNotFoundError) {
                res.status(400);
                res.send('Mesos agent not found');
                return;
            }
            else if (err instanceof UnauthorizedAccessError) {
                res.status(403);
                res.send('Unauthorized');
                return;
            }
            else if (err instanceof TaskNotFoundError) {
                res.status(404);
                res.send('Task not found');
                return;
            }
            res.status(500);
            res.send();
        }

        await next();
    });

    app.get('/api/sandbox/browse', async function (req: Express.Request, res: Express.Response) {
        try {
            const sandbox = await sandboxCache(req.query.taskID as string);
            const files = await browseSandbox(sandbox.agentURL, sandbox.workDir, sandbox.slaveID, sandbox.frameworkID,
                req.query.taskID as string, sandbox.containerID, req.query.path as string);
            res.send(files);
        }
        catch (err) {
            console.error(`Cannot browse files in ${req.query.path} from sandbox of task ${req.query.taskID}`, err);
            if (err instanceof MesosAgentNotFoundError) {
                res.status(400);
                res.send('Mesos agent not found');
                return;
            }
            else if (err instanceof FileNotFoundError) {
                res.status(404);
                res.send('File not found');
                return;
            }
            else if (err instanceof UnauthorizedAccessError) {
                res.status(403);
                res.send('Unauthorized');
                return;
            }
            else if (err instanceof TaskNotFoundError) {
                res.status(404);
                res.send('Task not found');
                return;
            }
            // returning 400 allow to display response body to the user
            // if using 503 we simply return "503 != 200" message
            res.status(400);
            res.send(err.message);
            return;
        }
    });

    app.get('/api/sandbox/read', async function (req: Express.Request, res: Express.Response) {
        try {
            const sandbox = await sandboxCache(req.query.taskID as string);
            const files = await readSandboxFile(sandbox.agentURL, sandbox.workDir, sandbox.slaveID, sandbox.frameworkID,
                req.query.taskID as string, sandbox.containerID, req.query.path as string, +req.query.offset, +req.query.size);
            if (!(sandbox.last_status === 'TASK_RUNNING' || sandbox.last_status === 'TASK_STARTING')) {
                files.eof = true;
            }
            res.send(files);
        }
        catch (err) {
            console.error(`Cannot read file ${req.query.path} from sandbox of task ${req.query.taskID}`, err);
            if (err instanceof MesosAgentNotFoundError) {
                res.status(400);
                res.send('Mesos agent not found');
                return;
            }
            else if (err instanceof FileNotFoundError) {
                res.status(404);
                res.send('File not found');
                return;
            }
            else if (err instanceof UnauthorizedAccessError) {
                res.status(403);
                res.send('Unauthorized');
                return;
            }
            else if (err instanceof TaskNotFoundError) {
                res.status(404);
                res.send('Task not found');
                return;
            }
            res.status(503);
            res.send();
            return;
        }
    });

    app.get('/api/sandbox/download', async function (req: Express.Request, res: Express.Response) {
        try {
            const sandbox = await sandboxCache(req.query.taskID as string);
            res.set('Content-Type', 'application/octet-stream');
            res.set('Content-Disposition', 'attachment; filename=' + req.query.filename);

            if (req.query.directory === 'true') {
                await downloadSandboxDirectory(sandbox.agentURL, sandbox.workDir, sandbox.slaveID,
                    sandbox.frameworkID, req.query.taskID as string, sandbox.containerID, req.query.path as string, res);
            }
            else {
                await downloadSandboxFileAsStream(sandbox.agentURL, sandbox.workDir, sandbox.slaveID,
                    sandbox.frameworkID, req.query.taskID as string, sandbox.containerID, req.query.path as string, res);
            }
            res.end();
        }
        catch (err) {
            console.error(`Cannot download file(s) ${req.query.path} from sandbox of task ${req.query.taskID}`, err);
            if (err instanceof MesosAgentNotFoundError) {
                res.status(400);
                res.send('Mesos agent not found');
                return;
            }
            else if (err instanceof FileNotFoundError) {
                res.status(404);
                res.send('File not found');
                return;
            }
            else if (err instanceof UnauthorizedAccessError) {
                res.status(403);
                res.send('Unauthorized');
                return;
            }
            else if (err instanceof TaskNotFoundError) {
                res.status(404);
                res.send('Task not found');
                return;
            }
            res.status(503);
            res.send();
            return;
        }
    });
}
