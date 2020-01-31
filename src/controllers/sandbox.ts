import Express = require('express');
import {
    browseSandbox, getTaskInfo, getMesosSlaveState, readSandboxFile,
    downloadSandboxFile, downloadSandboxDirectory, TaskInfo, MesosAgentNotFoundError
} from '../mesos';
import { env } from '../env_vars';
import * as Moment from 'moment';
import { CheckTaskAuthorization } from '../authorizations';
import { Request } from '../express_helpers';

interface SandboxDescriptor {
    agentURL: string;
    workDir: string;
    slaveID: string;
    frameworkID: string;
    containerID: string;
    task: TaskInfo;
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
    const taskInfo = await getTaskInfo(taskID);
    const slaveState = await getMesosSlaveState(taskInfo.agent_url);
    return {
        agentURL: taskInfo.agent_url,
        workDir: slaveState.flags.work_dir,
        slaveID: slaveState.id,
        frameworkID: taskInfo.framework_id,
        containerID: taskInfo.container_id,
        task: taskInfo,
    };
});

export default function (app: Express.Application) {
    app.get('/api/sandbox/*', async function (req: Request, res: Express.Response, next: Express.NextFunction) {
        try {
            if (env.AUTHORIZATIONS_ENABLED && !env.AUTHORIZE_ALL_SANDBOXES) {
                const sandbox = await sandboxCache(req.query.taskID);
                await CheckTaskAuthorization(req, sandbox.task, req.query.access_token);
            }
            await next();
        }
        catch (err) {
            console.error(err);
            if (err instanceof MesosAgentNotFoundError) {
                res.status(400);
                res.send('Mesos agent not found');
                return;
            }
            res.status(500);
            res.send();
        }
    });

    app.get('/api/sandbox/browse', async function (req: Express.Request, res: Express.Response) {
        try {
            const sandbox = await sandboxCache(req.query.taskID);
            const files = await browseSandbox(sandbox.agentURL, sandbox.workDir, sandbox.slaveID, sandbox.frameworkID,
                req.query.taskID, sandbox.containerID, req.query.path);
            res.send(files);
        }
        catch (err) {
            console.error(err);
            res.status(503);
            res.send();
            return;
        }
    });

    app.get('/api/sandbox/read', async function (req: Express.Request, res: Express.Response) {
        try {
            const sandbox = await sandboxCache(req.query.taskID);
            const files = await readSandboxFile(sandbox.agentURL, sandbox.workDir, sandbox.slaveID, sandbox.frameworkID,
                req.query.taskID, sandbox.containerID, req.query.path, req.query.offset, req.query.size);
            res.send(files);
        }
        catch (err) {
            console.error(err);
            res.status(503);
            res.send();
            return;
        }
    });

    app.get('/api/sandbox/download', async function (req: Express.Request, res: Express.Response) {
        try {
            const sandbox = await sandboxCache(req.query.taskID);
            if (req.query.directory === 'true') {
                const content = await downloadSandboxDirectory(sandbox.agentURL, sandbox.workDir, sandbox.slaveID,
                    sandbox.frameworkID, req.query.taskID, sandbox.containerID, req.query.path);
                res.set('Content-Type', 'application/octet-stream');
                res.end(content);
            }
            else {
                const content = await downloadSandboxFile(sandbox.agentURL, sandbox.workDir, sandbox.slaveID,
                    sandbox.frameworkID, req.query.taskID, sandbox.containerID, req.query.path);
                res.set('Content-Type', 'application/octet-stream');
                res.end(content);
            }
        }
        catch (err) {
            console.error(err);
            res.status(503);
            res.send();
            return;
        }
    });
}